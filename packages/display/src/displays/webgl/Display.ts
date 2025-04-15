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

import {createBuffer} from './buffer/createBuffer';
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
    CustomLayer,
    LinearGradient,
    TileLayer,
    XYZLayerStyle,
    Color
} from '@here/xyz-maps-core';
import {PASS} from './program/GLStates';
import {Raycaster} from './Raycaster';
import {defaultLightUniforms, initLightUniforms, ProcessedLights} from './lights';
import {UniformMap} from './program/Program';
import {Color as Colors} from '@here/xyz-maps-common';

const {toRGB} = Colors;

// determined through experimentation to find the best balance between performance and view distance.
export const MAX_PITCH_GRID = 66.33 / 180 * Math.PI;

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

export type TileBufferData = {
    z: number;
    tiled: true;
    b: GeometryBuffer;
    // layerIndex: number;
    layer: Layer,
    data: {
        tile: ViewportTile;
        preview?: [string, number, number, number, number, number, number, number, number];
        stencils?;
    };
};

type CustomBufferData = {
    z: number;
    tiled: false;
    b: {
        flat: boolean;
        zLayer?: number;
        zIndex?: number;
        pass?: number;
        pointerEvents?: boolean;
    };
    data: CustomLayer;
};

type BufferData = CustomBufferData | TileBufferData;

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
    private _zSortedTileBuffers: { tileBuffers: BufferData[], min3dZIndex: number, maxZIndex: number };
    // Normalized maximum horizon Y-coordinate.
    // This value represents the maximum vertical offset of the grid's horizon when maximum possible pitch applied.
    // The offset is normalized by dividing it by the total screen height.
    private maxHorizonY: number;
    // Represents the world-space Y-coordinate of the topmost edge of the grid visible at the maximum pitch.
    // maxPitchGridTopWorld is used to calculate `horizonY` when the map is pitched beyond the maximum grid pitch.
    private maxPitchGridTopWorld: number[];
    // vertical offset from top of the screen to the "horizon line" in screen pixels.
    protected horizonY: number;

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
            this.buckets.setSize(1024);
        }

        const display = this;
        this.collision = new CollisionHandler(display);

        this.buckets.onDrop = function(buffers, index) {
            const {quadkey, layers} = this;

            display.collision.clearTile(quadkey, layers[index]);

            display.releaseBuffers(buffers);
        };

        const {render} = display;
        render.init(this.canvas, this.dpr);

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

    private releaseBuffers(buffers: GeometryBuffer[]) {
        const renderer = this.render;

        if (buffers) {
            for (let buf of buffers) {
                renderer.deleteBuffer(buf);
            }
        }
    }

    private initLights(displayLayer: Layer) {
        const lightSets: {
            [l: string]: ProcessedLights
            [p: symbol]: { [u: string]: UniformMap }
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
        let color;
        if (this.factory.gradients.isGradient(skyColor)) {
            color = this.factory.gradients.getTexture((<unknown>skyColor as LinearGradient));
        } else {
            color = toRGB(skyColor as Color);
        }

        this.render.setSkyColor(color);
    }

    addLayer(layer: TileLayer | CustomLayer, index: number, styles: XYZLayerStyle): Layer {
        const displayLayer = super.addLayer(layer, index, styles);


        if (displayLayer?.index == 0) {
            // styles.skyColor

            this.initSky(styles.skyColor || [1, 0, 0, 1]);
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
            p[2] *= -1;
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
        const p = [x - sx, y - sy, -z];
        return transformMat4(p, p, matrix);
        // transformMat4(p, p, this.render.vPMats);
        // return fromClipSpace(p, this.w, this.h);
    }

    setSize(width: number, height: number) {
        super.setSize(width, height);
        this.initRenderer();

        const matrix = this.render.updateMapGridMatrix(MAX_PITCH_GRID, width, height);
        const inverseMatrix = invert([], matrix);
        this.maxPitchGridTopWorld = this.unproject(0, 1, null, inverseMatrix);

        this.maxHorizonY = this.pitchMapOffsetY(85 / 180 * Math.PI) / height;
    }

    setTransform(scale: number, rotZ: number, rotX: number) {
        // if (this.s != scale || this.rz != rotZ || this.rx != rotX)
        // {
        const PI2 = 2 * Math.PI;
        rotZ = (rotZ + PI2) % PI2;
        this.s = scale;
        this.rz = rotZ;
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

    prepareTile(tile, data, layer: TileLayer, dTile: GLTile, onDone: (dTile: GLTile, layer: TileLayer) => void) {
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
            const task = createBuffer(
                displayLayer,
                tileSize,
                tile,
                this.factory,
                // on initTile / start
                () => {
                    display.collision.initTile(tile, displayLayer);
                },
                // on done
                (buffer, pendingResources) => {
                    dTile.preview(dTile.setData(layer, buffer), null);

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
                }
            );
            dTile.addTask(task, layer);
        } else {
            dTile.preview(dTile.setData(layer, []), null);
            onDone(dTile, layer);
        }
    }

    private orderBuffers(
        zSorted: BufferData[],
        buffers: (GeometryBuffer | CustomBufferData['b'])[],
        layer: Layer,
        absZOrder: {
            [intZ: string]: number
        },
        data: CustomBufferData['data'] | TileBufferData['data'],
        tiled: boolean
    ) {
        for (let buffer of buffers) {
            let {zLayer, zIndex} = buffer;

            if (zLayer == null) {
                zLayer = layer.index + 1;
            }

            let z = zLayer * 1e8 + zIndex * 10;

            if (!buffer.flat) {
                // make sure 3d geom is always drawn "after" 2d geom. even if same zIndex is used.
                // otherwise stencil conflicts are possible.
                z += 1;
            }
            absZOrder[z] = 0;

            zSorted[zSorted.length] = {
                b: buffer,
                z,
                data,
                layer,
                // layerIndex: layer.index,
                tiled
            } as TileBufferData;
        }
    }

    private initLayerBuffers(layers: Layers): { tileBuffers: BufferData[], min3dZIndex: number, maxZIndex: number } {
        const {buckets} = this;
        let tileBuffers: BufferData[] = [];
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
            z = zTile.z = absZOrder[zTile.z];

            if (!zTile.b.flat && z < min3dZIndex) {
                // if (!zTile.b.flat && z < min3dZIndex && !zTile.b.isPointBuffer() ) {
                min3dZIndex = z;
            }
        }

        return {tileBuffers, min3dZIndex, maxZIndex};
    }

    protected getCamGroundPositionScreen() {
        const {cameraWorld} = this.render;
        return this.project(cameraWorld[0], cameraWorld[1]);
    }

    protected pitchMapOffsetY(pitch: number = this.rx) {
        let horizonY = 0;
        if (pitch > MAX_PITCH_GRID) {
            const {w, h} = this;
            const [x, maxPitchGridOffset] = this.maxPitchGridTopWorld;
            const matrix = this.render.updateMapGridMatrix(pitch, w, h);
            const y = this.project(x, maxPitchGridOffset, 0, 0, 0, matrix)[1];
            horizonY = (1 - y) * h / 2;
        }
        return this.horizonY = horizonY;
    }

    protected viewport(dirty?: boolean) {
        const display = this;
        const {buckets, layers, render} = display;
        const layerLength = layers.length;
        let length;

        if (display.dirty) {
            display.dirty = false;
            display.updateCollisions();
        }

        render.clear(display.bgColor);

        render.fixedView = Number(!this.viewChange);

        const layerBuffers = this.initLayerBuffers(layers);
        const {tileBuffers, min3dZIndex, maxZIndex} = layerBuffers;


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
                render.draw(<TileBufferData>data, min3dZIndex);
            }
        }

        render.setPass(PASS.ALPHA);

        // sort by zIndex and alpha/post alpha.
        tileBuffers.sort((buf1, buf2) => 10 * (buf1.z - buf2.z) + buf1.b.pass - buf2.b.pass);
        this._zSortedTileBuffers = layerBuffers;
        let layerZIndex = 0;

        do {
            let secondAlphaPass = false;

            for (b = 0, length = tileBuffers.length; b < length; b++) {
                let data = tileBuffers[b];
                let buffer = data.b;

                if (buffer.pass & PASS.POST_ALPHA) {
                    // do depth in this pass only and "main" drawing in an additional pass
                    secondAlphaPass = true;
                }
                if (data?.z == layerZIndex) {
                    if (!data.tiled) {
                        render.drawCustom((<CustomBufferData>data).data, data.z);
                    } else {
                        render.draw(<TileBufferData>data, min3dZIndex);
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
    }

    private updateCollisions() {
        this.collision.update( this.tiles,
            // make sure display will refresh in case of cd toggles visibility
            () => this.update()
        );
    }
    destroy() {
        super.destroy();
        this.factory.destroy();
    }

    getRenderedFeatureAt(x: number, y: number, layers?: TileLayer[]): RendereFeatureResult {
        // console.time('getRenderedFeatureAt');
        this.rayCaster.init(x, y, this.w, this.h, this.s, 1 / this.groundResolution);
        let intersectLayer: Layer = null;
        const camWorldZ = this.rayCaster.origin[2] - 0.001;

        const {tileBuffers, min3dZIndex} = this._zSortedTileBuffers;
        let i = tileBuffers.length;
        while (i--) {
            let tileBuffer = tileBuffers[i];
            if (!tileBuffer.tiled || !tileBuffer.b.pointerEvents) continue; // skip custom layers
            let {b: buffer, z, data, tiled, layer} = tileBuffer;

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
            const hitTile = this.rayCaster.intersectAABBox(tileX, tileY, 0, tileX + size, tileY + size, camWorldZ);
            if (!hitTile) continue;

            const id = this.rayCaster.intersect(tileX, tileY, buffer);
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
