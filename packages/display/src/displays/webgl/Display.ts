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

import BasicDisplay, {ViewportTile, TerrainStats} from '../BasicDisplay';
import {GLRender, RenderOptions} from './GLRender';
import GLBucket from './Bucket';

import {GeometryBufferFactory} from './buffer/factory/GeometryBufferFactory';
import {createImageBuffer} from './buffer/createImageBuffer';
import {transformMat4, create, subtract, dot, normalize} from 'gl-matrix/vec3';
import {transformMat4 as transformMat4Vec4} from 'gl-matrix/vec4';
import {invert} from 'gl-matrix/mat4';
import {Layer, Layers} from '../Layers';
import GLTile from './GLTile';
import {FeatureFactory} from './buffer/FeatureFactory';
import {CollisionHandler} from './CollisionHandler';
import {GeometryBuffer, RenderUsage} from './buffer/GeometryBuffer';
import {
    Color,
    CustomLayer,
    LinearGradient,
    TerrainTileLayer,
    Tile,
    TileLayer,
    tileUtils,
    RuntimeLayerStyle,
    webMercator
} from '@here/xyz-maps-core';
import {Raycaster} from './Raycaster';
import {initLightUniforms, ProcessedLights} from './lights';
import {CompiledUniformMap} from './program/Program';
import {RenderTile, RenderTilePool, RenderTileTarget} from './RenderTile';
import {HeightMapTileCache, HeightMapTileData, sampleHeightMap} from './HeightMapTileCache';
import {DisplayTileTask} from '../BasicTile';
import {PASS} from './RenderPass';
import {parseRGBA} from '../styleTools';
import {TerrainFBOPlanner} from './TerrainFBOPlanner';

import {GRID_PITCH_CLAMP, FIXED_TILE_PITCH_THRESHOLD} from './constants';

const PREVIEW_LOOK_AHEAD_LEVELS: [number, number] = [3, 9];

// const fromClipSpace = (clip, width, height) => [
//     (clip[0] + 1) / 2.0 * width,
//     (1 - clip[1]) / 2.0 * height // oriented top->down
// ];
// const toClipSpace = (x, y, z, width, height) => [
//     2 * x / width - 1,
//     -2 * y / height + 1,
//     z || 0
// ];

type RendereFeatureResult = {
    id: number | string | null;
    z: number;
    layer: TileLayer
};


export type CustomRenderData = {
    z: number;
    tiled: false;
    pass: number;
    buffer: {
        flat: boolean;
        zLayer?: number;
        zIndex?: number;
        pass?: number;
        pointerEvents?: boolean;
    };
    disableDepthTestOver3D?: boolean;
    renderTarget: RenderTileTarget;
    data: CustomLayer;
};

export type RenderData = CustomRenderData | RenderTile;

const PROCESSED_LIGHTS_SYMBOL = Symbol();

// max target groups encodable in the render sort key (11 bit).
const TARGET_SORT_RANK_MAX = 0x7ff;

class WebGlDisplay extends BasicDisplay {
    static zoomBehavior: 'fixed' | 'float' = 'float';

    private name: string = 'gl-test';

    render: GLRender;
    buckets: GLBucket;
    private readonly factory: FeatureFactory;
    private readonly collision: CollisionHandler;
    private rayCaster: Raycaster;
    private groundResolution: number;
    private terrainExaggeration: number = 1;
    private worldCenter: number[] = [0, 0];
    private worldSize: number;
    private renderTilePool: RenderTilePool = new RenderTilePool();
    private terrainFBOPlanner: TerrainFBOPlanner;
    // terrain quadkey -> offscreen FBO group rank, rebuilt on every sort.
    private readonly _fboSortRanks: Map<string, number> = new Map();
    private _zSortedTileBuffers: {
        tileBuffers: RenderData[],
        min3dZIndex: number,
        maxZIndex: number,
        needsTerrainOcclusion: boolean
    } = {
            tileBuffers: [],
            min3dZIndex: 0,
            maxZIndex: 0,
            needsTerrainOcclusion: false
        };
    // Current-frame DEM source tiles with CPU heightmaps for center-altitude raycasts.
    // Rebuilt by initLayerBuffers() and valid only for the current frame.
    private _terrainSourceTiles: RenderTile[] = [];
    // Normalized maximum horizon Y-coordinate.
    // This value represents the maximum vertical offset of the grid's horizon when maximum possible pitch applied.
    // The offset is normalized by dividing it by the total screen height.
    private maxHorizonY: number;
    // World-space position of the upper edge of the tile grid as seen at GRID_PITCH_CLAMP.
    // Used to determine `horizonY` when the map pitch exceeds the clamped grid pitch.
    private gridTopWorldAtPitchClamp: number[];
    // World-space position of the grid’s top edge calculated at FIXED_TILE_PITCH_THRESHOLD.
    // Used to compute `horizonYFixed` when the map pitch exceeds the fixed tile pitch limit.
    private gridTopWorldAtFixedTilePitch: number[];
    // Vertical screen-space offset (in pixels) from the top of the screen to the horizon line,
    // calculated using the grid position at the clamped pitch (GRID_PITCH_CLAMP).
    // This represents the horizon cutoff when the map pitch is above the maximum grid pitch clamp.
    protected horizonY: number;
    // Vertical screen-space offset (in pixels) from the top of the screen to the horizon line,
    // calculated using the grid position at the fixed tile pitch threshold (FIXED_TILE_PITCH_THRESHOLD).
    // This value is used to control horizon clipping when the map pitch exceeds the fixed tile pitch limit,
    // typically affecting the fixed (non-adaptive) tile grid rendering.
    protected horizonYFixed: number;

    private terrainCache: HeightMapTileCache;

    constructor(mapEl: HTMLElement, renderTileSize: number, devicePixelRatio: number | string, renderOptions?: RenderOptions) {
        super(
            mapEl,
            renderTileSize,
            // auto dpr is default for gl display
            !devicePixelRatio ? 'auto' : devicePixelRatio,
            new GLBucket(512),
            new GLRender(renderOptions),
            PREVIEW_LOOK_AHEAD_LEVELS
        );
        const display = this;
        const {render} = display;

        if (display.dpr < 2) {
            display.buckets.setMaxSize(display.buckets.getMaxSize() * 2);
        }

        display.terrainCache = new HeightMapTileCache();

        this.collision = new CollisionHandler(display);

        display.buckets.onDrop = function(buffers, index) {
            const {quadkey, layers} = this;
            display.collision.clearTile(quadkey, layers[index]);
            // debugger;
            display.releaseBuffers(buffers, quadkey);
        };


        render.init(display.canvas, display.dpr, display.terrainCache);

        display.rayCaster = new Raycaster(render.screenMat, render.invScreenMat);

        this.factory = new FeatureFactory(render.device, display.collision, display.dpr);

        this.terrainFBOPlanner = new TerrainFBOPlanner(
            display.terrainCache,
            render.maxTextureSize,
            this.render.device,
            (buf, hm) => render.releaseSyntheticTerrainBuffer(buf, hm)
        );
    }

    getFOV(): number {
        return this.render.fovRad;
    }

    private refreshTile(quadkey: string, layerId: string) {
        const dLayer = this.layers.get(layerId);
        if (dLayer) {
            const dTile = this.buckets.get(quadkey, true /* SKIP TRACK */);
            if (dTile) {
                const layer = <TileLayer>dLayer.layer;
                const {index} = dLayer;
                dTile.preview(index, false);
                dTile.ready(index, false);
                dTile.cancelTasks(layer);
                const tile = layer.getCachedTile(dTile.quadkey);
                if (tile) {
                    // tile processing is only necessary if it is still visible on screen.
                    if (this.getScreenTile(quadkey, dLayer)) {
                        this.handleTile(tile, layer, dTile, index);
                    }
                }
            }
        }
    }

