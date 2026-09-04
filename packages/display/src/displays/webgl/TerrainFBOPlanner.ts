/*
 * Copyright (C) 2019-2026 HERE Europe B.V.
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

import {GeometryBuffer, RenderUsage, ElementsDrawCmd, HeightMapReference} from './buffer/GeometryBuffer';
import {Attribute} from './buffer/Attribute';
import {HeightMapTileCache, HeightMapTileData} from './HeightMapTileCache';
import {RenderTile, RenderTilePool, RenderTileTarget} from './RenderTile';
import {RenderData} from './Display';
import {Layer} from '../Layers';
import {DisplayTile} from '../BasicDisplay';
import {tileUtils} from '@here/xyz-maps-core';
import {Pool} from '@here/xyz-maps-common';
import {Texture} from './Texture';
import {GraphicsDevice} from './device/GraphicsDevice';

export interface TerrainFBOPlanResult {
    fboSizes: { [qk: string]: number };
    fboContentHashes: { [qk: string]: number };
    terrainSourceTiles: RenderTile[];
}

type SyntheticCacheEntry = {
    sourceQK: string;
    sourceHeightMap?: GeometryBuffer['heightMap'];
    buffer: GeometryBuffer;
    syntheticHeightMap?: HeightMapTileData;
};

/**
 * Orchestrates terrain FBO planning for a single frame.
 *
 * Responsibilities:
 * - Determine which terrain meshes exist and which offscreen FBOs are required
 * - Route TERRAIN_PREPASS (imagery) tiles into the correct FBO targets
 * - Create and cache synthetic terrain buffers for display-zoom subdivisions
 * - Compute FBO sizes and content hashes for cache invalidation
 *
 * @internal
 * @hidden
 */
export class TerrainFBOPlanner {
    private terrainCache: HeightMapTileCache;
    private maxTextureSize: number;

    /**
     * Persistent cache of synthetic terrain buffers, keyed by targetQK.
     * Entries persist across frames as long as their target remains visible.
     * Stale entries are recycled into the pool at the end of each frame.
     */
    private syntheticCache: Map<string, SyntheticCacheEntry> = new Map();
    // pool of recycled GeometryBuffer wrappers for synthetic terrain tiles.
    private syntheticPool: Pool<GeometryBuffer>;
    // grid vertex density for synthetic terrain meshes.
    private syntheticGridResolution: number = 64;
    // CPU-side grid geometry cache (position + index typed arrays), keyed by resolution:skirt.
    private syntheticTerrainGridCache: {
        [key: string]: { position: Uint16Array, size: number, index: Uint16Array | Uint32Array }
    } = {};
    /**
     * immutable grid geometry shared by ALL synthetic terrain tiles. Since every synthetic
     * tile uses the identical mesh (same gridResolution + skirt).
     */
    private syntheticTerrainGeom: {
        [key: string]: {
            positionAttr: Attribute,
            indexDescriptor: ElementsDrawCmd['index'],
            wireFrameIndices: Uint16Array | Uint32Array
        }
    } = {};

    // Maximum quantized vertex coordinate of the synthetic grid (see createTerrainGrid).
    // This matches the quantization the terrain shader and computeEdgeIndices() assume.
    private static readonly SYNTHETIC_GRID_MAX_COORD = 32767;

    // callback to release GPU resources (VAO + optional texture) of synthetic buffers.
    private releaseSyntheticBuffer: (buffer: GeometryBuffer, heightMap?: HeightMapTileData) => void;
    private _emptyWireframeTexture: Texture;

    private _dbgWireFrame: boolean = false;
    private readonly fboZoomSteps: number = 5;
    private lastEnforcedFBOZoom: number = NaN;

