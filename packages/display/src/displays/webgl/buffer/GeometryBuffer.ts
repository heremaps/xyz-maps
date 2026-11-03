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

import {getSizeBatchKey} from './batchKey';
import type {BufferStyle, BufferColor, CommonBufferStyle, SharedBufferStyle} from './BufferStyle';
export type {BufferStyle, BufferColor} from './BufferStyle';
import {generateWireframeIndices, computeNormals} from './geometry/geometryUtils';
import {Attribute, ConstantAttribute} from './Attribute';
import {glType, type TypedArray} from './glType';
import {Texture} from '../Texture';
import {FlexArray} from './FlexArray';
import {Raycaster} from '../Raycaster';
import {Expression} from '@here/xyz-maps-common';
import {HeightMapTileCache, HeightMapTileData, sampleHeightMap} from '../HeightMapTileCache';
import {FRONT} from './glType';
import {UniformBlockLayout, UniformBlockInstance, UniformBlockFieldSetter} from '../UniformBlock';
import {PASS} from '../RenderPass';
import {TerrainOcclusionMode, TerrainRenderMode} from './TerrainRenderPolicy';
import type {TextureManager} from '../TextureManager';

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

export type BufferUniforms = {
    [name: string]: Uniform | DynamicUniform;
    u_scaleByAltitude?: boolean;
    u_offset?: number[];
    u_offsetZ?: number[];
    u_alignMap?: boolean;
    u_texSize?: number[];
    specular?: number[];
    shininess?: number;
    'u_emissive.color'?: number[];
};

export type BufferAttributes<Attributes> = {
    [Name in keyof Attributes]: Attributes[Name] extends FlexAttribute ? Attribute : Attribute | ConstantAttribute
};

export type ConfigureBufferStyle<Style> = (
    style: Style,
    meterToPixel: number,
    hasAlphaColor: boolean,
    textureManager?: TextureManager,
    context?: Set<number[]>
) => void;

export type FlexAttribute = Omit<Attribute, 'data' | 'bytesPerElement' | 'ref'> & {
    data: FlexArray;
};

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
    attributes?: { [name: string]: Attribute | ConstantAttribute },
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

const _nextBufferUid = new Uint32Array(1);

class GeometryBuffer {
    protected static readonly COLOR_UNDEFINED = new Float32Array([-1, -1, -1, -1]);

    static getSizeBatchKey = getSizeBatchKey;


    static getFillColor(fill: BufferStyle['fill']): BufferColor | undefined {
        return fill && !('stops' in fill) ? fill : undefined;
    }

    static hasAlphaColor(style: SharedBufferStyle): boolean {
        return this.getFillColor(style.fill)?.[3] < 1 || style.stroke?.[3] < 1;
    }

    flexAttributes: {[name: string]: FlexAttribute | ConstantAttribute} | null;
    first: number;
    last: number;
    i32: boolean;
    // Construction-time clipping classification; isPointBuffer() controls legacy shader sizing.
    isPointGeometry: boolean;
    protected _index?: IndexArray;
    private arrayCount?: number;
    private finalized: boolean;
    private sourceHeightBounds?: [number, number];

    static getVertexZ(x: number, y: number, heightMap: HeightMapTileData, transform: ArrayLike<number> | null): number {
        return sampleHeightMap(heightMap.data, heightMap.size, heightMap.tileSize, x, y,
            transform[0], transform[1], transform[2], heightMap.padding);
    }

    // Monotonically increasing instance ID. Used for content-hash based FBO caching:
    // new data -> new buffer -> new uid -> hash mismatch -> FBO re-rendered.
    readonly uid: number = _nextBufferUid[0]++;

    static generateWireframeIndices = generateWireframeIndices;