    private releaseBuffers(buffers: GeometryBuffer[], quadkey: string) {
        const renderer = this.render;

        if (buffers) {
            for (let buf of buffers) {
                renderer.releaseGeometryBuffer(buf, quadkey);
            }
        }
    }

    private initLights(displayLayer: Layer) {
        const lightSets: {
            [l: string]: ProcessedLights
            [p: symbol]: { [u: string]: CompiledUniformMap }
        } = displayLayer.getLights();

        let processedLightSets = lightSets[PROCESSED_LIGHTS_SYMBOL];
        if (!processedLightSets) {
            // processedLightSets = {'default': defaultLightUniforms};
            processedLightSets = {};
            for (let name in lightSets) {
                const lightSet = lightSets[name];
                processedLightSets[name] = initLightUniforms(lightSet);
            }
            lightSets[PROCESSED_LIGHTS_SYMBOL] = processedLightSets;
        }
        this.render.processedLight[displayLayer.index] = processedLightSets;
    }

    private initSky(skyColor: Color | LinearGradient) {
        const color = this.factory.textureManager.getFillTexture(skyColor);
        this.render.setSkyColor(color);
    }

    addLayer(layer: TileLayer | CustomLayer, index: number, styles?: RuntimeLayerStyle): Layer {
        const displayLayer = super.addLayer(layer, index, styles);

        if (displayLayer) {
            if (layer instanceof TerrainTileLayer) {
                this.terrainCache.init(layer.tileSize, layer.getHeightmapPadding());
            }
        }

        if (displayLayer?.index == 0) {
            this.initSky(styles?.skyColor || [1, 0, 0, 1]);
        }
        // this.initLights(displayLayer);
        return displayLayer;
    }

    removeLayer(layer: TileLayer): number {
        const displayLayer = this.layers.get(layer);
        this.collision.removeTiles(displayLayer);
        this.render.processedLight[displayLayer.index] = undefined;
        return super.removeLayer(layer);
    }

    unproject(x: number, y: number, z?: number, inverseMatrix?: Float32Array): number[] {
        const useDefaultMatrix = !inverseMatrix;
        inverseMatrix ||= this.render.invScreenMat;

        if (typeof z == 'number') {
            const p = [x, y, z];
            transformMat4(p, p, inverseMatrix);
            // p[2] *= -1;
            return p;
        }
        // Intersect the default view with the terrain pivot plane so unproject(center) remains stable.
        // Custom grid matrices use z=0, the main view's terrainUnprojectZ does not apply to those coordinate spaces.
        const targetZ = useDefaultMatrix ? this.render.terrainUnprojectZ : 0;
        const p0 = [x, y, 0];
        const p1 = [x, y, 1];

        transformMat4(p0, p0, inverseMatrix);
        transformMat4(p1, p1, inverseMatrix);

        const z0 = p0[2];
        const z1 = p1[2];
        const t = z0 === z1 ? 0 : (targetZ - z0) / (z1 - z0);

        // linear interpolation
        return [p0[0] * (1 - t) + p1[0] * t, p0[1] * (1 - t) + p1[1] * t];
    }

    /**
     * Intersects the current screen ray with a horizontal plane at `targetZ`.
     * Used for terrain grid bounds and to preserve the screen-center anchor when the terrain pivot changes.
     *
     * @internal
     * @hidden
     */
    unprojectAtZ(x: number, y: number, targetZ: number): number[] {
        const inverseMatrix = this.render.invScreenMat;
        const p0 = [x, y, 0];
        const p1 = [x, y, 1];
        transformMat4(p0, p0, inverseMatrix);
        transformMat4(p1, p1, inverseMatrix);
        const z0 = p0[2];
        const z1 = p1[2];
        const t = z0 === z1 ? 0 : (targetZ - z0) / (z1 - z0);
        return [
            p0[0] * (1 - t) + p1[0] * t,
            p0[1] * (1 - t) + p1[1] * t
        ];
    }

    // from unprojected screen pixels to projected screen pixels
    project(
        x: number,
        y: number,
        z: number = 0,
        sx = this.sx,
        sy = this.sy,
        matrix: Float32Array | Float64Array = this.render.screenMat
    ): [number, number, number] {
        // x -= screenOffsetX;
        // y -= screenOffsetY;
        // const p = [x, y, 0];
        // const s = this.s;
        // const p = [x * s, y * s, 0];
        const p = [x - sx, y - sy, z];
        return transformMat4(p, p, matrix);
        // transformMat4(p, p, this.render.vPMats);
        // return fromClipSpace(p, this.w, this.h);
    }

    private updateHorizonOffsets(rotX: number): void {
        this.horizonY = this.calcHorizonYOffset(rotX);
        this.horizonYFixed = this.calcHorizonYOffset(rotX, this.gridTopWorldAtFixedTilePitch, FIXED_TILE_PITCH_THRESHOLD);
    }

    setSize(width: number, height: number) {
        super.setSize(width, height);
        this.initRenderer();
        const calcMaxPitchGridTopWorld = (pitch: number) => {
            // compute the terrain-independent grid extent at z=0.
            // zFar separately accounts for the pivot and lower visible terrain.
            const matrix = this.render.updateMapGridMatrix(pitch, width, height, 0);
            const inverseMatrix = invert([], matrix);
            return this.unproject(0, 1, null, inverseMatrix);
        };
        this.gridTopWorldAtPitchClamp = calcMaxPitchGridTopWorld(GRID_PITCH_CLAMP);
        this.gridTopWorldAtFixedTilePitch = calcMaxPitchGridTopWorld(FIXED_TILE_PITCH_THRESHOLD);

        this.maxHorizonY = this.calcHorizonYOffset(85 / 180 * Math.PI) / height;
        this.updateHorizonOffsets(this.rx);
    }

    setTransform(scale: number, rotZ: number, rotX: number) {
        // if (this.s != scale || this.rz != rotZ || this.rx != rotX)
        // {
        const PI2 = 2 * Math.PI;
        rotZ = (rotZ + PI2) % PI2;
        this.s = scale;
        this.rz = rotZ;

        if (this.rx != rotX) {
            this.updateHorizonOffsets(rotX);
        }
        this.rx = rotX;
        // }
    }

    setView(
        worldCenter: [number, number],
        scale: number,
        rotZ: number,
        rotX: number,
        groundResolution: number = this.groundResolution,
        worldSize: number = this.worldSize
    ) {
        super.setView(worldCenter, scale, rotZ, rotX, groundResolution, worldSize);

        this.groundResolution = groundResolution;
        this.worldCenter[0] = worldCenter[0];
        this.worldCenter[1] = worldCenter[1];
        this.worldSize = worldSize;

        this.initRenderer();
    }

    private initRenderer() {
        if (this.render.gl) {
            let terrainPivotAltitude = this.terrainPivotAltitude || 0;

            // Keep the grid plane near the pivot to limit the tile footprint; extend zFar
            // separately so valleys are not clipped before DEM stats become available.
            const terrainLayerAvailable = this.layers.getTerrainLayer() != null;
            const visibleMin = this.visibleTerrainElevation.hasStats
                ? this.visibleTerrainElevation.min
                : terrainPivotAltitude;
            const minTerrainForZFar = terrainLayerAvailable
                ? Math.min(visibleMin, 0)
                : visibleMin;

            this.render.initView(
                this.w,
                this.h,
                this.s,
                this.rx,
                this.rz,
                this.groundResolution,
                this.worldCenter[0],
                this.worldCenter[1],
                this.worldSize,
                terrainPivotAltitude,
                minTerrainForZFar
            );
        }
    }