    constructor(
        terrainCache: HeightMapTileCache,
        maxTextureSize: number,
        device: GraphicsDevice,
        releaseSyntheticBuffer: (buffer: GeometryBuffer, heightMap?: HeightMapTileData) => void
    ) {
        this.terrainCache = terrainCache;
        this.maxTextureSize = maxTextureSize;
        this.releaseSyntheticBuffer = releaseSyntheticBuffer;

        this.syntheticPool = new Pool<GeometryBuffer>(
            () => this.createSyntheticBuffer(),
            (buf) => this.releaseSyntheticBuffer(buf)
        );

        this._emptyWireframeTexture = new Texture(device, {
            data: new Uint8Array([0, 0, 0, 255]),
            width: 1,
            height: 1
        });
        this._emptyWireframeTexture.ref = Infinity;
    }

    private isFBOZoomHashBoundary(zoom: number): boolean {
        const scaledZoom = zoom * this.fboZoomSteps;
        return Math.abs(scaledZoom - Math.round(scaledZoom)) < 1e-9;
    }

    needsFBOZoomEnforcement(zoom: number): boolean {
        return !(this.isFBOZoomHashBoundary(zoom) || Math.abs(this.lastEnforcedFBOZoom - zoom) < 1e-9);
    }

    markFBOZoomEnforced(zoom: number): void {
        this.lastEnforcedFBOZoom = zoom;
    }

