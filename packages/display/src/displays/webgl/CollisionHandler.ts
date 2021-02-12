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

import {Tile, tileUtils} from '@here/xyz-maps-core';
import Display from './Display';
import {Attribute} from './buffer/Attribute';
import {Layer} from '../Layers';
import {FlexAttribute} from './buffer/templates/TemplateBuffer';

type Data = {
    minX: number,
    maxX: number,
    minY: number,
    maxY: number,
    bos: number,
    boe: number,
    attr: Attribute | FlexAttribute,
    priority: number,
    cx?: number,
    cy?: number,
};
type CollisionDataMap = { [dataKey: string]: Data[] }

type LayerTileCollision = {
    tileKey: string,
    data: Data[],
    dataKey: string,
    existing: {
        [dataKey: string]: Data[]
    }
}

export class CollisionHandler {
    private tiles: Map<string, CollisionDataMap>;
    private curLayerTileCollision: LayerTileCollision;
    private display: Display;
    private updated: boolean;
    private rx: number;
    private rz: number;
    private s: number;

    constructor(display: Display) {
        this.tiles = new Map<string, CollisionDataMap>();
        this.display = display;
    }

    private getTileCacheKey(quadkey: string, layer: Layer) {
        return layer.tileSize == 256 ? quadkey.slice(0, -1) : quadkey;
    }

    private getDataKey(quadkey: string, layer: Layer) {
        return `${layer.id}-${quadkey}`;
    }

    private intersects(box1: Data, data: Data[], i: number = 0) {
        for (let len = data.length, bbox2; i < len; i++) {
            bbox2 = data[i];
            if (box1.minX <= bbox2.maxX && bbox2.minX <= box1.maxX && box1.minY <= bbox2.maxY && bbox2.minY <= box1.maxY) {
                return true;
            }
        }
    }

    initTile(tile: Tile, layer: Layer) {
        const neighbours = [];
        let {quadkey, x, y, z} = tile;

        this.clearTile(quadkey, layer);

        if (layer.tileSize == 256) {
            z--;
            y = y * .5 ^ 0;
            x = x * .5 ^ 0;
        }

        for (let ty = -1; ty < 2; ty++) {
            for (let tx = -1; tx < 2; tx++) {
                if (tx != 0 || ty != 0) {
                    let qk = tileUtils.tileXYToQuadKey(z, y + ty, x + tx);
                    let collisionData = this.tiles.get(qk);
                    if (collisionData) {
                        for (let qk in collisionData) {
                            let collisions = collisionData[qk];
                            for (let o of collisions) {
                                neighbours[neighbours.length] = o;
                            }
                        }
                    }
                }
            }
        }

        const tileKey = this.getTileCacheKey(quadkey, layer);

        this.curLayerTileCollision = {
            tileKey: tileKey,
            data: [],
            dataKey: this.getDataKey(quadkey, layer),
            existing: {
                neighbours: neighbours,
                ...this.tiles.get(tileKey) || {}
            }
        };

        this.updated = false;
    }

    insert(
        cx: number,
        cy: number,
        width: number,
        height: number,
        tile: Tile,
        tileSize: number,
        bufferOffsetStart: number,
        bufferOffsetEnd: number,
        attributeBuffer: Attribute | FlexAttribute,
        priority: number = Number.MAX_SAFE_INTEGER
    ): boolean {
        const tileX = tile.x * tileSize;
        const tileY = tile.y * tileSize;
        const x1 = tileX + cx - width;
        const x2 = tileX + cx + width;
        const y1 = tileY + cy - height;
        const y2 = tileY + cy + height;

        // align to 512er tile-grid
        if (tileSize == 256) {
            // tileX = (tile.x * .5 ^ 0) * 512;
            // tileY = (tile.y * .5 ^ 0) * 512;
            cx -= (tile.x * .5 ^ 0) * 512 - tileX;
            cy -= (tile.y * .5 ^ 0) * 512 - tileY;
        }

        const bbox: Data = {
            // tileX: tileX,
            // tileY: tileY,
            cx: cx,
            cy: cy,
            minX: x1,
            maxX: x2,
            minY: y1,
            maxY: y2,
            bos: bufferOffsetStart,
            boe: bufferOffsetEnd,
            attr: attributeBuffer,
            priority: priority
        };

        const {data, existing} = this.curLayerTileCollision;

        if (this.intersects(bbox, data)) {
            return false;
        }
        for (let name in existing) {
            if (this.intersects(bbox, existing[name])) {
                return false;
            }
        }

        this.updated = true;
        data.push(bbox);

        return true;
    }

