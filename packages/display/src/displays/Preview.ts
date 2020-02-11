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

import {tile, layers} from '@here/xyz-maps-core';
import BasicDisplay from './BasicDisplay';
import BasicTile from './BasicTile';

type TileLayer = layers.TileLayer;

const tileUtils = tile['Utils'];

const EMPTY_PREVIEW = [];

let UNDEF;

// CHECK ALREADY CACHED/AVAILABLE TILES FOR QUICK PREVIEW
class TilePreviewCreator {
    private display: BasicDisplay;
    private down: number;
    private up: number;

    constructor(display: BasicDisplay, lookAhead: number | [number, number]) {
        this.display = display;

        if (typeof lookAhead == 'number') {
            this.down = lookAhead;
            this.up = lookAhead;
        } else {
            this.down = lookAhead[0];
            this.up = lookAhead[1];
        }
    }

    private lookUp(dTile: BasicTile, tileSize: number, level: number, deltaLevel: number, layerIndex: number, lookup: any) {
        const quadkey: string = dTile.quadkey;
        let lookIntoLevel: number = level - deltaLevel;
        let last: number;
        let preview: [][];
        let parentQuad: string;

        // CLIP IMAGES FROM UPPER LEVELS
        last = Number(quadkey[lookIntoLevel]);
        lookup.x += last % 2 * tileSize / 2;
        lookup.y += Number(last > 1) * tileSize / 2;

        parentQuad = quadkey.substring(0, lookIntoLevel);

        if (this.hasData(parentQuad, layerIndex)) {
            let dimension = tileSize / Math.pow(2, deltaLevel);
            preview = [];
            // clip image
            this.add(preview, parentQuad, lookup.x, lookup.y, dimension, 0, 0, tileSize);
            return preview;
        }
        lookup.x /= 2;
        lookup.y /= 2;
    }


    private add(preview: Array<any>, quadkey: string, sx: number, sy: number, sdim: number, x: number, y: number, dim: number) {
        preview.push([
            quadkey,
            sx, sy,
            sdim, sdim,
            x ^ 0, y ^ 0,
            dim, dim
        ]);
    }


    private hasData(quadkey: string, index: number) {
        const subTile = this.display.buckets.get(quadkey, true /* SKIP_TRACK */);

        if (subTile) {
            return subTile.ready(index) && subTile.getData(index);
        }
    }


    private lookDown(dTile: BasicTile, tileSize: number, level: number, levelDown: number, layerIndex: number) {
        let lookIntoLevel: number = level + levelDown;
        let subQuads;
        let x: number;
        let y: number;
        let dimension: number;
        let sub: number;
        let preview: Array<any>;

        subQuads = tileUtils.getTilesOfLevel(dTile.quadkey, lookIntoLevel);

        for (let s = 0; s < subQuads.length; s++) {
            x = y = 0;
            dimension = tileSize;

            for (let ldown = 0; ldown < levelDown; ldown++) {
                dimension /= 2;
                sub = subQuads[s][level + ldown];
                x += (sub % 2 * dimension);
                y += (Number(sub > 1) * dimension);

                if (ldown == levelDown - 1 && this.hasData(subQuads[s], layerIndex)) {
                    // clip image
                    preview = preview || [];
                    this.add(preview, subQuads[s], 0, 0, tileSize, x, y, dimension);
                }
            }
        }
        return preview;
    }

    public create(dTile: BasicTile, layer: TileLayer, levelDown?: number, levelUp?: number): any[][] {
        const quadkey = dTile.quadkey;
        const level = quadkey.length;
        const layerMin = layer.min;
        const layerMax = layer.max;
        const maxDown = layerMax - level;
        const maxUp = level - layerMin;
        const lookup = {x: 0, y: 0};
        let i = 0;
        let preview;
        let upLevel;
        let tileSize = layer.tileSize;
        let downLevel;

        levelDown = levelDown || this.down;
        levelUp = levelUp || this.up;

        if (levelUp > maxUp) {
            levelUp = maxUp;
        }

        if (levelDown > maxDown) {
            levelDown = maxDown;
        }

        const max = levelUp > levelDown ? levelUp : levelDown;
        const layerIndex = dTile.index(layer);

        while (i++ < max) {
            upLevel = level - i;

            if (upLevel >= layerMin) {
                if (preview = this.lookUp(dTile, tileSize, level, i, layerIndex, lookup)) {
                    return preview;
                }
            }
            downLevel = level + i;

            if (downLevel <= layerMax) {
                if (i < levelDown) {
                    if (preview = this.lookDown(dTile, tileSize, level, i, layerIndex)) {
                        return preview;
                    }
                }
            }
        }
        // if preview is set to empty Array..
        // -> display will skip preview creation next time.
        return EMPTY_PREVIEW;
    }
}

export default TilePreviewCreator;