    prepareTile(tile: Tile, data, layer: TileLayer, dTile: GLTile, onDone: (dTile: GLTile, layer: TileLayer) => void) {
        const display = this;
        const renderer = display.render;
        const tileSize = layer.tileSize;
        const {quadkey} = dTile;
        const layerId = layer.id;
        const displayLayer = this.layers.get(layerId);

        if (tile.type == 'image' && (data instanceof Image || data instanceof ImageBitmap)) {
            const terrainDisplayLayer = this.layers.getTerrainLayer();
            const isTerrainOverlay = terrainDisplayLayer != null && displayLayer !== terrainDisplayLayer;
            const buffer = createImageBuffer(data, renderer.device, tileSize, displayLayer.index > 0);
            if (isTerrainOverlay) {
                // route imagery into the terrain's offscreen FBO so it becomes part of the
                // overlay texture that is composited onto the terrain mesh surface.
                buffer.renderUsage = RenderUsage.TERRAIN_PREPASS;
            }
            // make sure image tiles are considered by global zIndex
            displayLayer.addZ(buffer.zIndex);
            dTile.preview(dTile.setData(layer, [buffer]), null);
            onDone(dTile, layer);
        } else if (data.length) {
            // } else if (Array.isArray(data)) {
            let task: DisplayTileTask;
            const completeTile = (geometryBuffers, pendingResources?) => {
                dTile.preview(dTile.setData(layer, geometryBuffers), null);

                if (pendingResources?.length) {
                    // Promise.all(pendingResources).then(()=>this.refreshTile(quadkey, layerId));
                    pendingResources.forEach((resource) => {
                        resource.then(() => this.refreshTile(quadkey, layerId));
                    });
                }

                const collisionsUpdated = display.collision.completeTile(true);
                if (collisionsUpdated) {
                    // trigger phase2 collision detection (fullscreen viewport)
                    this.dirty = true;
                }

                // clear previews of related parent/child tiles...
                let overlayingTiles = dTile.getOverlayingTiles();
                for (let overlayingTile of overlayingTiles) {
                    overlayingTile.preview(displayLayer.index, null);
                }

                if (task) {
                    if (task.outdated) {
                        task.outdated = false;
                        task.restart();
                    } else {
                        dTile.removeTask(task, layer);
                    }
                }

                onDone(dTile, layer);
            };

            task = GeometryBufferFactory.startTask(
                displayLayer,
                tile,
                dTile,
                this.factory,
                this.terrainCache,
                this.render.device,
                // on initTile / start
                () => display.collision.initTile(tile, displayLayer),
                // on done
                completeTile
            );
            dTile.addTask(task, layer);
        } else {
            dTile.preview(dTile.setData(layer, []), null);
            onDone(dTile, layer);
        }
    }

    // initAndOrderBuffers
    private orderBuffers(
        zSorted: RenderData[],
        buffers: (GeometryBuffer | CustomRenderData['buffer'])[],
        layer: Layer,
        absZOrder: {
            [intZ: string]: number
        },
        data: RenderTile['data'] | CustomRenderData['data'],
        tiled: boolean
    ): void {
        for (let buffer of buffers) {
            let {zLayer, zIndex} = buffer;

            zLayer ??= layer.getRenderIndex();
            const z = zLayer * 1e8 + zIndex * 10
                // make sure 3d geom is always drawn "after" 2d geom. even if same zIndex is used.
                // otherwise stencil conflicts are possible.
                + Number(!buffer.flat);

            absZOrder[z] = 0;

            let node: RenderTile | CustomRenderData;
            if (tiled) {
                node = this.renderTilePool.getNext();

                let pass = buffer.pass;

                if ((buffer as GeometryBuffer).needsAlphaDepthPass()) {
                    // insert an additional RenderTile for the alpha depth pass right before the color pass tile
                    const renderTileItem = this.renderTilePool.getNext().init(
                        buffer as GeometryBuffer,
                        z,
                        data as RenderTile['data'],
                        PASS.ALPHA_DEPTH,
                        layer
                    );
                    zSorted[zSorted.length] = renderTileItem;
                    // use the same buffer for the color pass, but mark it to be rendered in the alpha color pass
                    pass = PASS.ALPHA_COLOR;
                }

                node.init(buffer as GeometryBuffer, z, data as RenderTile['data'], pass, layer);
            } else {
                node = {
                    buffer,
                    z,
                    pass: buffer.pass,
                    data,
                    layer,
                    tiled,
                    renderTarget: RenderTileTarget.Display
                } as CustomRenderData;
            }
            zSorted[zSorted.length] = node;
        }
    }

