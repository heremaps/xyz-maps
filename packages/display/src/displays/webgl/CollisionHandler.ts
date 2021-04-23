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

export type CollisionData = {
    minX: number,
    maxX: number,
    minY: number,
    maxY: number,
    attrs: { start: number, stop: number, buffer: Attribute | FlexAttribute }[],
    priority: number,
    cx?: number,
    cy?: number,
    offsetX?: number,
    offsetY?: number
};
type CollisionDataMap = { [dataKey: string]: CollisionData[] }

type LayerTileCollision = {
    tileKey: string,
    data: CollisionData[],
    dataKey: string,
    existing: {
        [dataKey: string]: CollisionData[]
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

    private intersects(box1: CollisionData, data: CollisionData[], i: number = 0): boolean {
        for (let len = data.length, bbox2; i < len; i++) {
            bbox2 = data[i];
            if (box1.minX <= bbox2.maxX && bbox2.minX <= box1.maxX && box1.minY <= bbox2.maxY && bbox2.minY <= box1.maxY) {
                return bbox2;
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
        offsetX: number,
        offsetY: number,
        width: number,
        height: number,
        tile: Tile,
        tileSize: number,
        priority: number = Number.MAX_SAFE_INTEGER
    ): CollisionData | false {
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

        const bbox: CollisionData = {
            // tileX: tileX,
            // tileY: tileY,
            cx: cx + offsetX,
            cy: cy + offsetY,
            offsetX: offsetX,
            offsetY: offsetY,
            minX: x1,
            maxX: x2,
            minY: y1,
            maxY: y2,
            priority: priority,
            attrs: []
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

        bbox.cx -= offsetX;
        bbox.cy -= offsetY;

        this.updated = true;
        data.push(bbox);

        return bbox;
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
        const collisionData: CollisionData[] = [];

        for (let screentile of tiles) {
            let quadkey = screentile.quadkey;

            let tileCollisionData = this.tiles.get(quadkey);

            if (tileCollisionData) {
                for (let segment in tileCollisionData) {
                    const collisions = tileCollisionData[segment];

                    for (let i = 0; i < collisions.length; i++) {
                        const bbox = collisions[i];
                        const {attrs} = bbox;

                        let {minX, maxX, minY, maxY} = bbox;
                        let halfWidth = (maxX - minX) * .5;
                        let halfHeight = (maxY - minY) * .5;
                        let screenX = screentile.x + bbox.cx;
                        let screenY = screentile.y + bbox.cy;
                        // let screenX = screentile.x + minX - bbox.tileX + halfWidth;
                        // let screenY = screentile.y + minY - bbox.tileY + halfHeight;
                        let ac = display.project(screenX, screenY, 0, 0); // 0,0 for unscaled world pixels

                        ac[0] += bbox.offsetX;
                        ac[1] += bbox.offsetY;

                        collisionData.push({
                            minX: ac[0] - halfWidth,
                            maxX: ac[0] + halfWidth,
                            minY: ac[1] - halfHeight,
                            maxY: ac[1] + halfHeight,
                            attrs,
                            priority: bbox.priority
                        });
                    }
                }
            }
        }

        // sort by collision priority
        collisionData.sort((a, b) => a.priority - b.priority);

        const visibleItems = [];

        for (let bbox of collisionData) {
            let intersects = this.intersects(bbox, visibleItems);

            if (!intersects) {
                visibleItems.push(bbox);
            }

            for (let {buffer, start, stop} of bbox.attrs) {
                let {data, size} = buffer;
                let visible = (data[start] & 1) == 1;

                if (
                    // hide all glyphs
                    (intersects && visible) ||
                    // show all glyphs again (previously hidden)..
                    (!intersects && !visible)
                ) {
                    while (start < stop) {
                        data[start] ^= 1; // toggle LSB
                        start += size;
                    }

                    (<Attribute>buffer).dirty = true;
                }
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