    /**
     * Main entry point — called once per frame from initLayerBuffers().
     * Modifies tileBuffers in-place (adds synthetic tiles, removes superseded sources).
     * Each terrain/render tile owns its own offscreen FBO target. Missing terrain tiles are handled by the existing
     * preview task path, which can derive them from parent terrain data before the offscreen content is consumed.
     *
     * @internal
     * @hidden
     */
    plan(
        tileBuffers: RenderData[],
        terrainDisplayLayer: Layer,
        renderTilePool: RenderTilePool,
        zoom: number
    ): TerrainFBOPlanResult {
        const fboContentZoom = this.getFBOContentZoom(zoom);
        const terrainTileSize = terrainDisplayLayer.tileSize;
        const baseFBOSize = terrainTileSize * 2;
        const maxFBOSize = this.maxTextureSize;
        const fboSizes: { [qk: string]: number } = {};
        const terrainSources = new Map<string, RenderTile>();
        const requiredTerrainTargets = new Map<string, { seed: DisplayTile, terrainQK: string }>();

        // step 1: collect terrain source tiles (no splitting — we need displayZoomPerArea first)
        for (const tb of tileBuffers) {
            if (!tb.tiled) continue;
            const rt = tb as RenderTile;
            const buffer = rt.buffer;
            if (rt.layer !== terrainDisplayLayer || !buffer) continue;
            // Accept terrain buffers that have either direct heightMap or a resolved heightMapRef
            if (!buffer.heightMap && !(buffer.heightMapRef && buffer.heightMapRef !== 'required')) continue;

            const meshQK = (rt.data.preview?.[0] as string) || rt.data.tile.quadkey;
            rt.data.terrainTileQuadkey = meshQK;
            terrainSources.set(meshQK, rt);
        }

        // keep CPU-backed DEM tiles for raycasts. They are fewer than synthetic display tiles
        // and remain valid for this frame, even if no longer rendered.
        const terrainSourceTiles = Array.from(terrainSources.values());

        // step 2: collect all TERRAIN_PREPASS tiles. Use the adaptive-LOD grid's visible display-zoom tiles directly.
        const prepassTiles: RenderTile[] = [];
        for (const tb of tileBuffers) {
            if (!tb.tiled) continue;
            const rt = tb as RenderTile;
            if (rt.layer === terrainDisplayLayer) continue;
            if (rt.buffer.renderUsage !== RenderUsage.TERRAIN_PREPASS) continue;
            prepassTiles.push(rt);
        }

        const findDEMSource = (qk: string): string | undefined => {
            for (let len = qk.length; len >= 1; len--) {
                const pfx = qk.substring(0, len);
                if (terrainSources.has(pfx)) return pfx;
            }
        };

        // maps each proper quadkey prefix to its descendant targets. Updated as targets are added.
        const targetsByAncestor = new Map<string, string[]>();
        const registerTargetAncestors = (targetQK: string) => {
            for (let len = 1; len < targetQK.length; len++) {
                const pfx = targetQK.substring(0, len);
                let arr = targetsByAncestor.get(pfx);
                if (!arr) targetsByAncestor.set(pfx, arr = []);
                arr.push(targetQK);
            }
        };

        // Step 3: build the required terrain FBO targets directly from the visible
        // display-zoom render tiles. Each maps to its DEM source (prefix match).
        for (const rtTile of terrainDisplayLayer.terrainRenderTiles) {
            const terrainQK = rtTile.quadkey;
            if (requiredTerrainTargets.has(terrainQK)) continue;

            const demQK = findDEMSource(terrainQK);
            if (!demQK) continue;

            // separate-grid render tiles bypass normal bucket assignment; attach the DEM source
            // tile's bucket because draw() uses screenTile.tile for stencil IDs and transforms.
            rtTile.tile ||= terrainSources.get(demQK).data.tile.tile;

            requiredTerrainTargets.set(terrainQK, {
                seed: rtTile,
                terrainQK
            });
            registerTargetAncestors(terrainQK);
        }

        // give standalone terrain-source meshes an FBO target. In lookDown previews, DEM data
        // may exist only in finer child tiles, so coarse terrainRenderTiles have no ancestor
        // match and their imagery would otherwise be skipped. Add a self-target only when no
        // finer target descendant exists; parents are handled by the synthetic-children path.
        for (const [meshQK, sourceRT] of terrainSources) {
            if (requiredTerrainTargets.has(meshQK)
                || targetsByAncestor.has(meshQK) // a finer target already covers this source
            ) continue;
            requiredTerrainTargets.set(meshQK, {
                seed: sourceRT.data.tile,
                terrainQK: meshQK
            });
            registerTargetAncestors(meshQK);
        }


        // Pass 2: draw each TERRAIN_PREPASS imagery tile into every overlapping terrain FBO.
        // Coarser imagery is duplicated for multiple FBOs; finer imagery uses separate
        // RenderTiles targeting the same FBO. GLRender positions each tile in its FBO region.
        const fboContentHashes: { [qk: string]: number } = {};

        for (const rt of prepassTiles) {
            const rtData = rt.data;
            const dataQK = rtData.tile.quadkey;
            const previewQK = rtData.preview?.[0] as string;
            // match "look-down" previews to their child FBO.
            // using the parent would broadcast one preview to all descendant FBOs.
            const coverageQK = previewQK?.length > dataQK.length ? previewQK : dataQK;
            const dataTileSize = rt.layer?.tileSize || terrainTileSize;
            rt.renderTarget = RenderTileTarget.OffscreenTerrain;

            let first = true;
            const applyTarget = (terrainQK: string) => {
                this.trackFBOSize(fboSizes, dataQK, terrainQK, dataTileSize, terrainTileSize, baseFBOSize, maxFBOSize);

                // rolling content hash (DJB2-XOR): combine buffer uid into per-FBO hash.
                // New data -> new buffer -> new uid -> hash mismatch -> FBO re-rendered.
                let h = fboContentHashes[terrainQK] || 5381;
                h = ((h << 5) + h) ^ rt.buffer.uid;
                fboContentHashes[terrainQK] = h;

                if (first) {
                    // first matching FBO reuses the original RenderTile.
                    rtData.terrainTileQuadkey = terrainQK;
                    first = false;
                } else {
                    // additional FBOs need duplicate RenderTiles.
                    const dupTile = renderTilePool.getNext().init(
                        rt.buffer,
                        rt.z,
                        {
                            tile: rtData.tile,
                            preview: rtData.preview,
                            stencils: rtData.stencils,
                            terrainTileQuadkey: terrainQK
                        },
                        rt.pass,
                        rt.layer
                    );
                    dupTile.renderTarget = RenderTileTarget.OffscreenTerrain;
                    tileBuffers[tileBuffers.length] = dupTile;
                }
            };

            // apply each overlapping target once: exact match, ancestor targets via prefix
            // walk, and descendant targets via the ancestor index.
            if (requiredTerrainTargets.has(coverageQK)) applyTarget(coverageQK);
            for (let len = 1; len < coverageQK.length; len++) {
                const pfx = coverageQK.substring(0, len);
                if (requiredTerrainTargets.has(pfx)) applyTarget(pfx);
            }
            const descendants = targetsByAncestor.get(coverageQK);
            if (descendants) {
                for (const terrainQK of descendants) applyTarget(terrainQK);
            }
        }

        // track source meshes replaced by finer synthetic children.
        const supersededParentTiles = new Set<RenderTile>();
        // track synthetic cache entries used this frame.
        const activeTargetQKs = new Set<string>();

        for (const [targetQK, {seed}] of requiredTerrainTargets) {
            const exactTerrain = terrainSources.get(targetQK);
            if (exactTerrain) continue;

            // find the finest available source ancestor for this target.
            const sourceQK = findDEMSource(targetQK);
            if (!sourceQK) continue;
            const sourceTerrain = terrainSources.get(sourceQK);

            // replace this source with finer synthetic meshes.
            supersededParentTiles.add(sourceTerrain);

            const syntheticBuffer = this.getSyntheticTerrainBuffer(targetQK, sourceQK, sourceTerrain.buffer);
            activeTargetQKs.add(targetQK);

            const syntheticTile = renderTilePool.getNext().init(
                syntheticBuffer,
                sourceTerrain.z,
                {
                    tile: seed,
                    terrainTileQuadkey: targetQK
                },
                sourceTerrain.pass,
                terrainDisplayLayer
            );
            tileBuffers[tileBuffers.length] = syntheticTile;
        }

        // remove source meshes replaced by finer synthetic children in place.
        if (supersededParentTiles.size > 0) {
            let write = 0;
            for (let read = 0; read < tileBuffers.length; read++) {
                if (!supersededParentTiles.has(tileBuffers[read] as RenderTile)) {
                    tileBuffers[write++] = tileBuffers[read];
                }
            }
            tileBuffers.length = write;
        }

        // recycle synthetic cache entries not used this frame.
        for (const [qk, entry] of this.syntheticCache) {
            if (!activeTargetQKs.has(qk)) {
                this.releaseSyntheticBuffer(entry.buffer, entry.syntheticHeightMap);
                this.syntheticPool.release(entry.buffer);
                this.syntheticCache.delete(qk);
            }
        }

        // include content zoom so zoom-dependent content invalidates cached FBOs.
        for (const qk in fboContentHashes) {
            let h = fboContentHashes[qk];
            h = ((h << 5) + h) ^ fboContentZoom;
            fboContentHashes[qk] = h >>> 0;
        }

        return {
            fboSizes,
            fboContentHashes,
            terrainSourceTiles
        };
    }