    private initLayerBuffers(layers: Layers): {
        tileBuffers: RenderData[],
        min3dZIndex: number,
        maxZIndex: number,
        needsTerrainOcclusion: boolean
    } {
        const {buckets} = this;
        let tileBuffers: RenderData[] = [];
        let previewTiles: {
            [qk: string]: number[][]
        };
        let absZOrder = {};
        // with terrain enabled, create per-screen-tile render items so every terrain FBO
        // receives its data, otherwise only the first FBO is populated.
        const terrainDisplayLayer = layers.getTerrainLayer();

        for (let layer of layers) {
            const mayUseOffscreen = terrainDisplayLayer != null && layer !== terrainDisplayLayer;
            this.initLights(layer);

            let tiles = layer.tiles;
            // reset tile ready count
            layer.cnt = 0;

            previewTiles = {};

            if (!layer.layer.tiled) {
                layer.ready = true;
                const customLayer = <CustomLayer>layer.layer;
                const {renderOptions} = customLayer;
                this.orderBuffers(tileBuffers,
                    [{
                        zLayer: renderOptions.zLayer,
                        zIndex: renderOptions.zIndex,
                        pass: renderOptions.alpha || 1,
                        flat: customLayer.flat
                    }],
                    layer,
                    absZOrder,
                    <CustomLayer>layer.layer,
                    false
                );
                continue;
            }

            if (tiles) {
                let layerIndex = layer.index;
                let length = tiles.length;

                for (let screenTile of tiles) {
                    let dTile = <GLTile>screenTile.tile;
                    let buffers = dTile.getData(layer.index);

                    if (!layer.ready && dTile.ready(layerIndex) && ++layer.cnt == length) {
                        layer.ready = true;
                    }

                    if (!buffers) {
                        let previewData = dTile.preview(layerIndex);
                        if (previewData && previewData.length) {
                            for (let preview of previewData) {
                                const [previewQuadkey] = preview;
                                const tileStencil = tileUtils.getQuadkeyOffset(previewQuadkey, dTile.quadkey);

                                // retrieve preview buffers early so we can inspect
                                // renderUsage before deciding whether to deduplicate.
                                let previewTile = <GLTile>buckets.get(previewQuadkey, true /* SKIP TRACK */);
                                let previewBuffers = previewTile?.getData(layerIndex);

                                // create per-screen-tile items only for layers with TERRAIN_PREPASS buffers.
                                const needsSeparateItems = mayUseOffscreen && previewBuffers?.some(
                                    (b) => b.renderUsage === RenderUsage.TERRAIN_PREPASS
                                );

                                if (previewTiles[previewQuadkey]) {
                                    if (!needsSeparateItems) {
                                        // normal screen-only preview -> accumulate stencils for a single draw.
                                        previewTiles[previewQuadkey].push(tileStencil);
                                        continue;
                                    }
                                } else {
                                    previewTiles[previewQuadkey] = [tileStencil];
                                }

                                if (previewBuffers?.length) {
                                    this.orderBuffers(
                                        tileBuffers,
                                        previewBuffers,
                                        layer,
                                        absZOrder,
                                        {
                                            tile: screenTile,
                                            preview,
                                            stencils: needsSeparateItems
                                                ? [tileStencil]
                                                : previewTiles[previewQuadkey]
                                        },
                                        true
                                    );
                                }
                            }
                        }
                    } else if (buffers.length) {
                        this.orderBuffers(tileBuffers, buffers, layer, absZOrder, {tile: screenTile}, true);
                    }
                }
            }
        }

        // per-tile terrain FBO assignment
        if (terrainDisplayLayer) {
            const result = this.terrainFBOPlanner.plan(
                tileBuffers,
                terrainDisplayLayer,
                this.renderTilePool,
                this.zoom
            );
            this._terrainSourceTiles = result.terrainSourceTiles;
            this.render.fboSizes = result.fboSizes;
            this.render.fboContentHashes = result.fboContentHashes;
        } else {
            this.terrainFBOPlanner.reset();
            this._terrainSourceTiles = [];
            this.render.fboSizes = null;
            this.render.fboContentHashes = null;
        }

        // Compact Z-order independently for screen and terrain-FBO targets. Offscreen items have their own depth buffer
        // and must not consume depth slots used by display items. The target bit in the render sort key
        // still keeps both groups in the required order (offscreen before display).
        const SCREEN_Z = 1;
        const OFFSCREEN_Z = 2;

        for (let zTile of tileBuffers) {
            const isOffscreen = zTile.tiled && zTile.renderTarget === RenderTileTarget.OffscreenTerrain;
            absZOrder[zTile.z] |= isOffscreen ? OFFSCREEN_Z : SCREEN_Z;
        }

        const offscreenZOrder: { [intZ: string]: number } = {};
        let screenRank = 0;
        let offscreenRank = 0;

        for (let z of Object.keys(absZOrder).sort((a, b) => Number(a) - Number(b))) {
            const targetMask = absZOrder[z];
            if (targetMask & SCREEN_Z) {
                absZOrder[z] = screenRank++;
            }
            if (targetMask & OFFSCREEN_Z) {
                offscreenZOrder[z] = offscreenRank++;
            }
        }

        const maxZIndex = screenRank;
        const supportsTerrainOcclusion = this.render.supportsTerrainOcclusion();
        let min3dZIndex = Infinity;
        let needsTerrainOcclusion = false;

        for (let i = 0, z; i < tileBuffers.length; i++) {
            const zTile = tileBuffers[i];

            if (zTile.tiled) {
                zTile.prepareHeightMapReferences();

                needsTerrainOcclusion ||= supportsTerrainOcclusion &&
                    zTile.renderTarget === RenderTileTarget.Display &&
                    zTile.isTerrainOcclusionCandidate();
            }

            const isOffscreen = zTile.tiled
                && zTile.renderTarget === RenderTileTarget.OffscreenTerrain;

            z = zTile.z = isOffscreen ? offscreenZOrder[zTile.z] : absZOrder[zTile.z];

            // only onscreen 3D geometry participates in the display depth hierarchy.
            if (!isOffscreen && !zTile.buffer.flat && z < min3dZIndex) {
                // if (!zTile.buffer.flat && z < min3dZIndex && !zTile.buffer.isPointBuffer() ) {
                min3dZIndex = z;
            }
        }

        return {tileBuffers, min3dZIndex, maxZIndex, needsTerrainOcclusion};
    }

    protected getCamGroundPositionScreen() {
        const {cameraWorld} = this.render;
        return this.project(cameraWorld[0], cameraWorld[1], this.terrainPivotAltitude ?? 0);
    }

    protected getHorizonYOffset(): number {
        return this.horizonY; // = this.calcHorizonYOffset();
    }

    private isPointAboveFlatFixedCoverage(x: number, y: number, tolerance: number = 0): boolean {
        if (this.rx < FIXED_TILE_PITCH_THRESHOLD) return false;
        const getFlatGridCoverageMatrix = (): Float64Array => {
            const {w, h, rx, rz} = this;
            const flatGridCoverageMatrix = new Float64Array(16);
            flatGridCoverageMatrix.set(this.render.updateMapGridMatrix(rx, w, h, 0, rz));
            return flatGridCoverageMatrix;
        };

        const yNdc = this.project(x, y, 0, 0, 0, getFlatGridCoverageMatrix())[1];
        const screenY = (1 - yNdc) * this.h / 2;
        return screenY < this.horizonYFixed - tolerance;
    }

    private calcHorizonYOffset(
        pitch: number = this.rx,
        gridTopWorld: number[] = this.gridTopWorldAtPitchClamp,
        maxPitch: number = GRID_PITCH_CLAMP
    ) {
        let horizonY = 0;
        if (pitch > maxPitch) {
            const {w, h} = this;
            // keep horizon/grid cutoff terrain-independent. gridTopWorld is computed
            // with pivotZ=0, so it must be projected with pivotZ=0 as well.
            const matrix = this.render.updateMapGridMatrix(pitch, w, h, 0);
            const y = this.project(gridTopWorld[0], gridTopWorld[1], 0, 0, 0, matrix)[1];
            horizonY = (1 - y) * h / 2;
        }
        return horizonY;
    }

    getCameraToCenterDistance(): number {
        return this.render.distanceCam2Center;
    }

    protected useLODTiles(): boolean {
        return this.rx > FIXED_TILE_PITCH_THRESHOLD;
    }

    /**
     * Raycast terrain mesh at screen center to get accurate terrain altitude.
     * Called within viewport() after initLayerBuffers() so mesh data is available.
     * Returns real (non-exaggerated) altitude in meters, or 0 if no terrain hit.
     *
     * @internal
     * @hidden
     */
    getTerrainCenterAltitude(): number | null {
        const terrainLayer = this.layers.getTerrainLayer()?.layer as TileLayer;
        if (!terrainLayer) return null;

        const cx = this.w / 2;
        const cy = this.h / 2;
        this.rayCaster.beginPick(cx, cy, this.w, this.h, this.s, 1 / this.groundResolution, this.terrainExaggeration);


        // const {tileBuffers} = this._zSortedTileBuffers;
        // const currentScreenTile = {quadkey: null, worldTileSize: null, x: 0, y: 0};
        // for (let i = tileBuffers.length - 1; i >= 0; i--) {
        //     const renderTile = tileBuffers[i] as RenderTile;
        //     const {buffer, data, layer} = renderTile;
        //     if (terrainLayer !== (layer.layer as TileLayer)) continue;

        // raycast only the real DEM source tiles (few, with CPU heightmap data) rather than
        // the many synthetic display-zoom tiles. A single center ray needs just one hit.
        const tileBuffers = this._terrainSourceTiles;
        const currentScreenTile = {quadkey: null, worldTileSize: null, x: 0, y: 0};

        for (let i = tileBuffers.length - 1; i >= 0; i--) {
            const renderTile = tileBuffers[i];
            const {data} = renderTile;
            if (!tileBuffers[i].tiled || !tileBuffers[i].buffer.pointerEvents) continue;
            // // only consider the main terrain mesh tiles (not offscreen / on-terrain-surface tiles)
            // if (renderTile.renderTarget === RenderTileTarget.OffscreenTerrain) continue;

            // initialize the model matrix before the AABB test; rendering normally sets it later.
            // the subsequent transform call is skipped because the matrix is already initialized.
            let screenTile = data.tile;
            currentScreenTile.quadkey = screenTile.quadkey;
            currentScreenTile.worldTileSize = screenTile.worldTileSize;
            this.grid.initTileScreenXY(currentScreenTile, screenTile.gridX, screenTile.gridY, screenTile.gridZ);

            renderTile.applyViewportTileTransform(currentScreenTile, true);

            if (!this.intersectTileAABB(renderTile)) continue;

            this.rayCaster.intersect(renderTile);
        }

        const result = this.rayCaster.getIntersectionTop();

        if (!result?.pointWorld) return null;
        // real meters (de-exaggerated by getIntersectionTop)
        return result.pointWorld[2];
    }

