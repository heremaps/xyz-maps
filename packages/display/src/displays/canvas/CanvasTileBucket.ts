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

import {LRU, global} from '@here/xyz-maps-common';
import CanvasTile from './CanvasTile';
import ctxCache from './ctxCache';
import BasicBucket from '../BasicBucket';

let DEFAULT_SIZE = 256;


class TilePool extends BasicBucket {
    private tSize: number;

    constructor(size: number, tileSize: number) {
        super(size|| DEFAULT_SIZE);

        this.tSize = tileSize;
        // dbg only
        // global.displayTiles = this.tiles;
    };

    tiles: LRU<CanvasTile>;

    ctxCache: any = ctxCache;

    _bgc = null;

    bgColor(bgColor: string) {
        this._bgc = bgColor;

        this.forEach((dTile) => {
            (<CanvasTile>dTile).ctx.fillStyle = bgColor;
        });
    };

    clear() {
        this.tiles.clear();
        ctxCache.clear();
    };

    setSize(size: number) {
        this.tiles.setSize(size);
    };

    releaseCtx(ctx: CanvasRenderingContext2D) {
        return ctxCache.release(ctx);
    };

    claimCtx(size: number): CanvasRenderingContext2D {
        if (ctxCache.length < ctxCache.max) {
            return ctxCache.get(size);
        } else { // no context available -> need to destroy tile
            let lastUsedTile = this.tiles.tail.data;

            // destroy keeps main canvas for later reuse of tile..
            lastUsedTile.destroy();

            // ..but tile won't be reused and will be fully dropped
            // -> main canvas needs to be released as well!
            ctxCache.release(lastUsedTile.ctx);

            lastUsedTile.ctx = null;
            lastUsedTile.canvas = null;

            this.tiles.remove(lastUsedTile.quadkey);

            lastUsedTile.cancelTasks();

            return this.claimCtx(size);
        }
    };

    create(quadkey: string, layers: any[]) {
        let mtc = this.tiles.get(quadkey);


        if (!mtc /* && !skipCreate*/) {
            if (this.tiles.length >= this.tiles.max) {
                // reuseTile
                mtc = this.tiles.tail.data;

                mtc.destroy();

                mtc.init(
                    quadkey,
                    layers
                );
                mtc.size = this.tSize;
            } else {
                mtc = new CanvasTile(
                    this,
                    quadkey,
                    layers,
                    this.tSize,
                    this._bgc
                );
            }

            this.tiles.set(
                quadkey,
                mtc
            );
        }

        return mtc;
    }
}

export default TilePool;
