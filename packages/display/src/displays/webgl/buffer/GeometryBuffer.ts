/*
 * Copyright (C) 2019-2022 HERE Europe B.V.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * SPDX-License-Identifier: Apache-2.0
 * License-Filename: LICENSE
 */

import {Attribute} from './Attribute';
import {glType, TypedArray} from './glType';
import {Texture} from '../Texture';
import {ConstantAttribute, FlexAttribute, TemplateBuffer} from './templates/TemplateBuffer';
import {Raycaster} from '../Raycaster';
import {Expression} from '@here/xyz-maps-common';
import {HeightMapTileCache, HeightMapTileData} from '../HeightMapTileCache';
import {measureStart, measureEnd} from '../PerfTimer';
import {UniformBlockLayout, UniformBlockInstance, UniformBlockFieldSetter} from '../UniformBlock';
import {PASS} from '../RenderPass';
import {TerrainOcclusionMode} from './TerrainRenderPolicy';

/**
 * Heightmap reference for a GeometryBuffer.
 * Describes which terrain tile this buffer needs for elevation sampling.
 *
 * @internal
 * @hidden
 */
export interface HeightMapReference {
    /**
     * The terrain tile to sample, clamped to the terrain layer's maxDataZoom.
     *
     * Never mutated after creation: when this tile is not cached yet the per-frame resolve
     * samples an ancestor instead, without overwriting this key. That way the buffer
     * upgrades to the exact terrain tile as soon as it is loaded, rather than staying
     * permanently downgraded to a coarser ancestor.
     *
     * @internal
     * @hidden
     */
    terrainTileKey: number;
    /**
     * Tile whose coordinate space the geometry vertices live in.
     *
     * Needed to derive a correct transform when the resolve falls back to an ancestor.
     * Defaults to terrainTileKey.
     *
     * @internal
     * @hidden
     */
    geometryTileKey?: number;
    /**
     * Maps geometryTileKey into terrainTileKey
     * null for an identity transform.
     *
     * @internal
     * @hidden
     */
    transform?: Float32Array | null;
}

type Uniforms = { [name: string]: Uniform };

export enum RenderUsage {
    DEFAULT = 0,
    TERRAIN_PREPASS = 1
}

export type Uniform = number | number[] | Float32Array | Float64Array | Int32Array | boolean | Texture | Texture[];
export type DynamicUniform = Expression | (Expression | Uniform)[];


export type IndexData = {
    data: Uint16Array | Uint32Array
    type: number;
    length: number;
};

export type ArrayData = {
    first: number;
    count: number;
    mode?: number;
};

type DrawCmdBase = {
    mode?: number,
    uniforms?: Uniforms,
    attributes?: { [name: string]: Attribute },
    vao?: WebGLVertexArrayObject | WebGLVertexArrayObjectOES
}

export type ArrayDrawCmd = DrawCmdBase & {
    arrays: ArrayData
};
export type ElementsDrawCmd = DrawCmdBase & {
    index: IndexData
};

type IndexArray = number[] | Uint32Array | Uint16Array;

const GL_UNSIGNED_SHORT = 0x1403;
const GL_UNSIGNED_INT = 0x1405;

let UNDEF;

type CompiledUniformCache = {
    clear: boolean,
    fromCache: boolean;
    uniforms: Uniforms
}

export type CompiledUniformData = Omit<CompiledUniformCache, 'clear'>;

const averageFaceNormal = (vertex: ArrayLike<number>, i1: number, i2: number, i3: number, normals: TypedArray) => {
    const t1x = vertex[i1];
    const t1y = vertex[i1 + 1];
    const t1z = vertex[i1 + 2];

    const t2x = vertex[i2];
    const t2y = vertex[i2 + 1];
    const t2z = vertex[i2 + 2];

    const t3x = vertex[i3];
    const t3y = vertex[i3 + 1];
    const t3z = vertex[i3 + 2];

    const ux = t2x - t3x;
    const uy = t2y - t3y;
    const uz = t2z - t3z;

    const vx = t1x - t3x;
    const vy = t1y - t3y;
    const vz = t1z - t3z;

    // surface normal
    const nx = uz * vy - uy * vz;
    const ny = ux * vz - uz * vx;
    const nz = uy * vx - ux * vy;

    // sum normals, average
    normals[i1] += nx;
    normals[i1 + 1] += ny;
    normals[i1 + 2] += nz;

    normals[i2] += nx;
    normals[i2 + 1] += ny;
    normals[i2 + 2] += nz;

    normals[i3] += nx;
    normals[i3 + 1] += ny;
    normals[i3 + 2] += nz;
};