    private refreshGrid() {
        this.initRenderer();
        this.updateGrid(this.tileGridZoom, this.zoom, this.sx, this.sy);
    }

    protected viewport(dirty?: boolean) {
        const display = this;
        const {layers, render} = display;

        if (display.dirty) {
            display.dirty = false;
            display.updateCollisions();
        }
        render.fixedView = Number(!this.viewChange);

        this.renderTilePool.beginFrame();

        this._zSortedTileBuffers = this.initLayerBuffers(layers);

        const terrainLayerEntry = this.layers.getTerrainLayer();
        const terrainTileLayer = terrainLayerEntry?.layer as TerrainTileLayer | undefined;
        const terrainStyle = terrainTileLayer?.getStyle();
        const exaggeration = terrainStyle?.exaggeration ?? 1;
        // set exaggeration first (raycasting needs it)
        this.terrainExaggeration = exaggeration;

        // establish terrain pivot once on first detection.
        // the pivot is the orbit/rotation center used for pitch. It stays fixed during interaction.
        // updates happen only via explicit calls (map.updateTerrainPivot()) at gesture end or center change.
        if (terrainLayerEntry && (this.terrainPivotAltitude === null /* || this._updateTerrainPivotPending*/)) {
            const freshAlt = this.getTerrainCenterAltitude();
            if (freshAlt != null && freshAlt >= 0) {
                this.terrainPivotAltitude = freshAlt;
                // rebuild tiles with the corrected pivot. This updates the grid synchronously,
                // so the current frame can render the correct tiles.
                this.refreshGrid();
                // re-init layer buffers with the updated tile set.
                this._zSortedTileBuffers = this.initLayerBuffers(layers);
            }
        }

        const {tileBuffers, min3dZIndex, maxZIndex, needsTerrainOcclusion} = this._zSortedTileBuffers;

        const backgroundColor = display.layers[0]?.getBackgroundColorRGBA(display.zoom)
            || parseRGBA(this.globalBgc, display.zoom);

        render.beginFrame(
            backgroundColor,
            this.layers.getTerrainColor(display.zoom),
            exaggeration,
            terrainStyle?.material
        );
        render.drawSky(this.horizonY, this.h, this.maxHorizonY);

        render.zIndexLength = maxZIndex;

        // fill the depthbuffer with real depth values for the ground plane.
        // render.initGroundDepth(this.grid.minX, this.grid.minY, Math.max(this.grid.maxX - this.grid.minX, this.grid.maxY - this.grid.minY));

        const sortTileBuffers: (RenderData & { _sortKey?: number }) [] = tileBuffers;
        const terrainDisplayLayer = this.layers.getTerrainLayer();
        // group offscreen items by destination FBO (terrain quadkey). FBO order is independent.
        // preserving z/pass order within each group avoids unnecessary framebuffer switches.
        const fboRanks = this._fboSortRanks;
        fboRanks.clear();

        for (const tb of sortTileBuffers) {
            const usesOffscreen = tb.renderTarget === RenderTileTarget.OffscreenTerrain;

            // terrain-fallback imagery (TERRAIN_PREPASS on Display) must keep depth test
            // enabled so it renders behind already-loaded terrain meshes.
            const isTerrainFallback = !usesOffscreen && tb.tiled
                && (tb.buffer as GeometryBuffer).renderUsage === RenderUsage.TERRAIN_PREPASS;
            tb.disableDepthTestOver3D = (tb.buffer.flat && tb.z > min3dZIndex) && !usesOffscreen && !isTerrainFallback;


            // Flat (2D) render items above 3D content must be drawn after 3D and with depth testing disabled.
            if (tb.disableDepthTestOver3D && tb.pass == PASS.OPAQUE) {
                tb.pass = PASS.ALPHA_COLOR;
            }

            // [ Target(11bit) | Z(23bit) | Pass(3bit) | TerrainDetail(5bit) ]
            // encoded as numeric key (fits well within the 53bit exact integer range).
            // offscreen targets use ranks 0..2046; the screen target is 2047 so it renders last.
            const passOrder = tb.pass === PASS.OPAQUE ? 0 : tb.pass === PASS.ALPHA_DEPTH ? 1 : 2;
            let terrainDetailRank = 0;
            let targetRank = TARGET_SORT_RANK_MAX; // on screen
            if (tb.tiled) {
                const terrainQK = tb.data.terrainTileQuadkey || tb.data.tile.quadkey;
                const isTerrainHierarchy = tb.layer === terrainDisplayLayer
                    || isTerrainFallback
                    || (usesOffscreen && tb.buffer.renderUsage === RenderUsage.TERRAIN_PREPASS);
                if (isTerrainHierarchy) {
                    terrainDetailRank = Math.min(31, terrainQK.length);
                }
                if (usesOffscreen) {
                    let rank = fboRanks.get(terrainQK);
                    if (rank === undefined) {
                        rank = Math.min(TARGET_SORT_RANK_MAX - 1, fboRanks.size);
                        fboRanks.set(terrainQK, rank);
                    }
                    targetRank = rank;
                }
            }
            tb._sortKey = (((targetRank * 0x00800000 + (tb.z & 0x007fffff)) * 8 + passOrder) * 32) + terrainDetailRank;
        }
        sortTileBuffers.sort((a, b) => a._sortKey - b._sortKey);


        if (needsTerrainOcclusion) {
            const offscreenItems: RenderData[] = [];
            const terrainItems: RenderData[] = [];
            const regularItems: RenderData[] = [];
            const occlusionItems: RenderData[] = [];

            for (const item of tileBuffers) {
                if (!item.tiled) {
                    regularItems.push(item);
                    continue;
                }

                if (item.renderTarget === RenderTileTarget.OffscreenTerrain) {
                    offscreenItems.push(item);
                    continue;
                }

                const isTerrainBase = item.buffer.isTerrainSurface()
                    || item.buffer.renderUsage === RenderUsage.TERRAIN_PREPASS;


                (isTerrainBase
                    ? terrainItems
                    : item.isTerrainOcclusionCandidate()
                        ? occlusionItems
                        : regularItems
                ).push(item);
            }

            render.renderTargetPasses(offscreenItems);
            render.renderTargetPasses(terrainItems);
            render.captureTerrainDepth();
            render.renderTargetPasses(regularItems);
            render.renderTargetPasses(occlusionItems);
        } else {
            render.renderTargetPasses(tileBuffers);
        }

        if (render.tileGrid) {
            for (let screenTile of display.tiles) {
                for (let layer of display.layers) {
                    if (!layer.skipDbgGrid && layer.tiles.indexOf(screenTile) !== -1) {
                        render.drawGrid(screenTile.x, screenTile.y, <GLTile>screenTile.tile, screenTile.worldTileSize);
                        break;
                    }
                }
            }
        }

        this.render.endFrame();
        this.renderTilePool.endFrame();
    }

    private updateCollisions() {
        this.collision.update(this.tiles,
            // make sure display will refresh in case of cd toggles visibility
            () => this.update()
        );
    }

    destroy() {
        this.terrainFBOPlanner.destroy();
        super.destroy();
        this.render.destroy();
        this.factory.destroy();
    }