    reset(): void {
        for (const entry of this.syntheticCache.values()) {
            this.releaseSyntheticBuffer(entry.buffer, entry.syntheticHeightMap);
        }
        this.syntheticCache.clear();
        this.syntheticPool.clear();
        this.lastEnforcedFBOZoom = NaN;
    }

    destroy(): void {
        this.reset();
        this.syntheticTerrainGridCache = {};
        this.syntheticTerrainGeom = {};
    }

    private getFBOContentZoom(zoom: number): number {
        return Math.floor(zoom * this.fboZoomSteps);
    }

    /**
     * Track the maximum required FBO size for a terrain mesh quadkey.
     * When data tiles are at higher zoom than the terrain mesh, the FBO is scaled up
     * to avoid pixelation (capped at maxFBOSize).
     *
     * @internal
     * @hidden
     */
    private trackFBOSize(
        fboSizes: { [qk: string]: number },
        dataQK: string,
        meshQK: string,
        dataTileSize: number,
        terrainTileSize: number,
        baseFBOSize: number,
        maxFBOSize: number
    ): void {
        // account for tile size differences: a 256px data tile at zoom Z+1
        // covers the same area as a 512px terrain tile at zoom Z.
        const tileSizeDelta = Math.max(0, Math.round(Math.log2(terrainTileSize / dataTileSize)));
        const effectiveDataLevel = dataQK.length - tileSizeDelta;
        const delta = effectiveDataLevel - meshQK.length;

        if (delta > 0) {
            const required = Math.min(baseFBOSize * (1 << delta), maxFBOSize);
            if (required > (fboSizes[meshQK] || 0)) {
                fboSizes[meshQK] = required;
            }
        }
    }