const _nextBufferUid = new Uint32Array(1);

class GeometryBuffer {
    // Monotonically increasing instance ID. Used for content-hash based FBO caching:
    // new data -> new buffer -> new uid -> hash mismatch -> FBO re-rendered.
    readonly uid: number = _nextBufferUid[0]++;

    static generateWireframeIndices(triangleIndices: ArrayLike<number>): Uint16Array | Uint32Array {
        // const triangleIndices: ArrayLike<number> = geomBuffer.index();
        const edgeSet = new Set<string>();
        const lines: number[] = [];

        for (let i = 0; i < triangleIndices.length; i += 3) {
            const i0 = triangleIndices[i];
            const i1 = triangleIndices[i + 1];
            const i2 = triangleIndices[i + 2];

            const edges: [number, number][] = [
                [i0, i1],
                [i1, i2],
                [i2, i0]
            ];

            for (const [a, b] of edges) {
                const key = a < b ? `${a};${b}` : `${b};${a}`;
                if (!edgeSet.has(key)) {
                    edgeSet.add(key);
                    lines.push(a, b);
                }
            }
        }

        const IndexArrayConstructor =
            triangleIndices instanceof Uint32Array ? Uint32Array : Uint16Array;

        return new IndexArrayConstructor(lines);
    }

    static MODE_GL_POINTS: number = 0x0000;
    static MODE_GL_LINES: number = 0x0001;
    static MODE_GL_TRIANGLES: number = 0x0004;
    // private size: number;
    attributes: { [name: string]: Attribute | ConstantAttribute } = {};
    uniforms: { [name: string]: Uniform | DynamicUniform } = {};
    type: string;
    pass: number = PASS.OPAQUE;
    zIndex?: number;
    zLayer?: number;
    clip?: true | undefined;
    // depthMask?: boolean;
    // colorMask?: { r: boolean, g: boolean, b: boolean, a: boolean };
    scissorBox?: number[];
    depth?: boolean;
    blend?: boolean;
    mode?: number; // primitive to render
    flat: boolean = true;
    groups: (ElementsDrawCmd | ArrayDrawCmd)[] = [];
    idOffsets?: (string | number)[];
    pointerEvents?: boolean;
    instances: number = 0;
    // Buffer-specific shader feature mask. Render-state bits are added by GLRender.
    macroMask?: number;
    isSynthetic?: boolean;
    // If set to true, the buffer should render "pixel-perfect" to ensure sharp, precise raster graphics.
    pixelPerfect?: boolean = false;
    // The effective scale factor applied to this geometry buffer during rendering.
    // Used for correct sizing and ray intersection calculations relative to the current view.
    renderScale: number = 1;

    private _cullFace: number = 0;

    // currently used by "Model" only
    bbox?: number[];
    id?: number | string;

    zRange?: [min: number, max: number];

    light?: string;

    private uniformBlocks: Map<string, UniformBlockInstance>;
    private uniformBlockByField: Map<string, UniformBlockInstance>;

    renderUsage: RenderUsage = RenderUsage.DEFAULT;
    rendered: boolean = false;
    terrainOcclusion: TerrainOcclusionMode = TerrainOcclusionMode.NONE;
    /**
     * Reference or requirement flag for the height map associated with this buffer.
     * This is requested by styles with "altitude":"terrain".
     * - `'required'`: Indicates that a height map is required but not yet resolved.
     * - `HeightMapReference`: Resolved reference containing quadkey and optional UV transform.
     */
    heightMapRef?: 'required' | HeightMapReference;
    terrainCache: HeightMapTileCache;
    // Heightmap data resolved from heightMapRef for the current frame.
    resolvedHeightMap?: HeightMapTileData;
    /**
     * UV transform matching `resolvedHeightMap` for the current frame. Differs from
     * `heightMapRef.transform` when the resolve fell back to an ancestor tile.
     */
    resolvedHeightMapTransform?: Float32Array | null;
    /**
     * per-buffer scratch storage for the ancestor-fallback transform, so the per-frame
     * resolve does not allocate. Must not be shared between buffers.
     *
     * @internal
     * @hidden
     */
    heightMapFallbackTransform?: Float32Array;

    /**
     * memoization state for {@link resolveHeightMap}, capturing everything the resolve
     * outcome depends on. `-1` means "no valid memo".
     *
     * @internal
     * @hidden
     */
    private resolvedVersion: number = -1;
    private resolvedCache?: HeightMapTileCache;
    private resolvedTerrainTileKey?: number;
    private resolvedGeometryTileKey?: number;

