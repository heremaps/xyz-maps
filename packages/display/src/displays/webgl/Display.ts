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

import BasicDisplay, {ViewportTile} from '../BasicDisplay';
import {GLRender, RenderOptions} from './GLRender';
import GLBucket from './Bucket';

import {GeometryBufferFactory} from './buffer/factory/GeometryBufferFactory';
import {createImageBuffer} from './buffer/createImageBuffer';

import {transformMat4} from 'gl-matrix/vec3';
import {transformMat4 as transformMat4Vec4} from 'gl-matrix/vec4';
import {invert} from 'gl-matrix/mat4';
import {Layer, Layers} from '../Layers';
import GLTile from './GLTile';
import {FeatureFactory} from './buffer/FeatureFactory';
import {CollisionHandler} from './CollisionHandler';
import {GeometryBuffer} from './buffer/GeometryBuffer';
import {
    Tile,
    CustomLayer,
    LinearGradient,
    TileLayer,
    XYZLayerStyle,
    Color,
    TerrainTileLayer,
    TerrainTileFeature
} from '@here/xyz-maps-core';
import {PASS} from './program/GLStates';
import {Raycaster} from './Raycaster';
import {defaultLightUniforms, initLightUniforms, ProcessedLights} from './lights';
import {CompiledUniformMap, UniformMap} from './program/Program';
import {RenderTile, RenderTilePool} from './RenderTile';
import {HeightMapTileCache} from './HeightMapTileCache';
import {DisplayTileTask} from '../BasicTile';


const TO_RADIANS = Math.PI / 180;
// Maximum pitch (in radians) used for calculating the world-coordinate tile grid.
// When the actual map pitch exceeds this value, the grid is still computed using this capped pitch value.
// This limits the visible area and reduces the number of generated tiles at steep pitch angles,
// helping to control performance and memory usage while maintaining reasonable horizon coverage.
// Experimentally determined to provide the best balance between performance and view distance.
export const GRID_PITCH_CLAMP = 66.33 * TO_RADIANS;

// Maximum pitch (in radians) at which fixed (non-adaptive) grid tiles are allowed to render.
// If the actual pitch exceeds this value, fixed tiles are culled and no longer displayed.
// Adaptive tiles may still render above this threshold by scaling appropriately.
export const FIXED_TILE_PITCH_THRESHOLD = 60 * TO_RADIANS;

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

const stencilQuad = (quadkey: string, subQuadkey: string) => {
    const level = quadkey.length;
    const dLevel = subQuadkey.length - level;
    // quad:
    // -------------
    // |  0  |  1  |
    // -------------
    // |  2  |  3  |
    // -------------
    let x = 0;
    let y = 0;
    let size = 1;
    for (let i = 0; i < dLevel; i++) {
        size *= .5;
        const quad = Number(subQuadkey.charAt(level + i));
        x += (quad % 2) * size;
        y += Number(quad > 1) * size;
    }
    return [x, y, size];
};

type RendereFeatureResult = {
    id: number | string | null;
    z: number;
    layer: TileLayer
};


type CustomRenderData = {
    z: number;
    tiled: false;
    buffer: {
        flat: boolean;
        zLayer?: number;
        zIndex?: number;
        pass?: number;
        pointerEvents?: boolean;
    };
    data: CustomLayer;
};

type RenderData = CustomRenderData | RenderTile;

const PROCESSED_LIGHTS_SYMBOL = Symbol();

class WebGlDisplay extends BasicDisplay {
    static zoomBehavior: 'fixed' | 'float' = 'float';

    private name: string = 'gl-test';

    render: GLRender;
    buckets: GLBucket;
    private readonly factory: FeatureFactory;
    private readonly collision: CollisionHandler;
    private rayCaster: Raycaster;
    private groundResolution: number;
    private worldCenter: number[] = [0, 0];
    private worldSize: number;
    private renderTilePool: RenderTilePool = new RenderTilePool();
    private _zSortedTileBuffers: { tileBuffers: RenderData[], min3dZIndex: number, maxZIndex: number } = {
        tileBuffers: [],
        min3dZIndex: 0,
        maxZIndex: 0
    };
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