    /**
     * Generate a regular grid mesh for synthetic terrain tiles.
     * Produces a Uint16 position array (normalized 0..32767) and triangle indices.
     * Optionally includes a skirt ring around the border to hide seams between tiles.
     *
     * @internal
     * @hidden
     */
    private createTerrainGrid(
        gridResolution: number = 64,
        skirt: boolean = false
    ): { position: Uint16Array, size: number, index: Uint16Array | Uint32Array } {
        const edgeCount = gridResolution + 1;
        const vertexCount = edgeCount * edgeCount;
        const borderCount = skirt ? edgeCount * 4 - 4 : 0;
        const totalVertexCount = vertexCount + borderCount;
        const size = 2;
        const position = new Uint16Array(totalVertexCount * size);
        const indexCount = gridResolution * gridResolution * 6 + borderCount * 6;
        const useUint32Indices = totalVertexCount > 65536;
        const index = useUint32Indices ? new Uint32Array(indexCount) : new Uint16Array(indexCount);
        const maxCoord = 32767;

        for (let y = 0; y < edgeCount; y++) {
            const ny = y / gridResolution;
            for (let x = 0; x < edgeCount; x++) {
                const nx = x / gridResolution;
                const v = y * edgeCount + x;
                const p = v * size;
                position[p] = Math.round(nx * maxCoord);
                position[p + 1] = Math.round(ny * maxCoord);
            }
        }

        let i = 0;
        for (let y = 0; y < gridResolution; y++) {
            for (let x = 0; x < gridResolution; x++) {
                const i00 = y * edgeCount + x;
                const i10 = i00 + 1;
                const i01 = i00 + edgeCount;
                const i11 = i01 + 1;

                if ((x + y) & 1) {
                    index[i++] = i00;
                    index[i++] = i10;
                    index[i++] = i01;
                    index[i++] = i10;
                    index[i++] = i11;
                    index[i++] = i01;
                } else {
                    index[i++] = i00;
                    index[i++] = i10;
                    index[i++] = i11;
                    index[i++] = i00;
                    index[i++] = i11;
                    index[i++] = i01;
                }
            }
        }

        if (skirt) {
            const borderLoop: number[] = [];
            const skirtVertexStart = vertexCount;
            const skirtMask = 0x8000;

            // top: left -> right
            for (let x = 0; x <= gridResolution; x++) {
                borderLoop.push(x);
            }
            // right: top+1 -> bottom
            for (let y = 1; y <= gridResolution; y++) {
                borderLoop.push(y * edgeCount + gridResolution);
            }
            // bottom: right-1 -> left
            for (let x = gridResolution - 1; x >= 0; x--) {
                borderLoop.push(gridResolution * edgeCount + x);
            }
            // left: bottom-1 -> top+1
            for (let y = gridResolution - 1; y > 0; y--) {
                borderLoop.push(y * edgeCount);
            }

            const mainToSkirt = new Map<number, number>();
            for (let b = 0; b < borderLoop.length; b++) {
                const mainIndex = borderLoop[b];
                const skirtIndex = skirtVertexStart + b;
                mainToSkirt.set(mainIndex, skirtIndex);

                const mainOffset = mainIndex * size;
                const skirtOffset = skirtIndex * size;
                position[skirtOffset] = position[mainOffset] | skirtMask;
                position[skirtOffset + 1] = position[mainOffset + 1];
            }

            for (let b = 0; b < borderLoop.length; b++) {
                const mainA = borderLoop[b];
                const mainB = borderLoop[(b + 1) % borderLoop.length];
                const skirtA = mainToSkirt.get(mainA);
                const skirtB = mainToSkirt.get(mainB);

                index[i++] = mainB;
                index[i++] = mainA;
                index[i++] = skirtB;
                index[i++] = mainA;
                index[i++] = skirtA;
                index[i++] = skirtB;
            }
        }

        return {position, size, index};
    }