    static MODE_GL_POINTS: number = 0x0000;
    static MODE_GL_LINES: number = 0x0001;
    static MODE_GL_TRIANGLES: number = 0x0004;
    // private size: number;
    attributes: { [name: string]: Attribute | ConstantAttribute } = {};
    uniforms: BufferUniforms = {};
    type: string;
    pass: number = PASS.OPAQUE;
    alphaMode?: 'opaque' | 'mask' | 'blend';
    alphaCutoff?: number;
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
    // Whether pixel-defined sizes/offsets are applied from a single anchor position,
    // see usesFixedScreenSizeScale().
    anchoredPixelSize: boolean = false;
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
    // Fixed per-frame W reference this buffer was rendered with, see GLRender.referenceW.
    // 0 for passes that use the legacy altitude calibration.
    referenceW: number = 0;

    private _cullFace: number = 0;

    // ------ currently used by "Model" only ------
    bbox?: number[];
    fragmentTileClip?: boolean;
    // Terrain height range before exaggeration, used by the picking AABB.
    zRange?: [min: number, max: number];
    // --------------------------------------------

    id?: number | string;
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
        this.macroMask = undefined;
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

    static computeNormals = computeNormals;

    constructor(flat: boolean);
    constructor(index?: ArrayData | IndexArray, type?: string, i32?: boolean);
    constructor(index?: ArrayData | IndexArray | boolean, type?: string, i32?: boolean) {
        if (typeof index === 'boolean' || !index) {
            this.flexAttributes = null;
            this.first = 0;
            this.i32 = false;
            this.isPointGeometry = false;
            this.finalized = false;
            if (typeof index === 'boolean') {
                this.flat = index;
                this.idOffsets = [];
                this._cullFace = FRONT;
            }
        } else {
            this.addDrawCmd(index, i32);
            this.type = type;
        }
    }

    setRequiresHeightMap(required: boolean): void {
        this.setHeightMapRef(required);
        if (required) this.flat = false;
    }

    count(): number {
        if (this.arrayCount !== undefined) return this.arrayCount;
        const group = this.groups[0];
        if (group && 'arrays' in group) return group.arrays.count;
        const {data, size} = (this.flexAttributes?.a_position || this.attributes.a_position) as FlexAttribute | Attribute;
        return data.length / size - (this.first ?? 0);
    }

    setArray(first: number, count: number): void {
        this.assertConstructing();
        this.first = first;
        this.arrayCount = count;
    }

    setIndex(index: IndexArray): void {
        this.assertConstructing();
        this._index = index;
    }

    index(): IndexArray {
        const group = this.groups[0];
        if (group && 'index' in group) return group.index.data;
        if (!this._index) {
            this.assertConstructing();
            this._index = [];
        }
        return this._index;
    }

    hasIndex(): boolean {
        const group = this.groups[0];
        return !!this._index || !!group && 'index' in group;
    }

    isEmpty(): boolean {
        return this.count() === 0;
    }

    getPositionAttribute(): FlexAttribute {
        this.assertConstructing();
        return this.flexAttributes.a_position as FlexAttribute;
    }

    setIdOffset(featureId: string | number): void {
        this.assertConstructing();
        this.idOffsets?.push(featureId);
    }

    protected assertConstructing(): void {
        if (this.finalized || !this.flexAttributes && this.groups.length) {
            throw new Error('Cannot rebuild a finalized GeometryBuffer; create a fresh buffer.');
        }
    }

    protected assertFinalized(): void {
        if (!this.finalized) {
            throw new Error('Finalize the buffer first.');
        }
    }

