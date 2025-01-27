/*
 * Copyright (C) 2019-2022 HERE Europe B.V.
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

import {LocalProvider, Tile, TileLayer, tileUtils, webMercator} from '@here/xyz-maps-core';
import Display from './Display';
import {Attribute} from './buffer/Attribute';
import {Layer} from '../Layers';
import {FlexAttribute} from './buffer/templates/TemplateBuffer';
import {Map as MapDisplay} from '../../Map';
import {ViewportTile} from '../BasicDisplay';

const DEBUG = false;
const UPDATE_DELAY_MS = !DEBUG && 150;

export type BBox = {
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
    cz?: number,
    offsetX?: number,
    offsetY?: number,
    halfWidth?: number,
    halfHeight?: number,
    slope?: number[]
};
type CollisionDataMap = { [dataKey: string]: CollisionData[] }

type TileCache = Map<string, CollisionDataMap>;

type LayerTileCollision = {
    tileKey: string,
    tileCache: TileCache,
    tileSize: number,
    bounds: number[],
    data: CollisionData[],
    dataKey: string,
    existing: {
        [dataKey: string]: CollisionData[]
    }
}

export class CollisionHandler {
    private tiles: { [targetZoom: number]: TileCache };
    private curLayerTileCollision: LayerTileCollision;
    private display: Display;
    private updated: boolean;
    // used for bbox debugging only
    private dbgLayers: TileLayer[];
    private dbgSkipNextRefresh: boolean;
    private dbg;
    private _tilesChecked: number;

    constructor(display: Display) {
        this.tiles = {};
        this.display = display;
        this.debug(!!DEBUG);
    }

    private getTileCache(zoom: number) {
        return this.tiles[zoom ^ 0] ||= new Map<string, CollisionDataMap>();
    }

    // debug collision bounding boxes
    debug(dbg: boolean) {
        if (dbg) {
            if (!this.dbgLayers) {
                setTimeout(() => {
                    const map = MapDisplay.getInstances().pop();
                    const tileSize = Math.min(...map.getLayers().map((layer) => layer.tileSize));
                    this.dbgLayers = Array(2).fill(0).map(() => new TileLayer({
                        pointerEvents: false,
                        min: 2,
                        max: 28,
                        tileSize,
                        provider: new LocalProvider({}),
                        adaptiveGrid: true,
                        style: {
                            styleGroups: {
                                box: [{
                                    zLayer: 1e5, zIndex: 0, type: 'Rect',
                                    stroke: ({properties}) => properties.color, strokeWidth: 2,
                                    width: ({properties}) => properties.width,
                                    height: ({properties}) => properties.height,
                                    collide: true
                                }]
                            },
                            assign() {
                                return 'box';
                            }
                        }
                    }));
                    this.dbgLayers.forEach((layer) => map.addLayer(layer));
                }, 0);
            }
        } else if (this.dbgLayers) {
            this.dbgLayers.forEach((l) => l.getProvider().clear());
        }

        this.dbg = dbg;
    }

    // used for bbox debugging only
    private dbgBBoxes(bbox, z: boolean | number, color?: string, worldSize?: number) {
        const map = MapDisplay.getInstances().pop();
        const phase1 = typeof z == 'number';

        for (let box of bbox.boxes) {
            let w = (box.maxX - box.minX) * .5;
            let h = (box.maxY - box.minY) * .5;
            let lon;
            let lat;
            if (phase1) {
                // collision detection phase 1 (world-pixels)
                lon = webMercator.x2lon(box.maxX - w, 1);
                lat = webMercator.y2lat(box.maxY - h, 1);

                worldSize ||= 256 << z;
                w *= worldSize;
                h *= worldSize;
            } else {
                // collision detection phase 2 (projected screen-pixels)
                const geo = map.pixelToGeo(box.minX + w, box.minY + h);
                lon = geo.longitude;
                lat = geo.latitude;

                color = z ? 'orange' : 'green';
            }

            this.dbgLayers[Number(!phase1)].addFeature({
                type: 'Feature',
                geometry: {type: 'Point', coordinates: [lon, lat]},
                properties: {color, width: w * 2, height: h * 2}
            });
        }
    };

    private getTileCacheKey(quadkey: string, layer: Layer) {
        return quadkey;
    }

    private getLayerId(layer: Layer) {
        return layer.layer.id || layer.id;
    }

    private getDataKey(quadkey: string, layer: Layer) {
        return `${this.getLayerId(layer)};${quadkey}`;
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
        return false;
    }

    private updateBBoxes(cx: number, cy: number, slopeX: number, slopeY: number, w: number, h: number, boxCnt: number, result: BBox[]) {
        for (let i = 0; i <= boxCnt; i++) {
            let relPos = (i / boxCnt - .5) * .75;
            let x = slopeX * relPos + cx;
            let y = slopeY * relPos + cy;
            result[i] = {
                minX: x - w,
                maxX: x + w,
                minY: y - h,
                maxY: y + h
            };
        }
    }

    private getTargetZoom(quadkey: string, layer: Layer) {
        return quadkey.length + (<TileLayer>layer.layer).levelOffset ?? 0;
    }

    initTile(tile: Tile, layer: Layer) {
        let {quadkey, x, y, z} = tile;

        const targetZoom = this.getTargetZoom(quadkey, layer);
        const tileCache = this.getTileCache(targetZoom);

        this.clearTile(quadkey, layer, targetZoom);

        let testNeighbors = [];
        let baseTileScale = layer.tileSize / 256;
        let deltaZoom = Math.log2(baseTileScale);

        z += deltaZoom;
        y *= baseTileScale;
        x *= baseTileScale;

        const neighborsPerAxis = baseTileScale + 1;
        const neighbours = {};

        for (let ty = -1; ty < neighborsPerAxis; ty++) {
            for (let tx = -1; tx < neighborsPerAxis; tx++) {
                let nbQk = tileUtils.tileXYToQuadKey(z, y + ty, x + tx);
                testNeighbors.push(nbQk);
                let collisionData = tileCache.get(nbQk);
                if (collisionData) {
                    for (let qk in collisionData) {
                        neighbours[nbQk] = collisionData[qk];
                    }
                }
            }
        }

        const tileKey = this.getTileCacheKey(quadkey, layer);
        const [minLon, minLat, maxLon, maxLat] = tile.bounds;
        this.curLayerTileCollision = {
            tileSize: layer.tileSize,
            bounds: [
                webMercator.lon2x(minLon, 1),
                webMercator.lat2y(maxLat, 1),
                webMercator.lon2x(maxLon, 1),
                webMercator.lat2y(minLat, 1)
            ],
            tileKey,
            tileCache,
            data: [],
            dataKey: this.getDataKey(quadkey, layer),
            existing: neighbours
        };

        this.updated = false;
    }

    insert(
        cx: number,
        cy: number,
        cz: number,
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
        let boxBuffer = 4;
        let zoom = tileZ;
        let worldSize = tileSize << zoom;
        let tilesPerAxis = 1 << zoom;
        const tileScale = 1 / tilesPerAxis;

        cx /= worldSize;
        cy /= worldSize;
        boxBuffer /= worldSize;
        halfWidth /= worldSize;
        halfHeight /= worldSize;
        cx += tileX * tileScale;
        cy += tileY * tileScale;

        halfWidth += boxBuffer;
        halfHeight += boxBuffer;

        const min = Math.min(halfWidth, halfHeight);
        const max = Math.max(halfWidth, halfHeight);
        const x = cx + offsetX / worldSize;
        const y = cy + offsetY / worldSize;
        let aspectRatio = Math.floor(max / min);
        let boxes: BBox[];

        if (slope && aspectRatio > 1.5) {
            halfWidth = min;
            halfHeight = min;
            aspectRatio = Math.floor(aspectRatio * .7);
            boxes = new Array(aspectRatio);
            this.updateBBoxes(x, y, slope[0] / worldSize, slope[1] / worldSize, min, min, aspectRatio, boxes);
        } else {
            boxes = [{
                minX: x - halfWidth,
                maxX: x + halfWidth,
                minY: y - halfHeight,
                maxY: y + halfHeight
            }];
        }

        const collisionData: CollisionData = {
            cx, cy, // cz,
            halfWidth, halfHeight,
            offsetX, offsetY,
            boxes,
            slope,
            priority,
            attrs: []
        };

        const {data, existing} = this.curLayerTileCollision;
        const {dbg} = this;

        if (this.intersects(collisionData, data)) {
            // dbg && this.dbgBBoxes(collisionData, tileZ, '#800', worldSize);
            return false;
        }
        for (let name in existing) {
            // if (existing[name].length) debugger;
            if (this.intersects(collisionData, existing[name])) {
                dbg && this.dbgBBoxes(collisionData, tileZ, '#808', worldSize);
                return false;
            }
        }

        dbg && this.dbgBBoxes(collisionData, tileZ, '#0f0', worldSize);

        this.updated = true;
        data.push(collisionData);

        return collisionData;
    }

    /**
     * Finish phase 1 collision detection (worldspace)
     *
     * @params updateScreenSpaceCollision - true -> update collision (phase 2 projected screen-pixels) for the tile only.
     *
     * @returns boolean indicating if collisions had to be updated
     *
     * @internal
     * @hidden
     */
    completeTile(updateScreenSpaceCollision?: boolean): boolean {
        let {tileKey, dataKey, data, tileCache, tileSize, bounds} = this.curLayerTileCollision;
        let clusters;

        this.curLayerTileCollision = null;

        if (this.updated) {
            if (tileSize > 256) {
                clusters = this.clusterPoints(data, bounds, tileSize);
                for (let subKey in clusters) {
                    const key = tileKey + subKey;
                    const tileCollisionData = tileCache.get(key) || {};
                    tileCollisionData[dataKey] = clusters[subKey];
                    tileCache.set(key, tileCollisionData);
                }
            } else {
                const tileCollisionData = tileCache.get(tileKey) || {};
                tileCollisionData[dataKey] = data;
                tileCache.set(tileKey, tileCollisionData);
            }

            if (updateScreenSpaceCollision) {
                // update collision in projected screen-pixels to minimize possible collisions for newly added tiles to vp...
                // ...until fullscreen phase2 collision detection has been completed.
                this.updateTileSync(this.display.getScreenTile(tileKey, tileSize));
            }
        }
        return this.updated;
    }

    clusterPoints(
        collisionData: CollisionData[],
        tileBounds: number[],
        tileSize: number
        // tileKey: string = ''
    ): { [quadkey: string]: CollisionData[] } {
        const clusters = {};
        const [minX, minY, maxX, maxY] = tileBounds;
        const numSubTiles = tileSize / 256;
        const subTileWidth = (maxX - minX) / numSubTiles;
        const subTileHeight = (maxY - minY) / numSubTiles;
        const dZoom = Math.log2(numSubTiles);

        for (let cData of collisionData) {
            const {cx, cy} = cData;
            const dx = cx - minX;
            const dy = cy - minY;
            const tileX = Math.floor(dx / subTileWidth);
            const tileY = Math.floor(dy / subTileHeight);
            // const clusterKey = tileX | (tileY << 1);
            const clusterKey = tileUtils.tileXYToQuadKey(dZoom, tileY, tileX);
            (clusters[/* tileKey +*/ clusterKey] ||= []).push(cData);
        }
        return clusters;
    }


    clearTile(
        quadkey: string,
        layer: Layer,
        targetZoom: number = this.getTargetZoom(quadkey, layer)
    ) {
        // const collisionTileKey = this.getTileCacheKey(quadkey, layer);
        const dataKey = this.getDataKey(quadkey, layer);
        const tileCache = this.getTileCache(targetZoom);

        if (this.curLayerTileCollision?.dataKey == dataKey) {
            // make sure curLayerTileCollision data does not get dropped when data is attached to an updated tile..
            // (previous tile.data overwrite would lead to drop of updated layerTileCollision)
            return;
        }
        const baseQuadkeys = this.getQuadkeysAtLevel(quadkey, targetZoom);

        for (let subKey of baseQuadkeys) {
            const collisionTile = tileCache.get(subKey);
            if (collisionTile?.[dataKey]) {
                delete collisionTile[dataKey];
                let empty = true;
                for (let id in collisionTile) {
                    empty = false;
                    break;
                }
                if (empty) {
                    tileCache.delete(subKey);
                }
            }
        }
    }

    private timer = null;

    private updateTileSync(tile: ViewportTile) {
        return tile && this.updateTiles([tile], this.display.s, this.display.zoom);
    }


    update(callback: () => void) {
        if (this.timer == null) {
            this.timer = setTimeout(() => {
                // update viewport tiles to match current mapview transformation
                let {tiles, s: scale, zoom} = this.display;
                // console.time('updateCollisions');
                const updated = this.updateTiles(tiles, scale, zoom);
                // console.timeEnd('updateCollisions');
                this.timer = null;
                updated && callback?.();
            }, UPDATE_DELAY_MS);
        }
    }

    private getQuadkeysAtLevel(quadkey: string, targetLevel: number): string[] {
        const currentLevel = quadkey.length;
        if (targetLevel === currentLevel) {
            // If target level is the same as current level, return the original quadkey
            return [quadkey];
        } else if (targetLevel < currentLevel) {
            // Get parent quadkey by slicing
            return [quadkey.slice(0, targetLevel)];
        } else {
            // Get all child quadkeys by expanding
            let keys = [quadkey];
            for (let level = currentLevel; level < targetLevel; level++) {
                const nextKeys: string[] = [];
                for (const key of keys) {
                    nextKeys.push(key + '0', key + '1', key + '2', key + '3');
                }
                keys = nextKeys;
            }
            return keys;
        }
    }


    private updateTiles(tiles: ViewportTile[], displayScale: number, targetZoom: number): boolean {
        let {dbg} = this;
        const collisionData: CollisionData[] = [];

        if (dbg) {
            if (dbg = this.dbgSkipNextRefresh = !this.dbgSkipNextRefresh) {
                this.dbgLayers[1].getProvider().clear();
            }
        }

        this._tilesChecked = 0;

        const checkedTiles = new Set<string>();
        const {centerWorld} = this.display;
        const halfDisplayWidth = this.display.w * .5;
        const halfDisplayHeight = this.display.h * .5;
        const worldSize = 256 << targetZoom;
        const screenWorldTopLeftX = centerWorld[0] * worldSize - halfDisplayWidth;
        const screenWorldTopLeftY = centerWorld[1] * worldSize - halfDisplayHeight;

        // Ensure that scaled tiles, which are only partially visible because smaller or unscaled tiles
        // are covering sections closer to the viewer, are not given priority during collision detection.
        tiles.sort((a, b) => b.scale - a.scale);

        for (let screentile of tiles) {
            const {quadkey, scale: tileScale, size, scaledSize, tileZoomLevel} = screentile;
            const zoom = (targetZoom - Math.log2(tileScale)) ^ 0;
            const baseQuadkeys = this.getQuadkeysAtLevel(quadkey, zoom);
            const tileCache = this.getTileCache(zoom);

            for (let collisionQuadkey of baseQuadkeys) {
                if (checkedTiles.has(collisionQuadkey)) continue;
                checkedTiles.add(collisionQuadkey);

                const tileCollisionData = tileCache.get(collisionQuadkey);

                if (tileCollisionData) {
                    this._tilesChecked++;

                    this.updateTileCollisionData(
                        worldSize,
                        screenWorldTopLeftX,
                        screenWorldTopLeftY,
                        tileScale,
                        tileCollisionData,
                        displayScale,
                        collisionData
                    );
                }
            }
        }

        // sort by collision priority
        collisionData.sort((a, b) => a.priority - b.priority);

        const visibleItemsMapAligned = [];
        const visibleItemsViewportAligned = [];

        let updated = false;

        for (let bbox of collisionData) {
            let visibleItems;
            let intersects = this.intersects(bbox, visibleItemsViewportAligned);
            if (bbox.slope) {
                visibleItems = visibleItemsMapAligned;
            } else {
                intersects ||= this.intersects(bbox, visibleItemsMapAligned);
                visibleItems = visibleItemsViewportAligned;
            }

            if (!intersects) {
                visibleItems[visibleItems.length] = bbox;
            }

            for (let {buffer, start, stop} of bbox.attrs) {
                const {data, size} = buffer;
                const visible = (data[start] & 1) == 1;
                if (
                    // Hide all buffers (intersects && visible) or
                    // restore previously hidden buffers to make them visible again (!intersects && !visible).
                    intersects == visible
                ) {
                    while (start < stop) {
                        data[start] ^= 1; // toggle LSB
                        start += size;
                    }
                    (<Attribute>buffer).dirty = true;
                    updated = true;
                }
            }

            dbg && this.dbgBBoxes(bbox, intersects);
        }
        return updated;
    }

    private updateTileCollisionData(
        worldSize: number,
        screenWorldTopLeftX: number,
        screenWorldTopLeftY: number,
        tileScale: number,
        tileCollisionData: CollisionDataMap,
        displayScale: number,
        collisionData: CollisionData[]
    ) {
        const {display} = this;

        for (let segment in tileCollisionData) {
            const collisions = tileCollisionData[segment];

            for (let cData of collisions) {
                let {attrs, cx, cy, slope, halfWidth, halfHeight, offsetX, offsetY} = cData;
                let screenX = cx * worldSize - screenWorldTopLeftX;
                let screenY = cy * worldSize - screenWorldTopLeftY;

                halfWidth *= worldSize / tileScale;
                halfHeight *= worldSize / tileScale;

                const boxCnt = cData.boxes.length;
                let boxes: BBox[];

                if (boxCnt > 1) {
                    // map aligned
                    boxes = new Array(boxCnt);
                    screenX += offsetX / displayScale;
                    screenY += offsetY / displayScale;

                    let [prjX, prjY] = display.project(screenX, screenY, 0
                        // 0, 0/* -> unscaled world pixels, fixed zoom-level */
                    );
                    let prjScreen2 = display.project(screenX + slope[0], screenY + slope[1], 0
                        // 0, 0
                    );

                    const slopeX = (prjScreen2[0] - prjX) / displayScale;
                    const slopeY = (prjScreen2[1] - prjY) / displayScale;

                    this.updateBBoxes(prjX, prjY, slopeX, slopeY, halfWidth, halfHeight, boxes.length - 1, boxes);
                } else {
                    // viewport aligned
                    let [prjX, prjY] = display.project(screenX, screenY, 0
                        // 0, 0/* -> unscaled world pixels */
                    );

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


    removeTiles(layer: Layer) {
        for (let zoom in this.tiles) {
            this.tiles[zoom].forEach((collisionTile, quadkey) => {
                this.clearTile(quadkey, layer, Number(zoom));
            });
        }
    }
}