    private getSharedTerrainGeom(gridResolution: number, useSkirt: boolean) {
        const gridKey = `${gridResolution}:${useSkirt ? 'skirt' : 'plain'}`;
        let geom = this.syntheticTerrainGeom[gridKey];
        if (!geom) {
            const {position, size, index} = this.syntheticTerrainGridCache[gridKey]
                ||= this.createTerrainGrid(gridResolution, useSkirt);
            // shared descriptors let all synthetic wrappers reuse one GPU upload.
            const tmp = new GeometryBuffer(index, 'Terrain');
            tmp.addAttribute('a_position', {data: position, size, stride: 0});
            geom = this.syntheticTerrainGeom[gridKey] = {
                positionAttr: tmp.attributes.a_position as Attribute,
                indexDescriptor: (tmp.groups[0] as ElementsDrawCmd).index,
                wireFrameIndices: GeometryBuffer.generateWireframeIndices(index)
            };
        }
        return geom;
    }

    /**
     * Synthetic tiles reuse the source mesh's model matrix, which encodes
     * `tileSize / quantizationRange`. Valid only because the quantization is a pipeline
     * constant. A deviating source cannot be repaired here (its heightmap sampling would stay
     * wrong), so the mismatch is reported instead of hidden.
     *
     * @internal
     * @hidden
     */
    private verifySourceQuantization(sourceBuffer: GeometryBuffer): void {
        // the quantization is fixed across the terrain pipeline for now. keep this check for future use.
        return;

        const source = (sourceBuffer.attributes.a_modelMatrix as Attribute)?.data;
        // horizontal basis column 0 of the model matrix. Column 2 is the height axis.
        const sourceXYScale = Math.hypot(source[0], source[1], source[2]);
        const expectedXYScale = this.terrainCache.tileSize / TerrainFBOPlanner.SYNTHETIC_GRID_MAX_COORD;

        if (!(sourceXYScale > 0) || Math.abs(sourceXYScale - expectedXYScale) <= expectedXYScale * 1e-3) {
            return;
        }
        console.warn(
            'TerrainFBOPlanner: quantization mismatch (expected', TerrainFBOPlanner.SYNTHETIC_GRID_MAX_COORD +
            ', got', this.terrainCache.tileSize / sourceXYScale + ').'
        );

        // Optional placement-only compensation. Disabled: it would not fix the shader's
        // heightmap sampling and thus hide the error instead of solving it.
        // const attribute = synthetic.attributes.a_modelMatrix as Attribute;
        // const m = attribute.data as Float32Array;
        // copy(m, source);
        // const ratio = expectedXYScale / sourceXYScale;
        // m[0] *= ratio;
        // m[1] *= ratio;
        // m[2] *= ratio;
        // m[4] *= ratio;
        // m[5] *= ratio;
        // m[6] *= ratio;
        // attribute.dirty = true;
    }

    private createSyntheticBuffer(): GeometryBuffer {
        const useSkirt = true;
        const gridResolution = this.syntheticGridResolution;
        const {positionAttr, indexDescriptor, wireFrameIndices} = this.getSharedTerrainGeom(gridResolution, useSkirt);

        const synthetic = new GeometryBuffer(indexDescriptor.data, 'Terrain');
        synthetic.isSynthetic = true;
        // synthetic.type = 'Terrain';
        // synthetic.groups.push({index: indexDescriptor});
        synthetic.attributes.a_position = positionAttr;
        synthetic.attributes.a_color = {value: [1, 1, 1, 1]};
        synthetic.attributes.a_tangent = {value: [1, 0, 0]};

        synthetic.heightMapRef = {
            terrainTileKey: null,
            transform: new Float32Array(3)
        };

        if (this._dbgWireFrame) {
            synthetic.addDrawCmd(wireFrameIndices, false, GeometryBuffer.MODE_GL_LINES).uniforms = {
                diffuse: [0, 0, 0],
                u_overlayMap: this._emptyWireframeTexture
            };
        }
        return synthetic;
    }

