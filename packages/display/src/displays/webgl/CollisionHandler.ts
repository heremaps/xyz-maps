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

import {LocalProvider, Tile, TileLayer, tileUtils} from '@here/xyz-maps-core';
import Display from './Display';
import {Attribute} from './buffer/Attribute';
import {Layer} from '../Layers';
import {FlexAttribute} from './buffer/templates/TemplateBuffer';
import {webMercator} from '@here/xyz-maps-core';
import {Map as MapDisplay} from '../../Map';

const DEBUG = false;

type BBox = {
    minX: number,
    maxX: number,
    minY: number,
    maxY: number
};

export type CollisionData = {
    boxes: BBox[],
    attrs: { start: number, stop: number, buffer: Attribute | FlexAttribute }[],
    priority: number,
    cx?: number,
    cy?: number,
    offsetX?: number,
    offsetY?: number,
    halfWidth?: number,
    halfHeight?: number,
    slope?: number[]
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

    // used for bbox debugging only
    private dbgLayers: TileLayer[];

    constructor(display: Display) {
        this.tiles = new Map<string, CollisionDataMap>();
        this.display = display;

        if (DEBUG) {
            this.dbgLayers = ([
                new TileLayer({pointerEvents: false, min: 2, max: 28, provider: new LocalProvider({})}),
                new TileLayer({pointerEvents: false, min: 2, max: 28, provider: new LocalProvider({})})
            ]);
            setTimeout(() => this.dbgLayers.forEach((l) => MapDisplay.getInstances().pop().addLayer(l)), 0);
        }
    }

    // used for bbox debugging only
    private dbgBBoxes(bbox, z: boolean | number, color?: string) {
        const map = MapDisplay.getInstances().pop();
        let sw = 2;
        let zIndex = 1;

        for (let box of bbox.boxes) {
            let w = (box.maxX - box.minX) * .5;
            let h = (box.maxY - box.minY) * .5;
            let lon;
            let lat;
            if (typeof z == 'number') {
                // collision detection phase 1 (world-pixels)
                const ws = webMercator.mapSizePixel(512, z);
                lon = webMercator.x2lon(box.maxX - w, ws);
                lat = webMercator.y2lat(box.maxY - h, ws);
                sw = 3;
                zIndex = 0;
            } else {
                // collision detection phase 2 (projected screen-pixels)
                const geo = map.pixelToGeo(box.minX + w, box.minY + h);
                lon = geo.longitude;
                lat = geo.latitude;
                color = z ? 'orange' : 'green';
            }

            this.dbgLayers[Number(typeof z != 'number')].addFeature(
                {type: 'Feature', geometry: {type: 'Point', coordinates: [lon, lat]}},
                [{zLayer: 1e5, zIndex: zIndex, type: 'Rect', stroke: color, strokeWidth: sw, width: w * 2, height: h * 2, collide: true}]
            );
        }
    };

    private getTileCacheKey(quadkey: string, layer: Layer) {
        return layer.tileSize == 256 ? quadkey.slice(0, -1) : quadkey;
    }

    private getDataKey(quadkey: string, layer: Layer) {
        return `${layer.id}-${quadkey}`;
    }

    private intersects(box1: CollisionData, data: CollisionData[]): boolean {
        const boxes1 = box1.boxes;
        for (let {boxes} of data) {
            for (let bbox2 of boxes) {
                for (let bbox1 of boxes1) {
                    if (bbox1.minX <= bbox2.maxX && bbox2.minX <= bbox1.maxX && bbox1.minY <= bbox2.maxY && bbox2.minY <= bbox1.maxY) {
                        return true;
                    }
                }
            }
        }
    }

    private updateBBoxes(cx: number, cy: number, slope: number[], w: number, h: number, boxes, result: BBox[]) {
        for (let i = 0; i <= boxes; i++) {
            let relPos = (i / boxes - 0.5) * .75;
            let x = slope[0] * relPos + cx;
            let y = slope[1] * relPos + cy;
            result[i] = {
                minX: x - w,
                maxX: x + w,
                minY: y - h,
                maxY: y + h
            };
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
        halfWidth: number,
        halfHeight: number,
        tile: Tile,
        tileSize: number,
        priority: number = Number.MAX_SAFE_INTEGER,
        slope?: number[]
    ): CollisionData | false {
        let tileX = tile.x;
        let tileY = tile.y;
        let tileZ = tile.z;

        // align to 512er tile-grid
        if (tileSize == 256) {
            cx += tileX % 2 * tileSize;
            cy += tileY % 2 * tileSize;
            tileSize *= 2;
            tileX = tileX * .5 ^ 0;
            tileY = tileY * .5 ^ 0;
            tileZ--;
        }

        tileX = tileX * tileSize + offsetX;
        tileY = tileY * tileSize + offsetY;

        let boxes: BBox[];
        const boxBuffer = 4;

        halfWidth += boxBuffer;
        halfHeight += boxBuffer;

        const min = Math.min(halfWidth, halfHeight);
        const max = Math.max(halfWidth, halfHeight);
        let aspectRatio = Math.floor(max / min);

        if (slope && aspectRatio > 1.5) {
            halfWidth = min;
            halfHeight = min;
            aspectRatio = Math.floor(aspectRatio * .7);
            boxes = new Array(aspectRatio);

            this.updateBBoxes(cx + tileX, cy + tileY, slope, min, min, aspectRatio, boxes);
        } else {
            boxes = [{
                minX: tileX + cx - halfWidth,
                maxX: tileX + cx + halfWidth,
                minY: tileY + cy - halfHeight,
                maxY: tileY + cy + halfHeight
            }];
        }

        const collisionData: CollisionData = {
            cx, cy,
            halfWidth, halfHeight,
            offsetX, offsetY,
            boxes,
            slope,
            priority,
            attrs: []
        };

        const {data, existing} = this.curLayerTileCollision;

        if (this.intersects(collisionData, data)) {
            DEBUG && this.dbgBBoxes(collisionData, tileZ, 'red');
            return false;
        }
        for (let name in existing) {
            if (this.intersects(collisionData, existing[name])) {
                DEBUG && this.dbgBBoxes(collisionData, tileZ, 'red');
                return false;
            }
        }

        // DEBUG && this.dbgBBoxes(collisionData, tileZ, 'rgba(255,0,255,1.0)');

        this.updated = true;
        data.push(collisionData);

        return collisionData;
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


        DEBUG && this.dbgLayers[1].getProvider().clear();

        // console.time('updateCollisions');

        for (let screentile of tiles) {
            let quadkey = screentile.quadkey;
            let tileCollisionData = this.tiles.get(quadkey);

            if (tileCollisionData) {
                for (let segment in tileCollisionData) {
                    const collisions = tileCollisionData[segment];

                    for (let cData of collisions) {
                        const {attrs} = cData;
                        let {slope, halfWidth, halfHeight} = cData;
                        let screenX = screentile.x + cData.cx;
                        let screenY = screentile.y + cData.cy;
                        let offsetX = cData.offsetX / scale;
                        let offsetY = cData.offsetY / scale;
                        let boxes;

                        if (slope) {
                            // map aligned
                            boxes = new Array(cData.boxes.length);
                            screenX += offsetX;
                            screenY += offsetY;
                            let [prjX, prjY] = display.project(screenX, screenY, 0, 0/* -> unscaled world pixels */);
                            let prjScreen2 = display.project(screenX + slope[0], screenY + slope[1], 0, 0);
                            slope = [
                                (prjScreen2[0] - prjX) / scale,
                                (prjScreen2[1] - prjY) / scale
                            ];
                            this.updateBBoxes(prjX, prjY, slope, halfWidth, halfHeight, boxes.length - 1, boxes);
                        } else {
                            // viewport aligned
                            const [prjX, prjY] = display.project(screenX, screenY, 0, 0/* -> unscaled world pixels */);
                            boxes = [{
                                minX: prjX - halfWidth + offsetX,
                                maxX: prjX + halfWidth + offsetX,
                                minY: prjY - halfHeight + offsetY,
                                maxY: prjY + halfHeight + offsetY
                            }];
                        }

                        collisionData.push({
                            boxes,
                            attrs,
                            slope,
                            priority: cData.priority
                        });
                    }
                }
            }
        }

        // sort by collision priority
        collisionData.sort((a, b) => a.priority - b.priority);

        const visibleItemsMapAligned = [];
        const visibleItemsViewportAligned = [];

        for (let bbox of collisionData) {
            let visibleItems;
            let intersects = this.intersects(bbox, visibleItemsViewportAligned);

            if (bbox.slope) {
                visibleItems = visibleItemsMapAligned;
            } else {
                intersects = intersects || this.intersects(bbox, visibleItemsMapAligned);
                visibleItems = visibleItemsViewportAligned;
            }

            if (!intersects) {
                visibleItems.push(bbox);
            }

            for (let {buffer, start, stop} of bbox.attrs) {
                const {data, size} = buffer;
                const visible = (data[start] & 1) == 1;

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

            if (DEBUG) {
                this.dbgBBoxes(bbox, intersects);
            }
        }

        // console.timeEnd('updateCollisions');
        // console.log('visible', visibleItemsMapAligned.length + visibleItemsViewportAligned.length, 'of', collisionData.length, 'total');
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