    getTerrainHeightAtWorldXY(x: number, y: number, exaggerated: boolean = true): number {
        const tileBuffers = this._terrainSourceTiles;
        let i = tileBuffers.length;
        const currentScreenTile = {quadkey: null, worldTileSize: null, x: 0, y: 0};

        while (i--) {
            const renderTile = tileBuffers[i];
            const heightMap = renderTile.buffer.heightMap?.data;
            if (!heightMap) continue;

            const viewportTile: ViewportTile = renderTile.data.tile;
            const worldTileSize = viewportTile.worldTileSize;
            // re-compute screen position for the source tile
            currentScreenTile.quadkey = viewportTile.quadkey;
            currentScreenTile.worldTileSize = worldTileSize;

            this.grid.initTileScreenXY(currentScreenTile, viewportTile.gridX, viewportTile.gridY, viewportTile.gridZ);

            // World-to-tile: the world point relative to the tile's screen origin
            const localTileX = x - currentScreenTile.x;
            const localTileY = y - currentScreenTile.y;

            // is outside?
            if (localTileX < 0 || localTileY < 0 || localTileX > worldTileSize || localTileY > worldTileSize) continue;

            const normalizedTileX = localTileX / worldTileSize;
            const normalizedTileY = localTileY / worldTileSize;
            const hmData = renderTile.buffer.heightMap;
            const hmSize = hmData.size || Math.round(Math.sqrt(heightMap.length));
            const hmTileSize = hmData.tileSize || worldTileSize;
            const rawHeight = sampleHeightMap(heightMap, hmSize, hmTileSize, normalizedTileX * hmTileSize, normalizedTileY * hmTileSize,
                0, 0, 1, hmData.padding || 0);

            return exaggerated ? rawHeight * this.terrainExaggeration : rawHeight;
        }
        return null;
    }

    /**
     * Returns terrain height at geographic coordinates from the persistent heightmap cache.
     * Frustum-independent; works even when the tile is not rendered.
     *
     * @internal
     * @hidden
     */
    private _getTerrainPointHeight(lon: number, lat: number,
        terrainLayer: TileLayer,
        exaggerated: boolean
    ): number | null {
        const cache = this.terrainCache;
        if (!cache.size) return null;

        const terrainTileSize = terrainLayer.tileSize;
        const maxDataZoom = terrainLayer.maxDataZoom;
        const startZoom = Math.min(maxDataZoom, 20);
        const numTiles = 1 << startZoom;
        const worldSize = numTiles * terrainTileSize;

        const projectedX = webMercator.lon2x(lon, worldSize);
        const pixelX = ((projectedX % worldSize) + worldSize) % worldSize;
        const projectedY = webMercator.lat2y(lat, worldSize);
        const pixelY = Math.max(0, Math.min(worldSize - Number.EPSILON, projectedY));

        let tileX = Math.floor(pixelX / terrainTileSize);
        let tileY = Math.floor(pixelY / terrainTileSize);
        let zoom = startZoom;

        // check the exact tile at min(maxDataZoom, 20), then walk up its ancestors.
        // direct XYZ lookups avoid quadkey conversion and keep numeric keys in range.
        while (zoom >= 0) {
            const hmData = cache.getByTile(zoom, tileX, tileY);
            if (hmData?.data) {
                // compute local pixel position within this tile.
                const tileWorldSize = (1 << zoom) * terrainTileSize;
                const tileAbsPixelX = tileX * terrainTileSize;
                const tileAbsPixelY = tileY * terrainTileSize;
                const localX = (pixelX / worldSize) * tileWorldSize - tileAbsPixelX;
                const localY = (pixelY / worldSize) * tileWorldSize - tileAbsPixelY;

                const hmSize = hmData.size || Math.round(Math.sqrt(hmData.data.length));
                const hmTileSize = hmData.tileSize || terrainTileSize;
                const rawHeight = sampleHeightMap(
                    hmData.data, hmSize, hmTileSize,
                    (localX / terrainTileSize) * hmTileSize,
                    (localY / terrainTileSize) * hmTileSize,
                    0, 0, 1, hmData.padding || 0
                );
                return exaggerated ? rawHeight * this.terrainExaggeration : rawHeight;
            }
            zoom--;
            tileX = Math.floor(tileX / 2);
            tileY = Math.floor(tileY / 2);
        }
        return null;
    }

    /**
     * Returns exaggerated terrain height at geographic coordinates from the persistent cache,
     * independently of frustum visibility.
     *
     * @param lon Longitude in degrees.
     * @param lat Latitude in degrees.
     * @returns Height in meters, or null if unavailable.
     *
     * @internal
     * @hidden
     */
    getTerrainPointHeight(lon: number, lat: number,
        terrainLayer: TileLayer = this.layers.getTerrainLayer()?.layer as TileLayer
    ): number | null {
        if (!terrainLayer) return null;
        return this._getTerrainPointHeight(lon, lat, terrainLayer, true);
    }

    getTerrainRegionMaxHeight(lon: number, lat: number,
        terrainLayer: TileLayer = this.layers.getTerrainLayer()?.layer as TileLayer
    ): number | null {
        if (!terrainLayer) return null;
        // use the ElevationQuadTree only as a conservative upper bound for zoom
        // clamping. the "available" flag excludes the terrain pivot fallback.
        const terrainTileSize = terrainLayer.tileSize;
        const maxDataZoom = terrainLayer.maxDataZoom;
        const numTiles = 1 << maxDataZoom;
        const worldSize = numTiles * terrainTileSize;
        const projectedX = webMercator.lon2x(lon, worldSize);
        const pixelX = ((projectedX % worldSize) + worldSize) % worldSize;
        const projectedY = webMercator.lat2y(lat, worldSize);
        const pixelY = Math.max(0, Math.min(worldSize - Number.EPSILON, projectedY));
        const tileX = Math.floor(pixelX / terrainTileSize);
        const tileY = Math.floor(pixelY / terrainTileSize);
        const stats = this.getTerrainHeight(maxDataZoom, tileX, tileY);
        return stats.available && Number.isFinite(stats.max) ? stats.max : null;
    }

