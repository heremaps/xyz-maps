/*
 * Copyright (C) 2019-2021 HERE Europe B.V.
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

import BasicDisplay from '../BasicDisplay';
import {GLRender, RenderOptions} from './GLRender';
import GLBucket from './Bucket';

import {createBuffer} from './buffer/createBuffer';
import {createImageBuffer} from './buffer/createImageBuffer';

import {transformMat4} from 'gl-matrix/vec3';
import {Layer, ScreenTile} from '../Layers';
import GLTile from './GLTile';
import {FeatureFactory} from './buffer/FeatureFactory';
import {CollisionHandler} from './CollisionHandler';
import {GeometryBuffer} from './buffer/GeometryBuffer';
import {TileLayer} from '@here/xyz-maps-core';
import {PASS} from './program/GLStates';

const PREVIEW_LOOK_AHEAD_LEVELS: [number, number] = [3, 9];


// const fromClipSpace = (clip, width, height) => {
//     return [
//         (clip[0] + 1) / 2.0 * width,
//         // we calculate -point3D.getY() because the screen Y axis is
//         // oriented top->down
//         (1 - clip[1]) / 2.0 * height
//     ];
// };

// const toClipSpace = (x, y, z, width, height) => [
//     2 * x / width - 1,
//     -2 * y / height + 1,
//     z || 0
// ];


export type TileBufferData = {
    z: number,
    b: GeometryBuffer,
    tile: ScreenTile, // [x,y,size, tile[quadkey,i]]
    preview: number[],
    previewTile: GLTile
};


class WebGlDisplay extends BasicDisplay {
    static zoomBehavior: 'fixed' | 'float' = 'float';

    private name: string = 'gl-test';

    render: GLRender;
    buckets: GLBucket;
    private factory: FeatureFactory;

    private tilesNotReady: { quadkey: string, layerId: string }[];

    private collision: CollisionHandler;

    constructor(mapEl, renderTileSize, devicePixelRatio, renderOptions?: RenderOptions) {
        super(mapEl, renderTileSize,
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

        // this.render.dpr = this.dpr;
        this.render.init(this.canvas, this.dpr);

        this.factory = new FeatureFactory(this.render.gl, this.render.icons, this.collision, this.dpr);

        // TODO: do clean implementation for tile refresh after image load
        this.tilesNotReady = [];
        this.render.icons.onLoad = (src) => {
            for (let {quadkey, layerId} of this.tilesNotReady) {
                const dLayer = this.layers.get(layerId);
                if (dLayer) {
                    const dTile = this.buckets.get(quadkey, true/* SKIP TRACK */);
                    if (dTile) {
                        let {layer, index} = dLayer;
                        dTile.preview(index, false);
                        dTile.ready(index, false);
                        dTile.cancelTasks(layer);
                        let tile = layer.getCachedTile(dTile.quadkey);
                        if (tile) {
                            this.handleTile(tile, layer, dTile, index);
                        }
                    }
                }
            }
            this.tilesNotReady = [];
        };
    };

    private releaseBuffers(buffers: GeometryBuffer[]) {
        const renderer = this.render;

        if (buffers) {
            for (let buf of buffers) {
                renderer.deleteBuffer(buf);
            }
        }
    }

    removeLayer(layer: TileLayer): number {
        this.collision.removeTiles(this.layers.get(layer));
        return super.removeLayer(layer);
    }

    unproject(x: number, y: number): [number, number] {
        let invScreenMat = this.render.invScreenMat;
        // let inversePrjMat = this.render.invPMat;
        // let clip = toClipSpace(x, y, 0, this.w, this.h);
        // x = clip[0];
        // y = clip[1];

        // find line intersection with plane where z is 0
        const targetZ = 0;
        const p0 = [x, y, 0];
        const p1 = [x, y, 1];

        transformMat4(p0, p0, invScreenMat);
        transformMat4(p1, p1, invScreenMat);
        // transformMat4(p0, p0, inversePrjMat);
        // transformMat4(p1, p1, inversePrjMat);

        const z0 = p0[2];
        const z1 = p1[2];
        const t = z0 === z1 ? 0 : (targetZ - z0) / (z1 - z0);

        // linear interpolation
        return [
            p0[0] * (1 - t) + p1[0] * t,
            p0[1] * (1 - t) + p1[1] * t
        ];
    }

    // from unprojected screen pixels to projected screen pixels
    project(x: number, y: number, sx = this.sx, sy = this.sy): [number, number] {
        // x -= screenOffsetX;
        // y -= screenOffsetY;
        // const p = [x, y, 0];

        // const s = this.s;
        // const p = [x * s, y * s, 0];

        const p = [x - sx, y - sy, 0];
        return transformMat4(p, p, this.render.screenMat);

        // transformMat4(p, p, this.render.pMat);
        // return fromClipSpace(p, this.w, this.h);
    }


    setSize(w, h) {
        super.setSize(w, h);

        if (this.render.gl) {
            this.render.initView(this.w, this.h, this.s, this.rx, this.rz);
        }
    };

    setTransform(scale, rotZ, rotX) {
        if (this.s != scale || this.rz != rotZ || this.rx != rotX) {
            this.s = scale;
            this.rz = rotZ;
            this.rx = rotX;

            const PI2 = 2 * Math.PI;
            rotZ = (rotZ + PI2) % PI2;
            this.render.initView(this.w, this.h, scale, rotX, rotZ);
        }
    }


    prepareTile(tile, data, layer, dTile: GLTile, onDone) {
        const display = this;
        const renderer = display.render;
        const gl = renderer.gl;
        const tileSize = layer.tileSize;
        const displayLayer = this.layers.get(layer.id);

        if (tile.type == 'image') {
            const buffer = createImageBuffer(data, gl, tileSize, displayLayer.index > 0);
            // make sure image tiles are considered by global zIndex
            displayLayer.addZ(buffer.zIndex);
            dTile.preview(dTile.setData(layer, [buffer]), null);
            onDone(dTile, layer);
        } else if (data.length) {
            const task = createBuffer(data, displayLayer, tileSize, tile, this.factory,
                // on initTile / start
                () => {
                    display.collision.initTile(tile, displayLayer);
                },
                // on done
                (buffer, allImgLoaded) => {
                    dTile.removeTask(task, layer);

                    dTile.preview(dTile.setData(layer, buffer), null);

                    if (!allImgLoaded) {
                        display.tilesNotReady.push({
                            quadkey: dTile.quadkey,
                            layerId: layer.id
                        });
                    }

                    this.dirty = true;
                    display.collision.completeTile();

                    onDone(dTile, layer);
                });
            dTile.addTask(task, layer);
        } else {
            dTile.preview(dTile.setData(layer, []), null);
            onDone(dTile, layer);
        }
    }


    private orderBuffers(
        screenTile: ScreenTile,
        buffers: GeometryBuffer[],
        layer: Layer,
        absZOrder: { [intZ: string]: number },
        zSorted: TileBufferData[],
        preview?: number[],
        previewTile?: GLTile
    ) {
        for (let buffer of buffers) {
            let {zLayer, zIndex} = buffer;

            if (zLayer == null) {
                zLayer = layer.index + 1;
            }

            let z = zLayer * 1e6 + zIndex;

            absZOrder[z] = 0;

            zSorted[zSorted.length] = {
                b: buffer,
                z: z,
                tile: screenTile,
                preview: preview,
                previewTile: previewTile
            };
        }
    }

    protected viewport(dirty?: boolean) {
        const display = this;
        const {buckets, layers, render} = display;
        const layerLength = layers.length;
        let length;

        if (display.dirty || dirty) {
            display.dirty = false;
            display.collision.update(display.grid.tiles[512], this.rx, this.rz, this.s,);
        }

        render.clear(layerLength && layers[0].bgColor || display.globalBgc);

        render.fixedView = Number(!this.viewChange);

        let tileBuffers: TileBufferData[] = [];
        let absZOrder = {};

        for (let layer of layers) {
            let tiles = layer.tiles;
            // reset tile ready count
            layer.cnt = 0;

            if (tiles) {
                let layerIndex = layer.index;
                let length = tiles.length;
                let i = 0;
                while (i < length) {
                    let screenTile = tiles[i++];
                    let dTile = <GLTile>screenTile.tile;
                    let buffers = dTile.data[layer.index];

                    if (!layer.ready && dTile.ready(layerIndex) && ++layer.cnt == length) {
                        layer.ready = true;
                    }

                    if (!buffers) {
                        let previewData;
                        if (previewData = dTile.preview(layerIndex)) {
                            if (previewData.length) {
                                for (let preview of previewData) {
                                    let qk = preview[0];
                                    let previewTile = <GLTile>buckets.get(qk, true /* SKIP TRACK */);
                                    let previewBuffers;
                                    previewBuffers = previewTile?.getData(layerIndex);
                                    if (previewBuffers?.length) {
                                        this.orderBuffers(screenTile, previewBuffers, layer, absZOrder, tileBuffers, preview, previewTile);
                                    }
                                }
                            }
                        }
                    } else if (buffers.length) {
                        this.orderBuffers(screenTile, buffers, layer, absZOrder, tileBuffers);
                    }
                }
            }
        }


        let maxZIndex = -1;
        for (let i in absZOrder) {
            absZOrder[i] = ++maxZIndex;
        }

        let min3dZIndex = Infinity;

        for (let i = 0, z, zTile; i < tileBuffers.length; i++) {
            zTile = tileBuffers[i];
            z = zTile.z = absZOrder[zTile.z];

            if (!zTile.b.flat && z < min3dZIndex) {
                min3dZIndex = z;
            }
        }

        render.setPass(PASS.OPAQUE);

        let b = tileBuffers.length;
        while (b--) {
            let data = tileBuffers[b];
            if (data) {
                render.draw(data, min3dZIndex);
            }
        }

        render.setPass(PASS.ALPHA);
        tileBuffers = tileBuffers.sort((a, b) => a.z - b.z);
        let layerZIndex = 0;

        do {
            let secondAlphaPass = false;

            for (b = 0, length = tileBuffers.length; b < length; b++) {
                let data = tileBuffers[b];
                let buffer = data.b;

                if (buffer.alpha == 2) {
                    // do depth in this pass only and "main" drawing in an additional pass
                    secondAlphaPass = true;
                }
                if (data && data.z == layerZIndex) {
                    render.draw(data, min3dZIndex);
                }
            }

            if (render.pass == PASS.POST_ALPHA) {
                render.setPass(PASS.ALPHA);
            } else if (secondAlphaPass) {
                render.setPass(PASS.POST_ALPHA);
                // draw again.. first alpha pass was used to stencil.
                layerZIndex--;
            }
        } while (++layerZIndex <= maxZIndex);


        // display the tilegrid if enabled
        if (render.tileGrid) {
            for (let tileSize in display.tiles) {
                const tiles = display.tiles[tileSize];
                if (tiles.length) {
                    for (let screenTile of tiles) {
                        render.drawGrid(screenTile.x, screenTile.y, <GLTile>screenTile.tile, tileSize);
                    }
                    break;
                }
            }
        }
    }

    destroy() {
        super.destroy();
    }

    viewChangeDone() {
        this.viewChange = false;
        this.update();
    }
}

export default WebGlDisplay;