    public setHeightMapRef(required: boolean): void {
        this.heightMapRef = required ? 'required' : null;
        this.resolvedVersion = -1;
    }

    // used by TerrainModelBuffer for ray intersection only
    heightMap?: HeightMapTileData;

    /**
     * Resolves `heightMapRef` against the terrain cache for rendering and CPU sampling.
     *
     * The reference remains unchanged so ancestor fallbacks can switch to the exact tile once
     * loaded. Results are memoized by cache version and tile keys; keys are compared by value
     * because pooled buffers may retarget the same reference object.
     *
     * @internal
     * @hidden
     */
    resolveHeightMap(): void {
        const ref = this.heightMapRef;
        const cache = this.terrainCache;

        if (!ref || ref === 'required' || !cache) {
            this.resolvedHeightMap = null;
            this.resolvedHeightMapTransform = null;
            this.resolvedVersion = -1;
            return;
        }

        const terrainTileKey = ref.terrainTileKey;
        const geometryTileKey = ref.geometryTileKey ?? terrainTileKey;
        const isMemoizedValid = this.resolvedVersion === cache.version &&
            this.resolvedTerrainTileKey === terrainTileKey &&
            this.resolvedGeometryTileKey === geometryTileKey;

        if (isMemoizedValid) {
            return;
        }

        this.resolvedVersion = cache.version;
        this.resolvedTerrainTileKey = terrainTileKey;
        this.resolvedGeometryTileKey = geometryTileKey;

        // exact terrain tile available -> the pre-computed transform applies.
        const heightMap = cache.getByKey(terrainTileKey);
        if (heightMap) {
            this.resolvedHeightMap = heightMap;
            this.resolvedHeightMapTransform = ref.transform || null;
            return;
        }

        // not loaded yet -> sample the nearest cached ancestor for now.
        const ancestorKey = cache.findAncestorKey(terrainTileKey);
        if (ancestorKey < 0) {
            this.resolvedHeightMap = null;
            this.resolvedHeightMapTransform = null;
            return;
        }

        // map the geometry's own tile into that ancestor. Uses per-buffer scratch storage
        // so the per-frame resolve stays allocation-free.
        const out = this.heightMapFallbackTransform ||= new Float32Array(3);
        this.resolvedHeightMap = cache.getByKey(ancestorKey) || null;
        this.resolvedHeightMapTransform = HeightMapTileCache.computeTransform(
            ancestorKey,
            geometryTileKey,
            out
        );
    }

    /**
     * Retrieves the heightmap associated with this buffer.
     *
     * @returns
     * - The heightmap object if available.
     * - `null` if a heightmap is required but not yet available.
     * - `false` if a heightmap is not required or not needed.
     *
     * @internal
     * @hidden
     */
    getHeightMap(): GeometryBuffer['heightMap'] | null | false {
        if (this.heightMap) return this.heightMap;
        const ref = this.heightMapRef;
        if (!ref) return false;
        if (ref === 'required') return null;
        // CPU sampling paths run outside the render cycle -> resolve on demand.
        this.resolveHeightMap();
        return this.resolvedHeightMap || null;
    };

    /**
     * Returns the UV transform matching {@link getHeightMap}, for mapping tile-local
     * coordinates into the heightmap texture.
     *
     * Safe to call in any order relative to `getHeightMap()` — both resolve the same state.
     *
     * @returns [offsetX, offsetY, scale] or null for identity (no transform needed).
     *
     * @internal
     * @hidden
     */
    getHeightMapTransform(): Float32Array | null {
        const ref = this.heightMapRef;
        if (!ref || ref === 'required') return null;
        // Buffers owning a direct `heightMap` (terrain meshes) sample that texture and are
        // not subject to the reference resolve.
        if (this.heightMap) return ref.transform || null;
        this.resolveHeightMap();
        return this.resolvedHeightMapTransform ?? null;
    }

    requiresHeightMap(): boolean {
        return !!this.heightMapRef;
    }