    completeTile() {
        if (this.updated) {
            // force next update
            this.rx = this.rz = this.s = null;
        }

        const {tileKey, dataKey, data} = this.curLayerTileCollision;
        const tileCollisionData = this.tiles.get(tileKey) || {};

        tileCollisionData[dataKey] = data;

        this.tiles.set(tileKey, tileCollisionData);

        this.curLayerTileCollision = null;
    }

    clearTile(quadkey: string, layer: Layer) {
        const collisionTileKey = this.getTileCacheKey(quadkey, layer);
        const dataKey = this.getDataKey(quadkey, layer);

        if (this.curLayerTileCollision?.dataKey == dataKey) {
            // make sure curLayerTileCollision data does not get dropped when data is attached to an updated tile..
            // (previous tile.data overwrite would lead to drop of updated layerTileCollision)
            return;
        }

        const collisionTile = this.tiles.get(collisionTileKey);

        if (collisionTile) {
            delete collisionTile[dataKey];

            for (let id in collisionTile) {
                // not empty;
                return;
            }
            this.tiles.delete(collisionTileKey);
        }
    }

    update(tiles, rotX: number, rotZ: number, scale: number) {
        if (!(this.rx != rotX || this.rz != rotZ || this.s != scale)) {
            // no view changes.. no need to recalculate collision
            return;
        }
        this.rx = rotX;
        this.rz = rotZ;
        this.s = scale;

        const {display} = this;
        const collisionData: Data[] = [];

        for (let screentile of tiles) {
            let quadkey = screentile.quadkey;

            let tileCollisionData = this.tiles.get(quadkey);

            if (tileCollisionData) {
                for (let segment in tileCollisionData) {
                    const collisions = tileCollisionData[segment];

                    for (let i = 0; i < collisions.length; i++) {
                        const bbox = collisions[i];
                        const attribute = bbox.attr;

                        if (attribute) {
                            let {minX, maxX, minY, maxY} = bbox;
                            let halfWidth = (maxX - minX) * .5;
                            let halfHeight = (maxY - minY) * .5;
                            let screenX = screentile.x + bbox.cx;
                            let screenY = screentile.y + bbox.cy;
                            // let screenX = screentile.x + minX - bbox.tileX + halfWidth;
                            // let screenY = screentile.y + minY - bbox.tileY + halfHeight;
                            let ac = display.project(screenX, screenY, 0, 0); // 0,0 for unscaled world pixels

                            collisionData.push({
                                minX: ac[0] - halfWidth, // minX
                                maxX: ac[0] + halfWidth, // maxX
                                minY: ac[1] - halfHeight, // minY
                                maxY: ac[1] + halfHeight, // maxY
                                bos: bbox.bos,
                                boe: bbox.boe,
                                attr: attribute,
                                priority: bbox.priority
                            });
                        }
                    }
                }
            }
        }

        let d = 0;
        // sort by collision priority
        collisionData.sort((a, b) => b.priority - a.priority);

        while (d < collisionData.length) {
            let bbox = collisionData[d];
            let attribute = bbox.attr;
            let {data, size} = attribute;
            let i = bbox.bos;
            let stop = bbox.boe;
            let visible = (data[i] & 1) == 1;
            let intersects = this.intersects(bbox, collisionData, ++d);

            if (
                // hide all glyphs
                (intersects && visible) ||
                // show all glyphs again (previously hidden)..
                (!intersects && !visible)
            ) {
                while (i < stop) {
                    data[i] ^= 1; // toggle LSB
                    i += size;
                }

                (<Attribute>attribute).dirty = true;
            }
        }
    }

    removeTiles(layer: Layer) {
        const {id} = layer;
        this.tiles.forEach((collisionTile) => {
            for (let key in collisionTile) {
                if (Number(key.split('-')[0]) == id) {
                    delete collisionTile[key];
                }
            }
        });
    }
}
