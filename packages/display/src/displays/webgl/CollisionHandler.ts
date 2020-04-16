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

import {tile} from '@here/xyz-maps-core';
import Display from './Display';
import {Attribute} from './buffer/Attribute';
import {Layer} from '../Layers';

const tileUtils = tile.Utils;
type Tile = tile.Tile;

type BBox = { minX: number, maxX: number, minY: number, maxY: number };

type AttributeInfo = { start: number, attr: Attribute };
type Collision = { rendered: any[]; neighbours: BBox[] }


export class CollisionHandler {
    tiles: Map<string, Collision>;

    tileCollision: Collision;

    private display: Display;
    private layerIndex: number;

    constructor(display) {
        this.tiles = new Map();
        this.display = display;
    }

    private intersects(box1: BBox, data: BBox[], i: number = 0) {
        // for (let bbox2 of data) {
        for (let len = data.length, bbox2; i < len; i++) {
            bbox2 = data[i];
            if (bbox2 != null &&
                box1.minX <= bbox2.maxX && bbox2.minX <= box1.maxX && box1.minY <= bbox2.maxY && bbox2.minY <= box1.maxY) {
                return true;
            }
        }
    }

    removeLayer(index: number) {
        this.tiles.forEach((collisionTile) => {
            const {rendered} = collisionTile;
            let i = rendered.length;
            let r;

            while (r = rendered[--i]) {
                if (r.li > index) {
                    r.li--;
                }
            }
        });
    }

    init(quadkey: string, tileX: number, tileY: number, tileZ: number, layer: Layer) {
        // console.log('SET init', quadkey, layer);
        //
        // console.time(quadkey);

        let collisionData = this.tiles.get(quadkey);

        if (!collisionData) {
            const neighbours = [];

            for (let y = -1; y < 2; y++) {
                for (let x = -1; x < 2; x++) {
                    if (x != 0 || y != 0) {
                        let qk = tileUtils.tileXYToQuadKey(tileZ, tileY + y, tileX + x);
                        // let dtile = <GLTile> this.display.buckets.get(qk, true);
                        // let qk = tileUtils.tileXYToQuadKey(tile.z, tile.y + y, tile.x + x);
                        // let neighbour = provider.getCachedTile(qk);
                        // if (neighbour && neighbour.collision) {
                        //     let ren = neighbour.collision.rendered;
                        let collisions = this.tiles.get(qk);
                        if (collisions) {
                            let ren = collisions.rendered;
                            for (let o of ren) {
                                neighbours[neighbours.length] = o;
                            }
                        }
                    }
                }
            }

            this.tiles.set(quadkey, collisionData = {
                rendered: [],
                neighbours: neighbours
            });
        }


        const {index} = layer;

        this.tileCollision = collisionData;

        this.layerIndex = index;
    }

    collides(
        cx: number,
        cy: number,
        width: number,
        height: number,
        tile: Tile,
        tileSize: number,
        bufferOffsetStart: number,
        bufferOffsetEnd: number,
        attributeBuffer,
        priority?: number
    ) {
        // const tileX = tile.x * tileSize;
        // const tileY = tile.y * tileSize;

        let tileX = tile.x * tileSize;
        let tileY = tile.y * tileSize;

        // const estimatedTextWidth = fontInfo.getTextWidth(text);
        // const estimatedTextWidth = fontInfo.avgCharWidth * text.length / 2;

        // console.time('cntGlyphs');
        // let glyphs = 0;
        // for (let c of text) {
        //     if (c != ' ') glyphs++;
        // }
        // console.timeEnd('cntGlyphs');

        const x1 = tileX + cx - width;
        const x2 = tileX + cx + width;
        const y1 = tileY + cy - height;
        const y2 = tileY + cy + height;


        if (tileSize == 256) {
            tileX = (tile.x * .5 ^ 0) * 512;
            tileY = (tile.y * .5 ^ 0) * 512;
        }

        // console.log(tile,'tileSize',tileSize,'->',tileX,tileY);
        // console.log(x1,y1,x2,y2);

        const collisionInfo = this.tileCollision;
        // const collisionInfo = tile.collision;
        const rendered = collisionInfo.rendered;

        const bbox = {
            minX: x1,
            maxX: x2,
            minY: y1,
            maxY: y2,
            tileX: tileX,
            tileY: tileY,
            bos: bufferOffsetStart,
            boe: bufferOffsetEnd,
            li: this.layerIndex,
            _attr: attributeBuffer,
            priority: priority || 0

            // bos: bufferIndex,
            // boe: bufferIndex + glyphs * 18
        };

        if (this.intersects(bbox, rendered) || this.intersects(bbox, collisionInfo.neighbours)) {
            return true;
        }

        rendered.push(bbox);
    }

