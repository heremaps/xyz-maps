/*
 * Copyright (C) 2019 HERE Europe B.V.
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
type Collision = { rendered: any[]; neighbours: BBox[], attrInfo: AttributeInfo[][] }


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
                neighbours: neighbours,
                attrInfo: []
            });
        }


        const {index} = layer;
        // const attributeData = collisionData.attrInfo[index] = collisionData.attrInfo[index] || [];
        //
        //
        // attributeData.push({
        //     start: collisionData.rendered.length,
        //     attr: null
        // });

        this.tileCollision = collisionData;

        this.layerIndex = index;

        // this.ri = collisionData.rendered.length;

        // console.timeEnd(quadkey);

        // this.tiles.set(tile, this.tileCollision);
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
        attributeBuffer
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
            attrInfo: collisionInfo.attrInfo,
            li: this.layerIndex,
            _attr: attributeBuffer

            // bos: bufferIndex,
            // boe: bufferIndex + glyphs * 18
        };

        if (this.intersects(bbox, rendered) || this.intersects(bbox, collisionInfo.neighbours)) {
            return true;
        }

        rendered.push(bbox);
    }

    // setAttribute(attribute: Attribute) {
    //     // const layerAttrData = this.tileCollision.attrInfo[this.layerIndex];
    //     // layerAttrData[layerAttrData.length - 1].attr = attribute;
    //     const rendered = this.tileCollision.rendered;
    //     for (let i = this.ri; i < rendered.length; i++) {
    //         rendered[i]._attr = attribute;
    //     }
    // }


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

            // const {attrInfo} = cInfo;
            // let start = cInfo.layers[layerIndex];
            // let stop = cInfo.layers[layerIndex+1]||cInfo.rendered.length;
            //
            // while(start<stop){
            //     cInfo.rendered[start++] = null;
            //     cInfo.cnt--;
            // }


            // attrInfo.splice(layerIndex, 1);

            // for (let buffer of buffers) {
            //     for (let a in buffer.attributes) {
            //         for (let i = 0; i < attrInfo.length; i++) {
            //             let ai = attrInfo[i];
            //             if (!ai.attr || ai.attr == buffer.attributes[a]) {
            //                 attrInfo.splice(i--, 1);
            //             }
            //         }
            //     }
            // }
            //
            if (empty) {
                // if (!attrInfo.length) {
                // console.log('drop ', quadkey);
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

        // this._t = tiles;
        // console.log('####', 'updateCollisions', '####');
        // console.log(tiles);
        // console.log(collisionData);
        // console.time('update-collisions');


        const {display} = this;
        let rendered = [];

        for (let screentile of tiles) {
            let quadkey = screentile.tile.quadkey;

            let collisions = this.tiles.get(quadkey);

            if (collisions /* && collisions.attrInfo && collisions.attrInfo.buffer */) {
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
                            // attrInfo: bbox.attrInfo
                            attr: attribute
                        });
                    }


                    // window.addPixelPoint(minX, minY, 'red', 5);
                    // window.addPixelPoint(maxX, minY, 'red', 5);
                    // window.addPixelPoint(maxX, maxY, 'red', 5);
                    // window.addPixelPoint(minX, maxY, 'red', 5);
                }
            }
        }


        let r = 0;

        let total = 0;

        while (r < rendered.length) {
            let bbox = rendered[r];
            // let attribute = this.getAttribute(r, bbox.attrInfo);
            let attribute = bbox.attr;
            let data = attribute.data;
            let start = bbox.bos;
            let stop = bbox.boe;


            total += rendered.length - r;

            if (this.intersects(bbox, rendered, ++r)) {
                // window.addPixelPoint(bbox[0] + .5 * (bbox[1] - bbox[0]), bbox[2] + .5 * (bbox[3] - bbox[2]), 'red');

                // is visible?
                if (data[start + 2] < 720) {
                    // console.log(collisions);
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

            // if(window._wtf){
            //     start = bbox[5];
            //     if (data[start + 2] >= 720) {
            //         // show all letters again..
            //         while (start < stop) {
            //             data[start + 2] -= 720;
            //             start += 3;
            //         }
            //         attribute.dirty = true;
            //     }
            // }
        }

        // console.timeEnd('update-collisions');

        // console.log('rendered', rendered.length, '-- total checks -->', total, '!!');
    }

    // neighbours(qk: string) {
    //     const neighbours = [];
    //     const grid = tileUtils.quadToGrid(qk);
    //     const tileZ = grid[0];
    //     const tileX = grid[2];
    //     const tileY = grid[1];
    //
    //     for (let y = -1; y < 2; y++) {
    //         for (let x = -1; x < 2; x++) {
    //             if (x != 0 || y != 0) {
    //                 let qk = tileUtils.tileXYToQuadKey(tileZ, tileY + y, tileX + x);
    //                 let collisions = this.tiles.get(qk);
    //                 if (collisions) {
    //                     let ren = collisions.rendered;
    //                     for (let o of ren) {
    //                         neighbours[neighbours.length] = o;
    //                     }
    //                 }
    //             }
    //         }
    //     }
    //
    //     return neighbours;
    // }
    //
    // update(tiles, rotX: number, rotZ: number, scale: number) {
    //     if (!(this.rx != rotX || this.rz != rotZ || this.s != scale)) {
    //         // no view changes.. no need to recalculate collision
    //         return;
    //     }
    //
    //     // this.cache = {};
    //
    //     this.rx = rotX;
    //     this.rz = rotZ;
    //     this.s = scale;
    //
    //     const {display} = this;
    //
    //     let n = 0;
    //     console.time('calc-neighbours');
    //     for (let screentile of tiles) {
    //         const quadkey = screentile.tile.quadkey;
    //         let collisions = this.tiles.get(quadkey);
    //
    //         if (collisions /* && collisions.attrInfo && collisions.attrInfo.buffer */) {
    //             let rendered = [];
    //             let neighbours = this.neighbours(quadkey, tiles);
    //
    //             console.log(collisions.neighbours.length,'vs',neighbours.length);
    //
    //             for (let i = 0, _rendered = collisions.rendered; i < _rendered.length; i++) {
    //                 let bbox = _rendered[i];
    //                 let attribute = this.getAttribute(i, bbox.attrInfo);
    //
    //                 if (attribute) {
    //                     let minX = bbox.minX;
    //                     let maxX = bbox.maxX;
    //                     let minY = bbox.minY;
    //                     let maxY = bbox.maxY;
    //                     let tileWorldX = bbox.tileX;
    //                     let tileWorldY = bbox.tileY;
    //                     let halfWidth = (maxX - minX) * .5;
    //                     let halfHeight = (maxY - minY) * .5;
    //                     let screenX = screentile.x + minX - tileWorldX;
    //                     let screenY = screentile.y + minY - tileWorldY;
    //
    //                     // center
    //                     screenX += halfWidth;
    //                     screenY += halfHeight;
    //
    //                     let ac = display.project(screenX, screenY, 0, 0); // 0,0 for unscaled world pixels
    //
    //                     rendered.push({
    //                         minX: ac[0] - halfWidth, // minX
    //                         maxX: ac[0] + halfWidth, // maxX
    //                         minY: ac[1] - halfHeight, // minY
    //                         maxY: ac[1] + halfHeight, // maxY
    //                         bos: bbox.bos,
    //                         boe: bbox.boe,
    //                         // attrInfo: bbox.attrInfo
    //                         attr: attribute
    //                     });
    //                 }
    //             }
    //
    //             let r = 0;
    //             while (r < rendered.length) {
    //                 let bbox = rendered[r];
    //                 let attribute = bbox.attr;
    //                 let data = attribute.data;
    //                 let start = bbox.bos;
    //                 let stop = bbox.boe;
    //
    //                 if (this.intersects(bbox, rendered, ++r)) {
    //                     // is visible?
    //                     if (data[start + 2] < 720) {
    //                         // console.log(collisions);
    //                         // hide all glyphs
    //                         while (start < stop) {
    //                             data[start + 2] += 720;
    //                             start += 3;
    //                         }
    //                         attribute.dirty = true;
    //                     }
    //                 } else {
    //                     // is invisible ?
    //                     if (data[start + 2] >= 720) {
    //                         // show all glyphs again..
    //                         while (start < stop) {
    //                             data[start + 2] -= 720;
    //                             start += 3;
    //                         }
    //                         attribute.dirty = true;
    //                     }
    //                 }
    //
    //             }
    //
    //         }
    //     }
    //     console.timeEnd('calc-neighbours');
    //     console.log('total neighbours', n);
    //
    //     // this._t = tiles;
    //     // console.log('####', 'updateCollisions', '####');
    //     // console.log(tiles);
    //     // console.log(collisionData);
    //     console.time('update-collisions');
    //
    //
    //     let rendered = [];
    //
    //     // for (let screentile of tiles) {
    //     //     let quadkey = screentile.tile.quadkey;
    //     //
    //     //
    //     // }
    //
    //
    //     // let r = 0;
    //     // while (r < rendered.length) {
    //     //     let bbox = rendered[r];
    //     //     // let attribute = this.getAttribute(r, bbox.attrInfo);
    //     //
    //     //     let attribute = bbox.attr;
    //     //
    //     //     // if(!attribute){
    //     //     //     r++;
    //     //     //     continue;
    //     //     // }
    //     //
    //     //
    //     //     let data = attribute.data;
    //     //     let start = bbox.bos;
    //     //     let stop = bbox.boe;
    //     //
    //     //     if (this.intersects(bbox, rendered, ++r)) {
    //     //         // window.addPixelPoint(bbox[0] + .5 * (bbox[1] - bbox[0]), bbox[2] + .5 * (bbox[3] - bbox[2]), 'red');
    //     //
    //     //         // is visible?
    //     //         if (data[start + 2] < 720) {
    //     //             // console.log(collisions);
    //     //             // hide all glyphs
    //     //             while (start < stop) {
    //     //                 data[start + 2] += 720;
    //     //                 start += 3;
    //     //             }
    //     //             attribute.dirty = true;
    //     //         }
    //     //     } else {
    //     //         // is invisible ?
    //     //         if (data[start + 2] >= 720) {
    //     //             // show all glyphs again..
    //     //             while (start < stop) {
    //     //                 data[start + 2] -= 720;
    //     //                 start += 3;
    //     //             }
    //     //             attribute.dirty = true;
    //     //         }
    //     //     }
    //     //
    //     // }
    //
    //     console.timeEnd('update-collisions');
    //
    //     console.log('rendered', rendered.length);
    // }

    // _update() {
    //
    //     const tiles = this._t;
    //     console.time('update-collisions');
    //
    //     const {display} = this;
    //
    //     let rendered = [];
    //
    //     for (let screentile of tiles) {
    //         // let quadkey = screentile.tile.quadkey;
    //         let collisions = this.tiles.get(screentile.tile);
    //
    //         if (collisions && collisions.attr) {
    //             for (let bbox of collisions.rendered) {
    //                 let minX = bbox.minX;
    //                 let maxX = bbox.maxX;
    //                 let minY = bbox.minY;
    //                 let maxY = bbox.maxY;
    //                 let tileWorldX = bbox.tileX;
    //                 let tileWorldY = bbox.tileY;
    //
    //                 // let tileWorldX = bbox[4];
    //                 // let tileWorldY = bbox[5];
    //                 // let minX = bbox[0];
    //                 // let maxX = bbox[1];
    //                 // let minY = bbox[2];
    //                 // let maxY = bbox[3];
    //
    //                 let width = maxX - minX;
    //                 let height = maxY - minY;
    //
    //                 let screenX = screentile.x + minX - tileWorldX;
    //                 let screenY = screentile.y + minY - tileWorldY;
    //
    //
    //                 // center
    //                 screenX += width * .5;
    //                 screenY += height * .5;
    //
    //
    //                 let ac = display.project(screenX, screenY, 0, 0);
    //                 //
    //                 // // window.addPixelPoint(ac[0],ac[1],'red');
    //                 //
    //                 //
    //                 minX = ac[0] - width / 2;
    //                 minY = ac[1] - height / 2;
    //                 maxX = ac[0] + width / 2;
    //                 maxY = ac[1] + height / 2;
    //
    //                 // rendered.push({
    //                 //     minX: minX,
    //                 //     maxX: maxX,
    //                 //     minY: minY,
    //                 //     maxY: maxY,
    //                 // });
    //
    //                 rendered.push([minX, maxX, minY, maxY, collisions, bbox.bos, bbox.boe]);
    //                 // rendered.push([minX, maxX, minY, maxY, collisions, bbox[6], bbox[7]]);
    //
    //
    //                 window.addPixelPoint2(ac[0],ac[1]);
    //
    //                 window.addPixelPoint2(minX, minY);
    //                 window.addPixelPoint2(maxX, minY);
    //                 window.addPixelPoint2(maxX, maxY);
    //                 window.addPixelPoint2(minX, maxY);
    //
    //                 // // window.addPixelPoint(ac[0] - width / 2, ac[1] - height / 2, 'red');
    //                 // window.addPixelPoint(maxX,minY, 'red');
    //                 //
    //                 //
    //                 // // window.addPixelPoint(ac[0]+width,ac[1]+height,'red');
    //                 // // window.addPixelPoint(ac[0]+width/2,ac[1]+height/2,'red');
    //                 //
    //                 //
    //                 // // window.addPixelPoint(screenX,screenY,'red');
    //             }
    //             // console.log(collisions.rendered.length)
    //         }
    //     }
    //
    //     let r = 0;
    //     while (r < rendered.length) {
    //         let bbox = rendered[r];
    //         let collisions = bbox[4];
    //         let attribute = collisions.attr;
    //         let data = attribute.data;
    //         let start = bbox[5];
    //         let stop = bbox[6];
    //
    //         if (collides(bbox, rendered, ++r)) {
    //             // window.addPixelPoint(bbox[0] + .5 * (bbox[1] - bbox[0]), bbox[2] + .5 * (bbox[3] - bbox[2]), 'red');
    //
    //             // is visible?
    //             if (data[start + 2] < 720) {
    //                 // console.log(collisions);
    //                 // hide all glyphs
    //                 while (start < stop) {
    //                     data[start + 2] += 720;
    //                     start += 3;
    //                 }
    //                 attribute.dirty = true;
    //             }
    //         } else {
    //             // is invisible ?
    //             if (data[start + 2] >= 720) {
    //                 // show all glyphs again..
    //                 while (start < stop) {
    //                     data[start + 2] -= 720;
    //                     start += 3;
    //                 }
    //                 attribute.dirty = true;
    //             }
    //         }
    //
    //         // if(window._wtf){
    //         //     start = bbox[5];
    //         //     if (data[start + 2] >= 720) {
    //         //         // show all letters again..
    //         //         while (start < stop) {
    //         //             data[start + 2] -= 720;
    //         //             start += 3;
    //         //         }
    //         //         attribute.dirty = true;
    //         //     }
    //         // }
    //     }
    //
    //     console.timeEnd('update-collisions');
    // }
}