    finalize(type: string, light?: string): this | null {
        if (this.finalized || !this.flexAttributes && this.groups.length) return this;
        if (this.hasIndex() && !this._index.length) return null;
        this.arrayCount = this.count();
        this.addDrawCmd(this.hasIndex() ? this._index : {first: this.first, count: this.count()}, this.i32);
        if (this.hasIndex()) this._index = (this.groups[0] as ElementsDrawCmd).index.data;
        for (const name in this.flexAttributes) {
            const attr = this.flexAttributes[name];
            if ('value' in attr) {
                this.attributes[name] = {value: attr.value};
            } else if (attr.data.length) {
                // Preserve descriptor identity: model parts and collision records share attributes.
                const attribute = attr as FlexAttribute | Attribute;
                if (attribute.data instanceof FlexArray) {
                    Object.assign(attribute, {data: attribute.data.trim()});
                }
                this.addAttribute(name, attribute as Attribute);
            }
        }
        this.light = light || this.light;
        this.type = type;
        this.finalized = true;
        this.flexAttributes = null;
        return this;
    }

    /**
     * Creates a plain GeometryBuffer for rendering. Subclass instances would give the render hot path
     * several object shapes (hidden classes) and slow it down.
     * The source buffer must not be rendered or released afterwards; the returned buffer owns the shared attributes and textures.
     *
     * @hideen
     * @internal
     */
    toRenderBuffer(): GeometryBuffer {
        this.assertFinalized();

        const group = this.groups[0];
        const buffer = new GeometryBuffer('index' in group ? group.index.data : group.arrays, this.type, this.i32);
        for (const name in this.attributes) buffer.attributes[name] = this.attributes[name];
        for (const name in this.uniforms) buffer.addUniform(name, this.uniforms[name]);
        buffer.groups = this.groups;
        buffer.light = this.light;
        buffer.instances = this.instances;
        buffer.idOffsets = this.idOffsets;
        buffer.alphaMode = this.alphaMode;
        buffer.alphaCutoff = this.alphaCutoff;
        buffer.cullFace(this.cullFace());
        buffer.rayIntersects = this.rayIntersects;
        buffer.setHeightMapRef(!!this.heightMapRef);
        buffer.heightMapRef = this.heightMapRef || null;
        buffer.anchoredPixelSize = this.anchoredPixelSize;
        buffer.flat = this.flat;
        buffer.pass = this.pass;
        buffer.depth = this.depth;
        buffer.blend = this.blend;
        buffer.renderUsage = this.renderUsage;
        buffer.terrainOcclusion = this.terrainOcclusion;
        buffer.pixelPerfect = this.pixelPerfect;
        buffer.renderScale = this.renderScale;
        buffer.referenceW = this.referenceW;
        buffer.rendered = this.rendered;
        buffer.zIndex = this.zIndex;
        buffer.zLayer = this.zLayer;
        buffer.clip = this.clip;
        buffer.scissorBox = this.scissorBox;
        buffer.mode = this.mode;
        buffer.pointerEvents = this.pointerEvents;
        buffer.isSynthetic = this.isSynthetic;
        buffer.bbox = this.bbox;
        buffer.fragmentTileClip = this.fragmentTileClip;
        buffer.id = this.id;
        buffer.zRange = this.zRange;
        buffer.heightMap = this.heightMap;
        buffer.terrainCache = this.terrainCache;
        buffer.uniformBlocks = this.uniformBlocks;
        buffer.uniformBlockByField = this.uniformBlockByField;
        return buffer;
    }

    /**
     * Effective picking heights, including exaggeration. The camera-derived fallback
     * preserves the generic prefilter; specialized buffers return null when unsafe to cull.
     * Returned storage belongs to the buffer and may be reused.
     */
    getHeightBounds(exaggeration: number, fallbackMax: number = Infinity): readonly number[] | null {
        return this.getSourceHeightBounds(exaggeration, fallbackMax);
    }

    createStyleContext(style: SharedBufferStyle): Set<number[]> | undefined {
        return undefined;
    }

    configureStyle(
        style: SharedBufferStyle,
        meterToPixel: number,
        hasAlphaColor: boolean,
        textureManager?: TextureManager,
        context?: Set<number[]>
    ): void {
        this.terrainOcclusion = style.terrainOcclusion;
        if (style.terrainRenderMode === TerrainRenderMode.OFFSCREEN) {
            this.renderUsage = RenderUsage.TERRAIN_PREPASS;
        }
        this.addUniform('u_scaleByAltitude', style.scaleByAltitude);
        this.configureTypeStyle(style, meterToPixel, hasAlphaColor, textureManager, context);
        this.configureOffsets(style, meterToPixel);
        this.configureLighting(style);
    }