    private rx: number;
    private rz: number;
    private s: number;

    enforce() {
        // force next update
        this.rx = this.rz = this.s = null;
    }

    clear(quadkey: string, layerIndex: number) {
        const cInfo = this.tiles.get(quadkey);

        if (cInfo) {
            let empty = true;

            // if(quadkey == '023013221') debugger;

            for (let i = 0; i < cInfo.rendered.length; i++) {
                let r = cInfo.rendered[i];
                if (r) {
                    if (r.li == layerIndex) {
                        cInfo.rendered[i] = null;
                    } else {
                        // need for remove layer!!!!!
                        // if (r.li > layerIndex) {
                        //     r.li--;
                        // }

                        empty = false;
                    }
                }
            }

            if (empty) {
                this.tiles.delete(quadkey);
            }
        }


        // this.tiles.delete
    }

    update(tiles, rotX: number, rotZ: number, scale: number) {
        if (!(this.rx != rotX || this.rz != rotZ || this.s != scale)) {
            // no view changes.. no need to recalculate collision
            return;
        }
        this.rx = rotX;
        this.rz = rotZ;
        this.s = scale;

        console.time('update-collisions');

        const {display} = this;
        let rendered = [];

        for (let screentile of tiles) {
            let quadkey = screentile.tile.quadkey;

            let collisions = this.tiles.get(quadkey);

            if (collisions) {
                for (let i = 0, _rendered = collisions.rendered; i < _rendered.length; i++) {
                    let bbox = _rendered[i];

                    // could have been cleared because of LRU drop or layer removed
                    if (!bbox) continue;

                    let attribute = bbox._attr;

                    if (attribute) {
                        let minX = bbox.minX;
                        let maxX = bbox.maxX;
                        let minY = bbox.minY;
                        let maxY = bbox.maxY;
                        let tileWorldX = bbox.tileX;
                        let tileWorldY = bbox.tileY;
                        let halfWidth = (maxX - minX) * .5;
                        let halfHeight = (maxY - minY) * .5;
                        let screenX = screentile.x + minX - tileWorldX;
                        let screenY = screentile.y + minY - tileWorldY;

                        // center
                        screenX += halfWidth;
                        screenY += halfHeight;

                        let ac = display.project(screenX, screenY, 0, 0); // 0,0 for unscaled world pixels

                        // rendered.push([
                        //     ac[0] - halfWidth, // minX
                        //     ac[0] + halfWidth, // maxX
                        //     ac[1] - halfHeight, // minY
                        //     ac[1] + halfHeight, // maxY
                        //     collisions,
                        //     bbox.bos,
                        //     bbox.boe
                        // ]);

                        rendered.push({
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
                    // debug only
                    // window.addPixelPoint(minX, minY, 'red', 5);
                    // window.addPixelPoint(maxX, minY, 'red', 5);
                    // window.addPixelPoint(maxX, maxY, 'red', 5);
                    // window.addPixelPoint(minX, maxY, 'red', 5);
                }
            }
        }


        let r = 0;

        // sort by collision priority
        rendered.sort((a, b) => a.priority - b.priority);

        while (r < rendered.length) {
            let bbox = rendered[r];
            let attribute = bbox.attr;
            let data = attribute.data;
            let start = bbox.bos;
            let stop = bbox.boe;

            if (this.intersects(bbox, rendered, ++r)) {
                // window.addPixelPoint(bbox[0] + .5 * (bbox[1] - bbox[0]), bbox[2] + .5 * (bbox[3] - bbox[2]), 'red');

                // is visible?
                if (data[start + 2] < 720) {
                    // hide all glyphs
                    while (start < stop) {
                        data[start + 2] += 720;
                        start += 3;
                    }
                    attribute.dirty = true;
                }
            } else {
                // is invisible ?
                if (data[start + 2] >= 720) {
                    // show all glyphs again..
                    while (start < stop) {
                        data[start + 2] -= 720;
                        start += 3;
                    }
                    attribute.dirty = true;
                }
            }
        }

        console.timeEnd('update-collisions');
    }
}
