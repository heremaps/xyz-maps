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

import Renderer from './Canvas';
import DisplayTilePool from './CanvasTileBucket';
import BasicDisplay from '../BasicDisplay';
import {layers} from '@here/xyz-maps-core';
import CanvasTile from './CanvasTile';
import CanvasRenderer from './Canvas';

type TileLayer = layers.TileLayer;

let DISPLAY_CFG_PR = {
    '1': [
        512, // DISPLAY_TILE_CACHE_SIZE
        3, // PREVIEW_LOOK_AHEAD_LEVELS
        512 // DEFAULT_CTX_COUNT
    ],
    '2': [
        128,
        2,
        128
    ],
    '3': [
        64,
        1,
        128
    ]
};

const DEFAULT_TILE_SIZE = 256;
const PRIORITY_RENDER_TASK = 3;
const PRIORITY_GROUP_TASK = 4;
let UNDEF;


const rotate = (x: number, y: number, originX: number, originY: number, alpha: number): [number, number] => {
    const sin = Math.sin(alpha);
    const cos = Math.cos(alpha);
    const dx = x - originX;
    const dy = y - originY;

    return [
        cos * dx - sin * dy + originX,
        sin * dx + cos * dy + originY
    ];
};


class RenderBucket {
    features = [];
    styles = [];

    add(feature, style) {
        this.features.push(feature);
        this.styles.push(style);
    }
}


class CanvasDisplay extends BasicDisplay {
    static zoomBehaviour:'fixed'|'float' = 'fixed';

    buckets: DisplayTilePool;
    render: CanvasRenderer;

    constructor(mapEl, tileSize, devicePixelRatio, renderOptions?: {}) {
        tileSize = tileSize || DEFAULT_TILE_SIZE;

        devicePixelRatio = BasicDisplay.getPixelRatio(devicePixelRatio) ^ 0;

        const PREVIEW_LOOK_AHEAD_LEVELS = DISPLAY_CFG_PR[devicePixelRatio][1];
        // tileSize, devicePixelRatio, layerSetup, mapInternal
        const tileRenderer = new Renderer(tileSize * devicePixelRatio, devicePixelRatio);

        const DISPLAY_TILE_CACHE_SIZE = DISPLAY_CFG_PR[devicePixelRatio][0];

        const buckets = new DisplayTilePool(DISPLAY_TILE_CACHE_SIZE, tileSize * devicePixelRatio);

        tileRenderer.setBuckets(buckets);

        super(mapEl, tileSize, devicePixelRatio, buckets, tileRenderer, PREVIEW_LOOK_AHEAD_LEVELS);

        tileRenderer.init(this.canvas);
    };

    preview(displayTile: CanvasTile, layer: TileLayer, index: number): any[][] {
        const previewData = super.preview(displayTile, layer, index);

        if (previewData) {
            this.render.preview(displayTile, previewData, layer, index);
        }
        return previewData;
    }

    prepareTile(tile, data, layer: TileLayer, dTile: CanvasTile, onDone) {
        let display = this;
        let renderer = display.render;

        if (tile.type == 'image') {
            const index = dTile.index(layer);
            dTile.dirty(index, data);
            onDone(dTile, layer);
        } else if (!data.length) {
            const index = dTile.index(layer);
            // make sure there is no data from previous states left that needs to be cleared!
            dTile.destroy(index);
            dTile.dirty(index); // displayTile._c = false;

            onDone(dTile, layer);
        } else {
            dTile.addTask(
                display.cluster.spawn(PRIORITY_GROUP_TASK, layer, tile, data, {}, RenderBucket, (INSTRUCTIONS, task) => {
                    dTile.removeTask(task, layer);

                    if (dTile == null) {
                        debugger;
                        dTile = UNDEF;
                    }

                    dTile.addTask(renderer.prepare(INSTRUCTIONS, tile, layer, display, dTile, (canvas, task) => {
                        // tileMultiCanvas.ready = true;
                        dTile.removeTask(task, layer);
                        // if (onDone) {

                        // clear preview to enable preview creation for next render iteration
                        // dTile.p[dTile.index(layer)] = false;

                        onDone(dTile, layer);
                        // }
                    }), layer);
                })
                , layer);
        }
    }