    protected configureTypeStyle(
        style: SharedBufferStyle,
        meterToPixel: number,
        hasAlphaColor: boolean,
        textureManager?: TextureManager,
        context?: Set<number[]>
    ): void {}

    protected configureOffsets(style: CommonBufferStyle, meterToPixel: number): void {
        if (Array.isArray(style.offsetUnit)) {
            this.addUniform('u_offset', [
                style.offsetX, style.offsetUnit[0] === 'm' ? meterToPixel : 0,
                style.offsetY, style.offsetUnit[1] === 'm' ? meterToPixel : 0
            ]);
            this.addUniform('u_offsetZ', [style.offsetZ, style.offsetUnit[2] === 'm' ? meterToPixel : 0]);
        }
    }

    protected configureLighting(style: CommonBufferStyle): void {
        this.addLightingUniforms(style);
    }

    protected addLightingUniforms(style: CommonBufferStyle): void {
        if (style.emissive) this.addUniform('u_emissive.color', style.emissive);
        if (style.specular) {
            this.addUniform('specular', style.specular);
            this.addUniform('shininess', style.shininess);
        }
    }

    protected configureTextureStyle(style: Pick<BufferStyle, 'alignment'>, texture: Texture): void {
        this.addUniform('u_texSize', [texture.width, texture.height]);
        this.addUniform('u_alignMap', style.alignment === 'map');
        this.pass = PASS.ALPHA_COLOR;
        this.depth = this.blend = true;
    }

    protected getSourceHeightBounds(exaggeration: number, fallbackMax: number): readonly [number, number] {
        const bounds = this.sourceHeightBounds ||= [0, 0];
        bounds[0] = (this.zRange?.[0] ?? 0) * exaggeration;
        bounds[1] = this.zRange?.[1] != null ? this.zRange[1] * exaggeration : fallbackMax;
        return bounds;
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

    addUniform<Name extends keyof this['uniforms'] & string>(name: Name, uniform: this['uniforms'][Name]): void;
    addUniform(name: string, uniform: Uniform | DynamicUniform) {
        this.uniforms[name] = uniform;
        this.macroMask = undefined;
    }

    getUniform<Name extends keyof this['uniforms'] & string>(name: Name): this['uniforms'][Name];
    getUniform(name: string): Uniform | DynamicUniform {
        return this.uniforms[name];
    }

    addAttribute(name: string, attr: Attribute, dynamic?: boolean) {
        this.initAttribute(attr, dynamic);
        this.attributes[name] = attr;
        this.macroMask = undefined;
    }

    // reusing a base attribute requires the same name. group-only attributes are owned by the group.
    addGroupAttribute(
        group: ElementsDrawCmd | ArrayDrawCmd,
        name: string,
        attr: Attribute | ConstantAttribute,
        dynamic?: boolean
    ) {
        if ((attr as ConstantAttribute).value === undefined) {
            this.initAttribute(attr as Attribute, dynamic);
        }
        (group.attributes ||= {})[name] = attr;
    }

    private initAttribute(attr: Attribute, dynamic?: boolean) {
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

    /**
     * Whether pixel-defined sizes may be calibrated against the fixed view reference
     * (GLRender.referenceW) to keep a constant screen size at any depth.
     *
     * Only elevated, single-anchor geometry qualifies: flat geometry stays at scale 1 and
     * geometry extending in depth (lines) must narrow with distance, see altitudeScaleFactor().
     *
     * @internal
     * @hidden
     */
    usesFixedScreenSizeScale(): boolean {
        return this.anchoredPixelSize && !this.flat;
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