    static computeNormals(vertex: ArrayLike<number>, index?: ArrayLike<number>): TypedArray {
        const vertexLength = vertex.length;
        const normals = new Float32Array(vertexLength);

        if (!index) {
            // flat shading
            let i = 0;
            while (i < vertexLength) {
                averageFaceNormal(vertex, i, i + 6, i + 3, normals);
                i += 9;
            }
        } else {
            // smooth shading
            for (let i = 0, {length} = index; i < length; i += 3) {
                // averageFaceNormal(vertex, index[i+2] * 3, index[i + 1] * 3, index[i] * 3, normals);
                averageFaceNormal(vertex, index[i] * 3, index[i + 1] * 3, index[i + 2] * 3, normals);
            }
        }
        // normalize and quantize
        const normalized = new Int8Array(vertexLength);
        // const normalized = new Int16Array(vertexLength);
        for (let i = 0, nx, ny, nz; i < vertexLength; i += 3) {
            nx = normals[i];
            ny = normals[i + 1];
            nz = normals[i + 2];
            const invLen = 127 / Math.sqrt(nx * nx + ny * ny + nz * nz) || 0;
            // const invLen = 32767 / Math.sqrt(nx * nx + ny * ny + nz * nz) || 0;
            normalized[i] = Math.round(nx * invLen);
            normalized[i + 1] = Math.round(ny * invLen);
            normalized[i + 2] = Math.round(nz * invLen);
        }
        return normalized;
    }

    static fromTemplateBuffer(type: string, templBuffer: TemplateBuffer, light?: string): GeometryBuffer {
        const {flexAttributes} = templBuffer;
        let geoBuffer: GeometryBuffer;

        if (templBuffer.hasIndex()) {
            const index = templBuffer.index();

            if (!index.length) {
                return null;
            }
            geoBuffer = new GeometryBuffer(index, type, templBuffer.i32);
        } else {
            geoBuffer = new GeometryBuffer({
                first: templBuffer.first,
                count: templBuffer.count()
            }, type);
        }

        for (let name in flexAttributes) {
            let attr = flexAttributes[name];

            if ((<ConstantAttribute>attr).value) {
                // attribute uses constant value
                geoBuffer.attributes[name] = {value: (<ConstantAttribute>attr).value};
            } else if ((<FlexAttribute>attr).data.length) {
                geoBuffer.addAttribute(name, templBuffer.trimAttribute(attr as FlexAttribute));
            }
        }

        for (let name in templBuffer.uniforms) {
            geoBuffer.addUniform(name, templBuffer.uniforms[name]);
        }

        geoBuffer.light = light || templBuffer.light;

        templBuffer.populateGeometryBuffer(geoBuffer);

        return geoBuffer;
    }

    constructor(index?: ArrayData | IndexArray, type?: string, i32?: boolean) {
        if (index) {
            this.addDrawCmd(index, i32);
            this.type = type;
        }

        // this.uniformBlocks = new Map();
        // this.uniformBlockByField = new Map();
    }

    acknowledgeRender() {
        this.rendered = true;
    }

    private createElementsDrawCmd(index: number[] | Uint16Array | Uint32Array, i32?: boolean): ElementsDrawCmd {
        const data = Array.isArray(index) ?
            i32 ? new Uint32Array(index) : new Uint16Array(index)
            : index;
        // let i = index.length;
        // while (i--) {
        //     if (index[i] > 0xffff) {
        //         i32 = true;
        //         break;
        //     }
        // }
        return {
            index: {
                type: data.constructor == Uint32Array ? GL_UNSIGNED_INT : GL_UNSIGNED_SHORT,
                length: index.length,
                data
            }
        };
    }

    private createArrayDrawCmd(arrays: ArrayData) {
        // this.arrays = arrays;
        return {arrays};
    }

    addDrawCmd(cmd: ArrayData | IndexArray, i32?: boolean, mode?: number): ElementsDrawCmd | ArrayDrawCmd {
        if (cmd) {
            let group: ElementsDrawCmd | ArrayDrawCmd;

            if ((<ArrayData>cmd).first != UNDEF) {
                group = this.createArrayDrawCmd(<ArrayData>cmd);
            } else {
                group = this.createElementsDrawCmd(<IndexArray>cmd, i32);
            }

            if (mode) {
                group.mode = mode;
            }
            return this.groups[this.groups.length] = group;
        }
    }

    addUniform(name: string, uniform: Uniform) {
        this.uniforms[name] = uniform;
    }

    getUniform(name: string): Uniform | DynamicUniform {
        return this.uniforms[name];
    }

    addAttribute(name: string, attr: Attribute, dynamic?: boolean) {
        const {data} = attr;

        attr.type = glType(data);

        attr.bytesPerElement = data.BYTES_PER_ELEMENT;

        attr.dynamic &&= dynamic;

        if (attr.stride == UNDEF) {
            attr.stride = 0;
        }

        if (attr.dirty == UNDEF) {
            attr.dirty = true;
        }

        this.attributes[name] = attr;
    }

