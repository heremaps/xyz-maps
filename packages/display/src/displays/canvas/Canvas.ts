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

// import LayerClusterer from '../LayerClusterer';
import Painter from './Painter';
import {TaskManager} from '@here/xyz-maps-common';
// import Preview from '../Preview';
import {tile} from '@here/xyz-maps-core';
import BasicRender from '../BasicRender';
import CanvasTile from './CanvasTile';
// type Tile = tile.Tile;

const RENDER_TILE_SIZE = 256;
const exclusiveTimeMS = 4;
const PRIORITY_RENDER_TASK = 3;
const instructionTaskPriority = 4;
let UNDEF;


class CanvasRenderer implements BasicRender {
    constructor(tileSize: number, devicePixelRatio: number) {
        let taskManager = TaskManager.getInstance();
        let renderer = this;

        renderer.ts = tileSize;


        renderer.dpr = devicePixelRatio;
        //* ******************************************************************************************
        //
        // objects are grouped per drawing styles and multiple lines are drawn together -> FASTER!!
        // (in most browsers ;)
        //
        //* ******************************************************************************************
        // renderer.cluster = new LayerClusterer(taskManager, exclusiveTimeMS);
        renderer.painter = new Painter(taskManager, devicePixelRatio, exclusiveTimeMS);
    }

    // ------------- private -------------
    private dpr: number = 1; // devicePixelRatio
    private debug: boolean = false; // display tile grid
    private rz: number = 0; // rotation z axis
    private sx: number = 0; // scale offset x
    private sy: number = 0; // scale offset y
    private s: number = 1; // scale
    private _s: number;
    private _rz: number;
    private iMap: any;
    // private cluster: any;
    private painter: any;
    private ts: number;
    private ctx: CanvasRenderingContext2D;
    private canvas: HTMLCanvasElement;
    private buckets: any;

    drawGrid(x: number, y: number, quadkey: string) {
        let dbgMsg: string = quadkey + '  L' + quadkey.length;

        const ctx = this.ctx;

        ctx.strokeRect(x, y, RENDER_TILE_SIZE, RENDER_TILE_SIZE);
        ctx.strokeText(dbgMsg, x + 8, y + 16);
        ctx.fillText(dbgMsg, x + 8, y + 16);
    }

    applyTransform() {
        const renderer = this;
        const scale = renderer.s;
        const rotZ = renderer.rz;

        if (renderer._s != scale || renderer._rz != rotZ) {
            renderer._s = scale;
            renderer._rz = rotZ;

            const ctx = renderer.ctx;
            const canvas = renderer.canvas;
            const w = canvas.width;
            const h = canvas.height;
            const tx = w / 2 - renderer.sx;
            const ty = h / 2 - renderer.sy;
            const devicePixelRatio = renderer.dpr;

            // clear previous transforms and set canvas-center as rotation center
            ctx.setTransform(1, 0, 0, 1, w / 2, h / 2);

            ctx.rotate(rotZ);
            ctx.translate(-w / 2 + tx, -h / 2 + ty);

            ctx.scale(scale, scale);
            ctx.translate(-tx, -ty);

            ctx.scale(devicePixelRatio, devicePixelRatio);
        }
    }

    // ------------- public (display)-------------
    init(canvas: HTMLCanvasElement) {
        let ctx = canvas.getContext('2d', {
            alpha: false
        });

        // for debug grid display
        ctx.font = 'bold 14px Arial';
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'red';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'start';
        ctx.textBaseline = 'alphabetic';

        this.ctx = ctx;
        this.canvas = canvas;
    }

    setBuckets(buckets) {
        this.buckets = buckets;
    }

    clear() {
        // no clear required because "cleared" tile canvases are blitted immediately
    }

    setBackgroundColor(color: string) {
        this.buckets.bgColor(color);
    }

    grid(show: boolean) {
        this.debug = show;
    }

    setScale(scale: number, sx: number, sy: number) {
        let render = this;
        render.s = scale;
        render.sx = sx;
        render.sy = sy;
    }

    setRotation(rotZ: number, rotX?: number) {
        this.rz = rotZ;
    }

    prepare(INSTRUCTIONS, tile, layer, display, dTile, cb) {
        return this.painter.spawn(
            PRIORITY_RENDER_TASK,
            display,
            tile,
            layer,
            dTile,
            INSTRUCTIONS,
            cb
        );
    }

    tile(dTile, x: number, y: number) {
        const renderer = this;

        renderer.ctx.drawImage(dTile.combine(), x, y, RENDER_TILE_SIZE, RENDER_TILE_SIZE);

        if (renderer.debug) {
            renderer.drawGrid(x, y, dTile.quadkey);
        }
    }

    preview(dTile: CanvasTile, previewData: any[], layer, layerIndex: number) {
        let tileCtx = dTile.getContext(layerIndex);

        tileCtx.clearRect(0, 0, dTile.size, dTile.size);

        for (let p = 0, pLen = previewData.length; p < pLen; p++) {
            let preview = previewData[p];
            let previewTile = this.buckets.get(preview[0], true /* SKIP_TRACK */);
            let imgData;

            if (previewTile && (imgData = previewTile.getData(layerIndex))) {
                tileCtx.setTransform(1, 0, 0, 1, 0, 0);
                tileCtx.drawImage(
                    imgData,
                    preview[1],
                    preview[2],
                    preview[3],
                    preview[4],
                    0 + preview[5],
                    0 + preview[6],
                    preview[7],
                    preview[8]
                );
                dTile.dirty(layerIndex);
            }
        }
    }

    destroy(): void {

    }
}


export default CanvasRenderer;
