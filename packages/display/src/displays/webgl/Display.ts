/*
 * Copyright (C) 2019-2020 HERE Europe B.V.
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
import {RenderOptions, GLRender} from './GLRender';
import GLBucket from './Bucket';

import {createBuffer} from './buffer/createBuffer';
import {createImageBuffer} from './buffer/createImageBuffer';

import {transformMat4} from 'gl-matrix/vec3';
import {Layer} from '../Layers';
import GLTile from './GLTile';
import {FeatureFactory} from './buffer/FeatureFactory';
import {CollisionHandler} from './CollisionHandler';
import {GeometryBuffer} from './buffer/GeometryBuffer';
import {layers} from '@here/xyz-maps-core';

type TileLayer = layers.TileLayer;

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


class WebGlDisplay extends BasicDisplay {
    static zoomBehaviour: 'fixed' | 'float' = 'float';

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
        const display = this;
        this.collision = new CollisionHandler(display);

        this.buckets.onDrop = function(buffers, index) {
            // if (buffers.length) {
            //     debugger;
            // }
            let {quadkey, layers} = this;

            if (layers[index].tileSize == 256 && display.gridActive(512)) {
                quadkey = quadkey.slice(0, -1);
            }

            display.collision.clear(quadkey, index);

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

    private gridActive(size: 256 | 512): boolean {
        return this.gridSizes.indexOf(size) != -1;
    }

    private releaseBuffers(buffers: GeometryBuffer[]) {
        const renderer = this.render;

        if (buffers) {
            for (let buf of buffers) {
                renderer.deleteBuffer(buf);
            }
        }
    }

    removeLayer(layer: TileLayer): number {
        this.collision.removeLayer(this.layers.indexOf(layer));
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

            this.render.initView(this.w, this.h, scale, rotX, rotZ);
        }
    }


    prepareTile(tile, data, layer, dTile: GLTile, onDone) {
        const display = this;
        const renderer = display.render;
        const gl = renderer.gl;
        const tileSize = layer.tileSize;

        if (tile.type == 'image') {
            const renderData = createImageBuffer(data, gl, tileSize);
            dTile.setData([renderData], layer);
            onDone(dTile, layer);
        } else {
            const displayLayer = this.layers.get(layer.id);
            if (data.length) {
                const task = createBuffer(data, displayLayer, tileSize, tile, this.factory,
                    // on init / start
                    () => {
                        // let cTile;
                        // if (tileSize == 256) {
                        //     cTile = display.getBucket(dTile.quadkey.slice(0, -1), true);
                        // } else {
                        //     cTile = dTile;
                        // }

                        let {quadkey} = dTile;
                        if (tileSize == 256 && display.gridActive(512)) {
                            quadkey = quadkey.slice(0, -1);
                        }

                        this.collision.init(quadkey, tile.x, tile.y, tile.z, displayLayer);
                    },
                    // on done
                    (buffer, allImgLoaded) => {
                        dTile.removeTask(task, layer);
                        dTile.setData(buffer, layer);

                        if (!allImgLoaded) {
                            display.tilesNotReady.push({
                                quadkey: dTile.quadkey,
                                layerId: layer.id
                            });
                        }

                        this.dirty = true;
                        this.collision.enforce();
                        // this.collision.update(displayLayer.tiles);

                        onDone(dTile, layer);
                    });
                dTile.addTask(task, layer);
            } else {
                dTile.setData([], layer);
                onDone(dTile, layer);
            }
        }
    }

    protected viewport(dirty?: boolean) {
        const display = this;
        const {buckets, layers, render} = display;
        const layerLength = layers.length;

        let l = layerLength;
        let i = 0;
        let screenTile;
        // let quad; // [ quadkey, x, y, lastUpdateTimestamp ]
        let layer: Layer;
        let length;
        let tiles;


        if (this.dirty || dirty) {
            // this.render.clear();
            this.dirty = false;

            // window.updateCollisions = ((aa,a,b,c,d)=>{
            //     return ()=> {
            //         updateCollisions(aa,a,b,c,d);
            //         display.viewport()
            //     }
            // })(display, layer.tiles, layer.layer, this.rz, this.factory.collisions);


            this.collision.update(
                display.tiles[display.gridActive(512) ? 512 : 256],
                this.rx,
                this.rz,
                this.s
            );

            // this.collision.update(layer.tiles, this.rx, this.rz, this.s);

            // this.collision.update(layer.tiles);
        }


        // clearTimeout(this._timer);
        // if(!this._timer){
        //     this._timer = setTimeout(() => {
        //         console.log('update boysa!',this.updating);
        //         this.collision.update(layers[0].tiles);
        //         if (!this.updating) {
        //             this.viewport();
        //         }
        //         this._timer = null;
        //     }, 50);
        // }


        render.clear();

        render.setPass('opaque');


        while (l--) {
            // for (let l = 0; l < layerCount; l++) {
            layer = layers[l]; // {ready: false, layer: Layer, cnt: 0, visible: true}

            tiles = layer.tiles;
            // reset tile ready count
            layer.cnt = 0;

            if (tiles) {
                length = tiles.length;
                i = 0;

                while (i < length) {
                    screenTile = tiles[i++];
                    // if (dTile.lrTs != dTile.luTs || dirty) {
                    let dTile = screenTile.tile;
                    render.layer(dTile, screenTile.x, screenTile.y, layer, buckets);
                    // }

                    if (!layer.ready && dTile.ready(l)) {
                        if (++layer.cnt == length) {
                            layer.ready = true;
                        }
                    }
                }
            }
        }

        render.setPass('alpha');

        let layerZIndex;
        render.setGroupFilter((group) => {
            let {zIndex} = group;
            // return zIndex == layerZIndex || zIndex == Infinity;
            return zIndex == layerZIndex;
        });

        for (l = 0; l < layerLength; l++) {
            layer = layers[l];
            tiles = layer.tiles;
            if (tiles) {
                length = tiles.length;
                for (layerZIndex in layer.z) {
                    if (layerZIndex == Infinity) continue;
                    i = 0;
                    while (i < length) {
                        screenTile = tiles[i++];
                        render.layer(screenTile.tile, screenTile.x, screenTile.y, layer, buckets);
                    }
                }
            }
        }

        // TODO: REFACTOR drawing hierarchy handling/styling
        // just a workaround for now
        for (l = 0; l < layerLength; l++) {
            layer = layers[l];
            tiles = layer.tiles;
            if (tiles) {
                length = tiles.length;
                for (layerZIndex in layer.z) {
                    if (layerZIndex != Infinity) continue;
                    i = 0;
                    while (i < length) {
                        screenTile = tiles[i++];
                        render.layer(screenTile.tile, screenTile.x, screenTile.y, layer, buckets);
                    }
                }
            }
        }

        render.setGroupFilter();

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
}

export default WebGlDisplay;