    getRenderedFeatureAt(x: number, y: number, layers?: TileLayer[]): RendereFeatureResult {
        // measureStart('raycast');
        this.rayCaster.beginPick(x, y, this.w, this.h, this.s, 1 / this.groundResolution, this.terrainExaggeration,
            this.render.supportsTerrainOcclusion()
        );

        let intersectLayer: Layer = null;
        // const camWorldZ = this.rayCaster.origin[2] + 0.001;
        const {tileBuffers, min3dZIndex} = this._zSortedTileBuffers;
        let i = tileBuffers.length;

        const terrainTileLayer: TileLayer = this.layers.getTerrainLayer()?.layer as TileLayer;
        if (terrainTileLayer && (layers?.indexOf(terrainTileLayer) === -1 || !terrainTileLayer.pointerEvents())) {
            // If terrain is excluded from picking, prepare its hit so offscreen terrain features
            // can pass the hasTerrainHitForTile check.
            while (i--) {
                const renderTile = tileBuffers[i];
                if (renderTile.tiled && renderTile.buffer.type === 'Terrain' &&
                    renderTile.renderTarget !== RenderTileTarget.OffscreenTerrain &&
                    (!renderTile.buffer.needsAlphaDepthPass() || renderTile.pass === PASS.ALPHA_COLOR) &&
                    this.intersectTileAABB(renderTile)) {
                    this.rayCaster.prepareTerrainHit(renderTile);
                }
            }
        }
        i = tileBuffers.length;

        while (i--) {
            if (!tileBuffers[i].tiled || !tileBuffers[i].buffer.pointerEvents) continue; // skip custom layers

            const renderTile: RenderTile = tileBuffers[i] as RenderTile;
            let {buffer, z, data, layer} = renderTile;

            if (buffer.pointerEvents === false ||
                layers?.indexOf(layer.layer as TileLayer) == -1 ||
                // only use color pass for buffers that require multi pass rendering
                (buffer.needsAlphaDepthPass() && renderTile.pass != PASS.ALPHA_COLOR)
            ) continue;

            const isOnTopOf3d = buffer.flat && z > min3dZIndex;
            const isOffscreenTerrain = renderTile.renderTarget === RenderTileTarget.OffscreenTerrain;

            if (buffer.flat && !isOnTopOf3d && !isOffscreenTerrain) {
                // skip flat/2d buffers for now. will be evaluated later on data level.
                continue;
            }

            let {x: tileX, y: tileY} = data.tile;

            if (isOffscreenTerrain && !this.rayCaster.hasTerrainHitForTile(tileX, tileY)) {
                continue;
            }
            // early-out AABB test to avoid costly buffer intersections.
            // skip for offscreen tiles: their model matrix is in terrain-tile-local space (not world space),
            // so the AABB test would give incorrect results. Spatial filtering for offscreen tiles
            // is handled by hasTerrainHitForTile and intersectWithLocalOrthoRay.
            if (!isOffscreenTerrain && !this.intersectTileAABB(renderTile)) {
                continue;
            }

            const id = this.rayCaster.intersect(renderTile, isOnTopOf3d);

            if (id != null) {
                intersectLayer = layer;
                if (isOnTopOf3d) break;
            }
        }

        const result = <RendereFeatureResult><unknown> this.rayCaster.getIntersectionTop();
        result.layer = intersectLayer?.layer as TileLayer;
        // measureEnd('raycast');
        this.viewport(true);
        return result;
    }

    private _tmpAABB = {min: [0, 0, 0], max: [0, 0, 0]};
    private _tileClipA = new Float64Array(16 * 3);
    private _tileClipB = new Float64Array(16 * 3);

    private intersectTileAABB(renderTile: RenderTile): boolean {
        const buffer = renderTile.buffer;
        const localTileSize = renderTile.layer.tileSize;

        const worldModelMatrix = renderTile.getModelMatrix();
        const aabb = this._tmpAABB;
        aabb.min[0] = 0;
        aabb.min[1] = 0;
        aabb.min[2] = (buffer.zRange?.[0] ?? 0) * this.terrainExaggeration;
        aabb.max[0] = localTileSize;
        aabb.max[1] = localTileSize;
        aabb.max[2] = buffer.zRange?.[1] != null
            ? buffer.zRange[1] * this.terrainExaggeration
            // without zRange, cap maxZ just above the camera to keep the AABB bounded and improve ray-intersection precision.
            : this.rayCaster.origin[2] + 0.001;

        const aabbMin = transformMat4(aabb.min, aabb.min, worldModelMatrix);
        const aabbMax = transformMat4(aabb.max, aabb.max, worldModelMatrix);
        // model matrices use positive uniform scaling and translation, so transformed
        // min/max corners remain ordered and need no per-axis reordering.
        return this.rayCaster.intersectAABBox(
            aabbMin[0], aabbMin[1], aabbMin[2],
            aabbMax[0], aabbMax[1], aabbMax[2]
        ) !== null;
    }

    private enforceTerrainFBOZoomIfNeeded(): boolean {
        const {zoom, terrainFBOPlanner} = this;
        const isNeeded = terrainFBOPlanner.needsFBOZoomEnforcement(zoom);
        if (isNeeded) {
            terrainFBOPlanner.markFBOZoomEnforced(zoom);
            this.render.invalidateTerrainFBOs();
        }
        return isNeeded;
    }

    viewChangeDone() {
        this.viewChange = false;
        this.enforceTerrainFBOZoomIfNeeded();
        this.update();
    }

    scaleOffsetXYByAltitude(pointWorld: number[]): number {
        const mat = this.render.vPMat;
        return 1.0 - (pointWorld[2] * mat[11]) / (mat[3] * pointWorld[0] + mat[7] * pointWorld[1] + mat[15]);
    }

    protected setZoom(zoomLevel: number): boolean {
        if (super.setZoom(zoomLevel)) {
            this.buckets.forEach((tile: GLTile) => {
                for (let layerBuffers of tile.data) {
                    if (layerBuffers) {
                        for (let buffer of layerBuffers) {
                            buffer.clearUniformCache();
                        }
                    }
                }
            });
            return true;
        }
    }

    computeDistanceScale(x: number, y: number, z: number = 0): number {
        // screenMat already contains the terrain pivot in its view matrix.
        // z is an absolute world/terrain altitude in meters and must not be offset by terrainPivotAltitude again.
        const mat = this.render.screenMat;
        const px = x - this.sx;
        const py = y - this.sy;
        const rw = mat[3] * px + mat[7] * py + mat[11] * z + mat[15];
        return rw / this.render.distanceCam2Center;
    }


    private getClipDistance(
        plane: number,
        x: number,
        y: number,
        w: number,
        width: number,
        height: number,
        margin: number = 0
    ): number {
        switch (plane) {
        case 0:
            return w; // near / in front of camera
        case 1:
            return x + margin * w; // left
        case 2:
            return (width + margin) * w - x; // right
        case 3:
            return y + margin * w; // top
        default:
            return (height + margin) * w - y; // bottom
        }
    }

    private isProjectedTileVisible(
        vertices: Float64Array,
        count: number,
        width: number,
        height: number,
        margin: number = 0
    ): boolean {
        let src: Float64Array = vertices;
        let dst: Float64Array = src === this._tileClipA ? this._tileClipB : this._tileClipA;

        for (let plane = 0; plane < 5; plane++) {
            let outCount = 0;
            let si = (count - 1) * 3;
            let sx = src[si];
            let sy = src[si + 1];
            let sw = src[si + 2];
            let sd = this.getClipDistance(plane, sx, sy, sw, width, height, margin);

            for (let i = 0; i < count; i++) {
                const ei = i * 3;
                const ex = src[ei];
                const ey = src[ei + 1];
                const ew = src[ei + 2];
                const ed = this.getClipDistance(plane, ex, ey, ew, width, height, margin);

                if ((sd > 0) !== (ed > 0)) {
                    const t = sd / (sd - ed);
                    const oi = outCount++ * 3;
                    dst[oi] = sx + (ex - sx) * t;
                    dst[oi + 1] = sy + (ey - sy) * t;
                    dst[oi + 2] = sw + (ew - sw) * t;
                }

                if (ed > 0) {
                    const oi = outCount++ * 3;
                    dst[oi] = ex;
                    dst[oi + 1] = ey;
                    dst[oi + 2] = ew;
                }

                sx = ex;
                sy = ey;
                sw = ew;
                sd = ed;
            }

            if (!outCount) return false;

            count = outCount;
            const tmp: Float64Array = src;
            src = dst;
            dst = tmp;
        }

        return true;
    }