    /**
     * Configures a synthetic buffer for a source/target tile pair.
     *
     * @internal
     * @hidden
     */
    private configureSyntheticBuffer(
        synthetic: GeometryBuffer,
        targetQK: string,
        sourceQK: string,
        sourceBuffer: GeometryBuffer
    ): void {
        // synthetic.type = sourceBuffer.type || 'Terrain';
        synthetic.pass = sourceBuffer.pass;
        synthetic.flat = sourceBuffer.flat;
        synthetic.depth = sourceBuffer.depth;
        synthetic.blend = sourceBuffer.blend;
        synthetic.clip = sourceBuffer.clip;
        synthetic.light = sourceBuffer.light;
        synthetic.idOffsets = sourceBuffer.idOffsets;
        synthetic.rayIntersects = sourceBuffer.rayIntersects;
        synthetic.pointerEvents = sourceBuffer.pointerEvents;


        synthetic.macroMask = undefined;
        // reset uniforms and copy from source.
        synthetic.clearUniformCache();
        for (const name in sourceBuffer.uniforms) {
            synthetic.addUniform(name, sourceBuffer.uniforms[name] as any);
        }

        // Per-tile source attribute references. Sharing the source model matrix is only valid
        // because the synthetic grid uses the same vertex quantization as the source mesh.
        const sourceAttributes = sourceBuffer.attributes;
        synthetic.attributes.a_modelMatrix = sourceAttributes.a_modelMatrix;
        synthetic.attributes.a_offset = sourceAttributes.a_offset;
        this.verifySourceQuantization(sourceBuffer);
        // synthetic.attributes.a_color = sourceAttributes.a_color || {value: [1, 1, 1, 1]};
        // synthetic.attributes.a_tangent = sourceAttributes.a_tangent || {value: [1, 0, 0]};

        // map the synthetic tile's UVs into the parent DEM texture.
        const heightMapRef = synthetic.heightMapRef as HeightMapReference;
        tileUtils.getQuadkeyOffset(sourceQK, targetQK, heightMapRef.transform);
        heightMapRef.terrainTileKey = HeightMapTileCache.quadkeyToKey(sourceQK);
        // Preserve the target geometry space for ancestor fallback transforms.
        heightMapRef.geometryTileKey = HeightMapTileCache.quadkeyToKey(targetQK);
        synthetic.terrainCache = this.terrainCache;
    }

    private getSyntheticTerrainBuffer(
        targetQK: string,
        sourceQK: string,
        sourceBuffer: GeometryBuffer
    ): GeometryBuffer {
        const sourceHeightMap = sourceBuffer.getHeightMap() || sourceBuffer.heightMap;
        // reuse the cached buffer when its source and heightmap are unchanged.
        const cached = this.syntheticCache.get(targetQK);
        if (cached && cached.sourceQK === sourceQK && cached.sourceHeightMap === sourceHeightMap) {
            return cached.buffer;
        }
        // release the old VAO before reconfiguring a changed source.
        if (cached) {
            this.releaseSyntheticBuffer(cached.buffer, cached.syntheticHeightMap);
        }
        const synthetic = cached?.buffer || this.syntheticPool.acquire();
        // apply source properties and the heightmap reference.
        this.configureSyntheticBuffer(synthetic, targetQK, sourceQK, sourceBuffer);

        this.syntheticCache.set(targetQK, {
            sourceQK,
            sourceHeightMap,
            buffer: synthetic,
            syntheticHeightMap: null
        });
        return synthetic;
    }
}