    computeNormals(
        vertex: TypedArray = (this.attributes.a_position as Attribute)?.data,
        index: TypedArray = (<ElementsDrawCmd> this.groups[0]).index?.data
    ) {
        return GeometryBuffer.computeNormals(vertex, index);
    }

    getAttributes() {
        return this.attributes;
    }

    destroy(buffer: GeometryBuffer) {

    }

    // dirty() {
    //     for (let name in this.attributes) {
    //         let attribute = this.attributes[name];
    //         if ((attribute as Attribute).dirty === true) {
    //             return true;
    //         }
    //     }
    //     return false;
    // }

    isPointBuffer() {
        const {type} = this;
        return type != 'Line' && type != 'Extrude';
    }

    isFlat() {
        return this.flat;
    }

    rayIntersects(buffer: GeometryBuffer, result, tileX: number, tileY: number, rayCaster: Raycaster): string | number {
        return null;
    }

    cullFace(cullFace?: number) {
        if (cullFace !== UNDEF) {
            this._cullFace = cullFace;
        }
        return this._cullFace;
    }

    private _uniformCache: CompiledUniformCache = {
        clear: true,
        uniforms: {},
        fromCache: false
    };

    clearUniformCache() {
        this._uniformCache.clear = true;
    }

    getUniformData(): Uniforms {
        return this._uniformCache.uniforms;
    }

    /**
     * @internal
     * @hidden
     *
     * Compiles uniforms for the current context if they are not already cached.
     *
     * This method checks if the uniforms need to be compiled. If the uniforms have not been cached,
     * it compiles them and updates the uniform data. If they are already cached, it marks the data
     * as being from the cache.
     *
     * @returns - An object representing the compiled uniforms, indicating whether the data was retrieved from the cache or freshly compiled.
     */
    compileUniforms(): CompiledUniformData {
        const uniformData = this._uniformCache;
        if (uniformData.clear) {
            uniformData.clear = false;
            uniformData.fromCache = false;
            const {uniforms} = this;

            for (let name in uniforms) {
                let u = uniforms[name];
                if (u instanceof Expression) {
                    u = u.resolve();
                } else if (Array.isArray(u)) {
                    let v0 = u[0];
                    if (v0 instanceof Expression) {
                        v0 = v0.resolve();
                        u = uniformData.uniforms[name] || [0, 0];
                        u[0] = v0;
                        u[1] = 0;
                    }
                }
                uniformData.uniforms[name] = u as Uniform;
            }
        } else {
            uniformData.fromCache = true;
        }
        return uniformData;
    }

    needsAlphaDepthPass(): boolean {
        return (this.pass & PASS.ALPHA_DEPTH) !== 0;
    }

    needsAlphaColorPass(): boolean {
        return (this.pass & PASS.ALPHA_COLOR) !== 0;
    }

    getRenderSpace(): 'world' | 'screen' {
        const alignMap = this.getUniform('u_alignMap') ?? true;
        return alignMap ? 'world' : 'screen';
    }

    hasUniformBlockInstance(name: string): boolean {
        return this.uniformBlocks.has(name);
    }

    getUniformBlockInstance(name: string): UniformBlockInstance | undefined {
        return this.uniformBlocks.get(name);
    }

    getUniformBlockInstanceOfField(fieldName: string): UniformBlockInstance | undefined {
        return this.uniformBlockByField.get(fieldName);
        // for (const block of this.uniformBlocks.values()) {
        //     if (fieldName in block.setters) {
        //         return block;
        //     }
        // }
        // return undefined;
    }

    // uniformBlockFieldSetter: {[fieldName:string]: UniformBlockFieldSetter} = {};
    setUniformBlockInstance(name: string, instance: UniformBlockInstance) {
        // this.uniformBlocks.set(name, instance);
        // If overwriting an existing block, remove its indexed fields first
        const prev = this.uniformBlocks.get(name);
        if (prev) {
            for (const field of Object.keys(prev.setters)) {
                this.uniformBlockByField.delete(field);
            }
        }

        this.uniformBlocks.set(name, instance);

        // Index fields for O(1) lookup
        for (const field of Object.keys(instance.setters)) {
            this.uniformBlockByField.set(field, instance);
        }
    }

    uploadUniformBlocks() {
        for (const block of this.uniformBlocks.values()) {
            if (!block.dirty) continue;
            block.upload();
        }
    }

    isTerrainSurface(): boolean {
        return this.type === 'Terrain';
    }
}

export {GeometryBuffer};