        if (this.dpr < 2) {
            this.buckets.setMaxSize(this.buckets.getMaxSize()*2);
        }

        const display = this;
        this.collision = new CollisionHandler(display);

        this.buckets.onDrop = function(buffers, index) {
            const {quadkey, layers} = this;
            display.collision.clearTile(quadkey, layers[index]);
            display.releaseBuffers(buffers, quadkey);
        };

        const {render} = display;

        this.terrainCache = new HeightMapTileCache();

        render.init(this.canvas, this.dpr, this.terrainCache);

        this.rayCaster = new Raycaster(render.screenMat, render.invScreenMat);

        this.factory = new FeatureFactory(render.gl, this.collision, this.dpr);
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
                    if (this.getScreenTile(quadkey, dLayer.tileSize)) {
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

    addLayer(layer: TileLayer | CustomLayer, index: number, styles?: XYZLayerStyle): Layer {
        const displayLayer = super.addLayer(layer, index, styles);

        if (displayLayer) {
            if (layer instanceof TerrainTileLayer) {
                this.terrainCache.init(layer.tileSize);
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
        inverseMatrix ||= this.render.invScreenMat;

        if (typeof z == 'number') {
            const p = [x, y, z];
            transformMat4(p, p, inverseMatrix);
            // p[2] *= -1;
            return p;
        }
        // find line intersection with plane where z is 0
        // const targetZ = 0.0;
        const targetZ = 0;
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
            const matrix = this.render.updateMapGridMatrix(pitch, width, height);
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
            this.render.initView(
                this.w,
                this.h,
                this.s,
                this.rx,
                this.rz,
                this.groundResolution,
                this.worldCenter[0],
                this.worldCenter[1],
                this.worldSize
            );
        }
    }

    prepareTile(tile: Tile, data, layer: TileLayer, dTile: GLTile, onDone: (dTile: GLTile, layer: TileLayer) => void) {
        const display = this;
        const renderer = display.render;
        const gl = renderer.gl;
        const tileSize = layer.tileSize;
        const {quadkey} = dTile;
        const layerId = layer.id;
        const displayLayer = this.layers.get(layerId);

        if (tile.type == 'image' && (data instanceof Image || data instanceof ImageBitmap)) {
            const buffer = createImageBuffer(data, gl, tileSize, displayLayer.index > 0);
            // make sure image tiles are considered by global zIndex
            displayLayer.addZ(buffer.zIndex);
            dTile.preview(dTile.setData(layer, [buffer]), null);
            onDone(dTile, layer);
        } else if (data.length) {
            let task: DisplayTileTask;
            const onTaskDone = (geometryBuffers, pendingResources) => {
                dTile.preview(dTile.setData(layer, geometryBuffers), null);


                if (pendingResources.length) {
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

                if (task.outdated) {
                    task.outdated = false;
                    task.restart();
                } else {
                    dTile.removeTask(task, layer);
                }

                onDone(dTile, layer);
            };

            task = GeometryBufferFactory.startTask(
                displayLayer,
                tile,
                dTile,
                this.factory,
                this.terrainCache,
                this.render.gl,
                // on initTile / start
                () => {
                    display.collision.initTile(tile, displayLayer);
                },
                // on done
                onTaskDone
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
        data: RenderData['data'],
        tiled: boolean
    ) {
        for (let buffer of buffers) {
            let {zLayer, zIndex} = buffer;

            zLayer ??= layer.getRenderIndex();
            let z = zLayer * 1e8 + zIndex * 10;

            if (!buffer.flat) {
                // make sure 3d geom is always drawn "after" 2d geom. even if same zIndex is used.
                // otherwise stencil conflicts are possible.
                z += 1;
            }
            absZOrder[z] = 0;

            let node: RenderTile | CustomRenderData;
            if (tiled) {
                node = this.renderTilePool.getNext();
                node.init(buffer as GeometryBuffer, z, data as RenderTile['data'], layer);
            } else {
                node = {buffer, z, data, layer, tiled} as CustomRenderData;
            }
            zSorted[zSorted.length] = node;
        }
    }

    private initLayerBuffers(layers: Layers): { tileBuffers: RenderData[], min3dZIndex: number, maxZIndex: number } {
        const {buckets} = this;
        let tileBuffers: RenderData[] = [];
        let previewTiles: {
            [qk: string]: number[][]
        };
        let absZOrder = {};

        for (let layer of layers) {
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
                    let buffers = dTile.data?.[layer.index];

                    if (!layer.ready && dTile.ready(layerIndex) && ++layer.cnt == length) {
                        layer.ready = true;
                    }

                    if (!buffers) {
                        let previewData;
                        if ((previewData = dTile.preview(layerIndex))) {
                            if (previewData.length) {
                                for (let preview of previewData) {
                                    const [previewQuadkey] = preview;
                                    const tileStencil = stencilQuad(previewQuadkey, dTile.quadkey);

                                    if (previewTiles[previewQuadkey]) {
                                        previewTiles[previewQuadkey].push(tileStencil);
                                        continue;
                                    }
                                    previewTiles[previewQuadkey] = [tileStencil];

                                    let previewTile = <GLTile>buckets.get(previewQuadkey, true /* SKIP TRACK */);
                                    let previewBuffers;
                                    previewBuffers = previewTile?.getData(layerIndex);
                                    if (previewBuffers?.length) {
                                        this.orderBuffers(
                                            tileBuffers,
                                            previewBuffers,
                                            layer,
                                            absZOrder,
                                            {
                                                tile: screenTile,
                                                preview,
                                                stencils: previewTiles[previewQuadkey]
                                            },
                                            true
                                        );
                                    }
                                }
                            }
                        }
                    } else if (buffers.length) {
                        this.orderBuffers(tileBuffers, buffers, layer, absZOrder, {tile: screenTile}, true);
                    }
                }
            }
        }

        let maxZIndex = 0;
        for (let z of Object.keys(absZOrder).sort((a, b) => Number(a) - Number(b))) {
            absZOrder[z] = maxZIndex++;
        }

        let min3dZIndex = Infinity;

        for (let i = 0, z, zTile; i < tileBuffers.length; i++) {
            zTile = tileBuffers[i];

            zTile.prepareHeightMapReferences();

            z = zTile.z = absZOrder[zTile.z];

            if (!zTile.buffer.flat && z < min3dZIndex) {
                // if (!zTile.buffer.flat && z < min3dZIndex && !zTile.buffer.isPointBuffer() ) {
                min3dZIndex = z;
            }
        }

        return {tileBuffers, min3dZIndex, maxZIndex};
    }

    protected getCamGroundPositionScreen() {
        const {cameraWorld} = this.render;
        return this.project(cameraWorld[0], cameraWorld[1]);
    }

    protected getHorizonYOffset(): number {
        return this.horizonY; // = this.calcHorizonYOffset();
    }

    private calcHorizonYOffset(
        pitch: number = this.rx,
        gridTopWorld: number[] = this.gridTopWorldAtPitchClamp,
        maxPitch: number = GRID_PITCH_CLAMP
    ) {
        let horizonY = 0;
        if (pitch > maxPitch) {
            const {w, h} = this;
            const matrix = this.render.updateMapGridMatrix(pitch, w, h);
            const y = this.project(gridTopWorld[0], gridTopWorld[1], 0, 0, 0, matrix)[1];
            horizonY = (1 - y) * h / 2;
        }
        return horizonY;
    }

    isPointAboveHorizon(x: number, y: number): boolean {
        return this.rx > FIXED_TILE_PITCH_THRESHOLD && this.project(x, y)[1] < this.horizonYFixed;
    }

    protected useLODTiles(): boolean {
        return this.rx > FIXED_TILE_PITCH_THRESHOLD;
    }

    protected viewport(dirty?: boolean) {
        const display = this;
        const {layers, render} = display;
        let length;

        if (display.dirty) {
            display.dirty = false;
            display.updateCollisions();
        }


        render.fixedView = Number(!this.viewChange);

        this.renderTilePool.beginFrame();

        const layerBuffers = this.initLayerBuffers(layers);
        const {tileBuffers, min3dZIndex, maxZIndex} = layerBuffers;

        render.clear(display.bgColor);
        render.drawSky(this.horizonY, this.h, this.maxHorizonY);


        render.zIndexLength = maxZIndex;

        // fill the depthbuffer with real depth values for the ground plane.
        // render.initGroundDepth(this.grid.minX, this.grid.minY, Math.max(this.grid.maxX - this.grid.minX, this.grid.maxY - this.grid.minY));

        render.setPass(PASS.OPAQUE);

        let b = tileBuffers.length;
        while (b--) {
            let data = tileBuffers[b];
            if (data?.tiled) {
                // render.initBufferScissorBox((<TileBufferData>data).b, (<TileBufferData>data).data.tile, (<TileBufferData>data).data.preview);
                render.draw(<RenderTile>data, min3dZIndex);
            }
        }

        render.setPass(PASS.ALPHA);

        // sort by zIndex and alpha/post alpha.
        tileBuffers.sort((buf1, buf2) => 10 * (buf1.z - buf2.z) + buf1.buffer.pass - buf2.buffer.pass);
        this._zSortedTileBuffers = layerBuffers;
        let layerZIndex = 0;

        do {
            let secondAlphaPass = false;

            for (b = 0, length = tileBuffers.length; b < length; b++) {
                let data = tileBuffers[b];
                let buffer = data.buffer;

                if (buffer.pass & PASS.POST_ALPHA) {
                    // do depth in this pass only and "main" drawing in an additional pass
                    secondAlphaPass = true;
                }
                if (data?.z == layerZIndex) {
                    if (!data.tiled) {
                        render.drawCustom((<CustomRenderData>data).data, data.z);
                    } else {
                        render.draw(<RenderTile>data, min3dZIndex);
                    }
                }
            }

            if (render.pass == PASS.POST_ALPHA) {
                render.setPass(PASS.ALPHA);
            } else if (secondAlphaPass) {
                render.setPass(PASS.POST_ALPHA);
                // draw again... first alpha pass was used to stencil.
                layerZIndex--;
            }
        } while (++layerZIndex < maxZIndex);

        if (render.tileGrid) {
            for (let screenTile of display.tiles) {
                for (let layer of display.layers) {
                    if (!layer.skipDbgGrid && layer.tiles.indexOf(screenTile) !== -1) {
                        render.drawGrid(screenTile.x, screenTile.y, <GLTile>screenTile.tile, screenTile.size * screenTile.scale);
                        break;
                    }
                }
            }
        }

        this.renderTilePool.endFrame();
    }

    private updateCollisions() {
        this.collision.update(this.tiles,
            // make sure display will refresh in case of cd toggles visibility
            () => this.update()
        );
    }

    destroy() {
        super.destroy();
        this.factory.destroy();
    }

    getTerrainHeightAtWorldXY(x: number, y: number, terrainLayer: TileLayer): number {
        const {tileBuffers} = this._zSortedTileBuffers;
        let i = tileBuffers.length;

        while (i--) {
            if (!tileBuffers[i].tiled || !tileBuffers[i].buffer.pointerEvents) continue; // skip custom layers
            const renderTile: RenderTile = tileBuffers[i] as RenderTile;
            let {layer} = renderTile;
            const viewportTile: ViewportTile = renderTile.data.tile;
            if (terrainLayer !== (layer.layer as TileLayer)) continue;

            const quadkey = renderTile.data.preview?.[0] || viewportTile.quadkey;
            const terrainFeature: TerrainTileFeature = (layer.layer as TileLayer).getCachedTile(quadkey)?.data?.[0];
            const heightMap = terrainFeature?.getHeightMap();

            if (!heightMap) continue;

            const [localTileX, localTileY] = renderTile.worldToTile(x, y, 0);
            const tileSize = viewportTile.size;

            const isOutsideTile = localTileX < 0 || localTileY < 0 || localTileX > tileSize || localTileY > tileSize;

            if (isOutsideTile) continue;

            const normalizedTileX = localTileX / tileSize;
            const normalizedTileY = localTileY / tileSize;

            return terrainFeature.getHeightAt(normalizedTileX, normalizedTileY);
        }
        return null;
    }

    getRenderedFeatureAt(x: number, y: number, layers?: TileLayer[]): RendereFeatureResult {
        // console.time('getRenderedFeatureAt');
        this.rayCaster.init(x, y, this.w, this.h, this.s, 1 / this.groundResolution);
        let intersectLayer: Layer = null;
        const camWorldZ = this.rayCaster.origin[2] + 0.001;
        const {tileBuffers, min3dZIndex} = this._zSortedTileBuffers;
        let i = tileBuffers.length;


        while (i--) {
            if (!tileBuffers[i].tiled || !tileBuffers[i].buffer.pointerEvents) continue; // skip custom layers

            const renderTile: RenderTile = tileBuffers[i] as RenderTile;
            let {buffer, z, data, layer} = renderTile;

            if (layers?.indexOf(layer.layer as TileLayer) == -1) continue;
            let isOnTopOf3d = false;

            if (buffer.flat) {
                if (z > min3dZIndex) {
                    isOnTopOf3d = true;
                } else {
                    // skip flat/2d buffers for now. will be evaluated later on data level.
                    continue;
                }
            }
            const {x: tileX, y: tileY, size} = data.tile;
            let minZ = 0;
            let maxZ = camWorldZ;
            if (buffer.zRange) {
                minZ = buffer.zRange[0];
                maxZ = buffer.zRange[1];
            }
            const worldModelMatrix = renderTile.getModelMatrix();
            const aabbMin = transformMat4([], [0, 0, minZ], worldModelMatrix);
            const aabbMax = transformMat4([], [size, size, maxZ], worldModelMatrix);
            // If the model matrix flips axes (e.g. negative scaling), compute min/max for each axis to ensure a valid AABB.
            // const boxMinX = Math.min(aabbMin[0], aabbMax[0]);
            // We know modelMatrix is orthogonal, so we can use the min/max directly.
            const hitTile = this.rayCaster.intersectAABBox(
                aabbMin[0], aabbMin[1], aabbMin[2],
                aabbMax[0], aabbMax[1], aabbMax[2]
            );

            if (!hitTile) {
                continue;
            }

            const id = this.rayCaster.intersect(tileX, tileY, buffer, worldModelMatrix);

            if (id != null) {
                intersectLayer = layer;
                if (isOnTopOf3d) break;
            }
        }

        // const {tiles} = this;
        // let tileSize: number | string;
        // for (tileSize in tiles) {
        //     tileSize = Number(tileSize);
        //     for (let gridTile of tiles[tileSize]) {
        //         const tileX = gridTile.x;
        //         const tileY = gridTile.y;
        //         const tile = <GLTile>gridTile.tile;
        //         const hitTile = this.rayCaster.intersectAABBox(tileX, tileY, 0, tileX + tileSize, tileY + tileSize, camWorldZ);
        //         if (!hitTile) continue;
        //
        //         for (let i = 0, {data} = tile; i < data.length; i++) {
        //             const {layer} = tile.layers[i];
        //             const layerBuffers = data[i];
        //             const layerIndex = layers.indexOf(layer);
        //             if (!layerBuffers || layerIndex == -1) continue;
        //             for (let buffer of layerBuffers) {
        //                 if (buffer.isFlat()) continue;
        //                 this.rayCaster.intersect(tileX, tileY, buffer, layerIndex);
        //             }
        //         }
        //     }
        // }
        const result = <RendereFeatureResult><unknown> this.rayCaster.getIntersectionTop();
        result.layer = intersectLayer?.layer as TileLayer;
        this.viewport(true);
        return result;
    }

    viewChangeDone() {
        this.viewChange = false;
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

    computeDistanceScale(x: number, y: number): number {
        const position = [x, y, 0, 1];
        const centerTileScreen = transformMat4Vec4(position, position, this.render.screenMat);
        const distanceScale = centerTileScreen[3] / this.render.distanceCam2Center;
        return distanceScale;
    }

    get geometryBufferCount() {
        return this._zSortedTileBuffers?.tileBuffers?.length ^ 0;
    }
}

export default WebGlDisplay;