    protected viewport(dirty?: boolean) {
        const display = this;
        const tiles = display.tiles;
        const render = display.render;
        const layers = display.layers;
        const layerCount = layers.length;
        const bucket = this.buckets;

        let screenTile;
        let dTile;
        let lastTileUpdateTs;


        if (this.dirty || dirty) {
            this.render.clear();
            this.dirty = false;
        }

        for (let tileSize in tiles) {
            if (tileSize == '512') continue;

            const vpTiles = tiles[tileSize];
            const length = vpTiles.length;

            for (let screenTile of vpTiles) {
                dTile = screenTile.tile;
                lastTileUpdateTs = dTile.luTs;

                if (screenTile.lrTs != lastTileUpdateTs || dirty) {
                    screenTile.lrTs = lastTileUpdateTs;

                    render.tile(dTile, screenTile.x, screenTile.y);

                    for (var l = 0, layer; l < layerCount; l++) {
                        layer = layers[l]; // {ready: false, layer: Layer, cnt: 0, visible: true}

                        if (
                            !layer.ready && dTile.ready(l) &&
                            ++layer.cnt == length
                        ) {
                            layer.ready = true;
                            // layers[l].__C_RENDER && layers[l].__C_RENDER(tileRenderer.ctx,mapscale,rotationZ, display.setTransform );
                        }
                    }
                }
                // }
                // i++;
            }
        }
    }

    addLayer(layer: TileLayer, styles, index) {
        // Workaround: canvas only supports 256pixel rendering
        layer.tileSize = 256;
        const added = super.addLayer(layer, styles, index);
        if (added) {
            this.setupTilePool();
        }
        return added;
    }


    removeLayer(layer: TileLayer) {
        const index = super.removeLayer(layer);
        if (index !== -1) {
            this.setupTilePool();
        }
        return index;
    }


    setSize(w: number, h: number) {
        const display = this;

        super.setSize(w, h);
        display.setupTilePool();
        // force render to re-apply transforms because changing canvas size clears the context.
        // force update although scale/rotation did not change.
        // @ts-ignore
        display.render._s = UNDEF;
        display.setTransform(display.s, display.rz, display.rx);
    }


    destroy() {
        super.destroy();
        this.buckets.clear();
    }


    // canvas impl only
    setupTilePool() {
        let display = this;
        const w = Math.ceil(display.w / DEFAULT_TILE_SIZE) + 1;
        const h = Math.ceil(display.h / DEFAULT_TILE_SIZE) + 1;
        const size = w * h;
        let tiles = size;

        const deviceSetup = DISPLAY_CFG_PR[display.dpr];

        let ctxLength = size * display.getLayers().length;

        if (tiles < deviceSetup[0]) {
            tiles = deviceSetup[0];
        }

        display.buckets.setSize(tiles);

        if (ctxLength < deviceSetup[2]) {
            ctxLength = deviceSetup[2];
        }

        display.buckets.ctxCache.max = ctxLength;
    }

    update(dirty ?: boolean) {
        // dirty flag can be ignored for canvas because of tile blit.
        // the tile canvas is already updated and also acting as screen clearer.
        super.update();
    }

    project(x: number, y: number, screenOffsetX ?: number, screenOffsetY ?: number): [number, number] {
        const displ = this;
        const scale = displ.s;

        // apply scale
        x = x * scale;
        y = y * scale;

        // apply current rotation
        const pixel = rotate(x, y, displ.w / 2, displ.h / 2, displ.rz);

        return pixel;
    }

    unproject(x: number, y: number): [number, number] {
        let displ = this;
        let scale = displ.s;
        const cx = displ.w / 2;
        const cy = displ.h / 2;
        let p = rotate(x, y, cx, cy, -displ.rz);

        p[0] = (p[0] - cx) / scale + cx;
        p[1] = (p[1] - cy) / scale + cy;

        return p;

        // const s = this.s;
        // const rz = -this.rz;
        // const sin = Math.sin(rz);
        // const cos = Math.cos(rz);
        // const cx = this.w / 2;
        // const cy = this.h / 2;
        // const dx = x - cx;
        // const dy = y - cy;
        //
        // return [
        //     (((cos * dx - sin * dy + cx) - cx) / s) + cx,
        //     (((sin * dx + cos * dy + cy) - cy) / s) + cy
        // ];
    }

// unproject(x: number, y: number, screenOffsetX?: number, screenOffsetY?: number): [number, number] {
//     let displ = this;
//     let scale = displ.s;
//     let p = rotate(x, y, displ.w / 2, displ.h / 2, -displ.rz);
//
//     p[0] /= scale;
//     p[1] /= scale;
//
//     p[0] -= screenOffsetX;
//     p[1] -= screenOffsetY;
//
//     return p;
// }
}


export default CanvasDisplay;