    /**
     * Conservatively culls terrain tiles against the perspective viewport.
     *
     * GridTile.intersects() checks only the unprojected 2D footprint. This method projects the four XY corners at
     * min/max heights and culls the tile only when all tested points lie outside one homogeneous clip plane.
     * Flat tiles use polygon clipping; height ranges are handled conservatively.
     * A small guard band prevents holes caused by precision or incomplete DEM stats.
     *
     * @internal
     * @hidden
     */
    isTileOutsideViewport(tileX: number, tileY: number, minZ: number, maxZ: number, tileSize: number): boolean {
        const mat = this.render.screenMat;
        const sx = this.sx;
        const sy = this.sy;
        const w = this.w;
        const h = this.h;

        const terrainPivotAltitude = this.terrainPivotAltitude || 0;
        const terrainEnabled = terrainPivotAltitude > 0;
        // Culling only optimizes loading; a small screen-space guard band prevents
        // edge holes from precision errors or incomplete terrain stats.
        const margin = terrainEnabled ? 32 : 1;

        if (terrainEnabled) {
            // include the pivot altitude so near-camera terrain is not culled at sea level
            // while child-tile stats are missing or delayed.
            const pivotZ = terrainPivotAltitude || 0;
            minZ = Math.min(minZ, pivotZ);
            maxZ = Math.max(maxZ, pivotZ);
        }

        let allRight = true;
        let allLeft = true;
        let allBelow = true;
        let allAbove = true;
        let allBehind = true;

        const x1 = tileX;
        const y1 = tileY;
        const x2 = tileX + tileSize;
        const y2 = tileY + tileSize;

        if (maxZ === minZ) {
            const z = minZ;
            const mzx = mat[8] * z + mat[12];
            const mzy = mat[9] * z + mat[13];
            const mzw = mat[11] * z + mat[15];
            const vertices = this._tileClipA;

            for (let i = 0; i < 4; i++) {
                // Sutherland-Hodgman needs clockwise polygon order; the usual AABB bit order
                // would create a self-intersecting bow-tie.
                const px = (i === 0 || i === 3 ? x1 : x2) - sx;
                const py = (i < 2 ? y1 : y2) - sy;
                const vi = i * 3;
                vertices[vi] = mat[0] * px + mat[4] * py + mzx;
                vertices[vi + 1] = mat[1] * px + mat[5] * py + mzy;
                vertices[vi + 2] = mat[3] * px + mat[7] * py + mzw;
            }

            return !this.isProjectedTileVisible(vertices, 4, w, h, margin);
        }

        for (let zi = 0, zCount = maxZ === minZ ? 1 : 2; zi < zCount; zi++) {
            const z = zi ? maxZ : minZ;
            const mzx = mat[8] * z + mat[12];
            const mzy = mat[9] * z + mat[13];
            const mzw = mat[11] * z + mat[15];

            for (let i = 0; i < 4; i++) {
                const px = ((i & 1) ? x2 : x1) - sx;
                const py = ((i & 2) ? y2 : y1) - sy;

                const rx = mat[0] * px + mat[4] * py + mzx;
                const ry = mat[1] * px + mat[5] * py + mzy;
                const rw = mat[3] * px + mat[7] * py + mzw;

                if (rw > 0) allBehind = false;
                if (rx + margin * rw >= 0) allLeft = false;
                if (rx <= (w + margin) * rw) allRight = false;
                if (ry + margin * rw >= 0) allAbove = false;
                if (ry <= (h + margin) * rw) allBelow = false;
            }
        }

        return allBehind || allRight || allLeft || allBelow || allAbove;
    }

    /**
     * Precomputed viewport corner rays for fast terrain bounds computation.
     * Each entry: [x0, y0, z0, x1, y1, z1] — grid-space start and end of the ray.
     * Recomputed when invScreenMat changes (view change).
     *
     * @internal
     * @hidden
     */
    private _viewportRays: number[][] | null = null;
    private _viewportRaysSnapshot: Float32Array | null = null;

    private ensureViewportRays(): number[][] {
        const invMat = this.render.invScreenMat;
        // Invalidate when matrix contents change.
        // invScreenMat is the same Float32Array object mutated in place, so we must compare contents (not reference).
        if (this._viewportRays && this._viewportRaysSnapshot) {
            let same = true;
            for (let i = 0; i < 16; i++) {
                if (this._viewportRaysSnapshot[i] !== invMat[i]) {
                    same = false;
                    break;
                }
            }
            if (same) return this._viewportRays;
        }

        this._viewportRaysSnapshot ||= new Float32Array(16);
        this._viewportRaysSnapshot.set(invMat);

        const w = this.w;
        const h = this.h;
        const screenCorners: [number, number][] = [[0, 0], [w, 0], [w, h], [0, h]];
        const rays: number[][] = [];

        for (const [sx, sy] of screenCorners) {
            const p0 = [sx, sy, 0];
            const p1 = [sx, sy, 1];
            transformMat4(p0, p0, invMat);
            transformMat4(p1, p1, invMat);
            rays.push([p0[0], p0[1], p0[2], p1[0], p1[1], p1[2]]);
        }
        this._viewportRays = rays;
        return rays;
    }

    /**
     * Returns viewport bounds projected onto the terrain plane at the given altitude.
     * Uses precomputed viewport rays; returns `undefined` if any ray misses the plane,
     * e.g. when top rays pass above the terrain in pitched views.
     *
     * @internal
     * @hidden
     */
    getTerrainViewportBounds(terrainAltitude: number): number[][] | undefined {
        if (terrainAltitude <= 0) return undefined;

        const rays = this.ensureViewportRays();
        const bounds: number[][] = [];

        for (const ray of rays) {
            const [x0, y0, z0, x1, y1, z1] = ray;
            if (z0 === z1) {
                // ray is parallel to terrain plane
                return undefined;
            }
            const t = (terrainAltitude - z0) / (z1 - z0);
            // if t < 0, the terrain plane is "behind" this ray (above the ray in pitched views).
            // the resulting bounds polygon would be degenerate -> fall back to sea-level bounds.
            if (t < 0) return undefined;
            bounds.push([
                x0 * (1 - t) + x1 * t,
                y0 * (1 - t) + y1 * t
            ]);
        }
        return bounds;
    }


    /**
     * Sample terrain min/max/avg height for a given tile region.
     * Uses the stable `terrainCache` (HeightMapTileCache) which persists across frames.
     * For ancestor terrain tiles, only scans the sub-region covering the requested tile.
     * Returns exaggerated heights.
     *
     * @internal
     * @hidden
     */
    getTerrainHeight(zoom: number, x: number, y: number): TerrainStats {
        const cache = this.terrainCache;

        if (cache.size) {
            const heightMapData = cache.getByTile(zoom, x, y);

            if (heightMapData?.data && Number.isFinite(heightMapData.min)) {
                const terrainExaggeration = this.terrainExaggeration;
                const min = heightMapData.min * terrainExaggeration;
                const max = heightMapData.max * terrainExaggeration;
                return {min, max, avg: (min + max) * .5, available: true};
            }

            // walk up ancestors using numeric coordinates (no string allocation)
            let az = zoom;
            let ax = x;
            let ay = y;
            while (az > 0) {
                az--;
                ax >>= 1;
                ay >>= 1;

                const ancestorData = cache.getByTile(az, ax, ay);
                if (ancestorData?.elevationTree) {
                    // depth relative to ancestor = original zoom - ancestor zoom
                    const depth = zoom - az;
                    // local coordinates within ancestor at the given depth
                    const relX = x - (ax << depth);
                    const relY = y - (ay << depth);
                    const stats = ancestorData.elevationTree.getByGrid(depth, relX, relY);
                    if (stats) {
                        const terrainExaggeration = this.terrainExaggeration;
                        return {
                            min: stats.min * terrainExaggeration,
                            max: stats.max * terrainExaggeration,
                            avg: stats.avg * terrainExaggeration,
                            available: true
                        };
                    }
                }
            }
        }

        const max = this.terrainPivotAltitude || 0;
        return max ? {
            min: 0,
            max,
            avg: max * .5,
            available: false
        } : this._emptyTerrainStats;
    }

    get geometryBufferCount() {
        return this._zSortedTileBuffers?.tileBuffers?.length ^ 0;
    }
}

export default WebGlDisplay;
