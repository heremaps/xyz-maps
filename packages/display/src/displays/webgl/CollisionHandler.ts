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

import {LocalProvider, tile, Tile, TileLayer, tileUtils, webMercator} from '@here/xyz-maps-core';
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
    data: CollisionData[],
    layer: Layer,
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
                    const map = MapDisplay.getInstances().find((map) => map._display == this.display);
                    this.dbgLayers = Array(2).fill(0).map(() => new TileLayer({
                        pointerEvents: false,
                        min: 2,
                        max: 28,
                        tileSize: 512,
                        provider: new LocalProvider({}),
                        adaptiveGrid: true,
                        style: {
                            zLayer: 1e5,
                            styleGroups: {
                                box: [{
                                    zIndex: 0, type: 'Rect', strokeWidth: 2,
                                    stroke: ({properties}) => properties.color,
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
                    this.dbgLayers.forEach((layer) => {
                        map.addLayer(layer);
                        this.display.layers.get(layer).skipDbgGrid = true;
                    });
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

    private getLayerId(layer: Layer): string {
        return String(layer.layer.id || layer.id);
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
        return quadkey.length;
        // return quadkey.length + (<TileLayer>layer.layer).levelOffset ?? 0;
    }

    initTile(tile: Tile, layer: Layer) {
        let {quadkey, x, y, z} = tile;

        const targetZoom = this.getTargetZoom(quadkey, layer);
        const tileCache = this.getTileCache(targetZoom);

        this.clearTile(quadkey, layer, targetZoom);

        // let baseTileScale = layer.tileSize / 256;
        // let deltaZoom = Math.log2(baseTileScale);
        // z += deltaZoom;
        // y *= baseTileScale;
        // x *= baseTileScale;
        // const neighborsPerAxis = baseTileScale + 1;

        const neighborsPerAxis = 2;
        const neighbours = {};

        for (let ty = -1; ty < neighborsPerAxis; ty++) {
            for (let tx = -1; tx < neighborsPerAxis; tx++) {
                let nbQk = tileUtils.tileXYToQuadKey(z, y + ty, x + tx);
                let collisionData = tileCache.get(nbQk);
                if (collisionData) {
                    for (let qk in collisionData) {
                        neighbours[nbQk] = collisionData[qk];
                    }
                }
            }
        }

        const tileKey = this.getTileCacheKey(quadkey, layer);
        this.curLayerTileCollision = {
            tileSize: layer.tileSize,
            tileKey,
            tileCache,
            data: [],
            layer,
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
            cx, cy, cz,
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
            if (this.intersects(collisionData, existing[name])) {
                dbg && this.dbgBBoxes(collisionData, tileZ, '#680025', worldSize);
                return false;
            }
        }

        // dbg && this.dbgBBoxes(collisionData, tileZ, '#0f0', worldSize);

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
        if (!this.updated) return false;

        let {tileKey, data, tileCache, tileSize, layer} = this.curLayerTileCollision;

        this.curLayerTileCollision = null;

        const tileCollisionData = tileCache.get(tileKey) || {};
        tileCollisionData[this.getLayerId(layer)] = data;
        tileCache.set(tileKey, tileCollisionData);

        if (updateScreenSpaceCollision) {
            // update collision in projected screen-pixels to minimize possible collisions for newly added tiles to vp...
            // ...until fullscreen phase2 collision detection has been completed.
            this.updateTileSync(this.display.getScreenTile(tileKey, tileSize), layer);
        }

        return this.updated;
    }

    clearTile(
        quadkey: string,
        layer: Layer,
        targetZoom: number = this.getTargetZoom(quadkey, layer)
    ) {
        const layerId = this.getLayerId(layer);
        const tileCache = this.getTileCache(targetZoom);

        if (this.curLayerTileCollision && this.getLayerId(this.curLayerTileCollision.layer) == layerId) {
            // make sure curLayerTileCollision data does not get dropped when data is attached to an updated tile...
            // (previous tile.data overwrite would lead to drop of updated layerTileCollision)
            return;
        }

        const collisionTile = tileCache.get(quadkey);
        if (collisionTile?.[layerId]) {
            delete collisionTile[layerId];
            let empty = true;
            for (let id in collisionTile) {
                empty = false;
                break;
            }
            if (empty) {
                tileCache.delete(quadkey);
            }
        }
    }

    private timer = null;

    private updateTileSync(tile: ViewportTile, layer: Layer) {
        if (tile) {
            this.computeScreenCollisions([layer], [tile]);
        }
    }


    update(tiles: ViewportTile[], callback: () => void) {
        if (this.timer == null) {
            this.timer = setTimeout(() => {
                if (this.dbg) {
                    if (this.dbgSkipNextRefresh = !this.dbgSkipNextRefresh) {
                        this.dbgLayers[1].getProvider().clear();
                    }
                }
                const updated = this.computeScreenCollisions(this.display.layers);

                this.timer = null;
                updated && callback?.();
            }, UPDATE_DELAY_MS);
        }
    }

    private computeScreenCollisions(layers: Iterable<Layer>, tiles?: ViewportTile[], screenCollisionData: CollisionData[] = []): boolean {
        const {centerWorld, w, h, s: scale, zoom} = this.display;
        const worldSize = 256 << zoom;
        const screenWorldTopLeftX = centerWorld[0] * worldSize - w * .5;
        const screenWorldTopLeftY = centerWorld[1] * worldSize - h * .5;
        // update viewport tiles to match current mapview transformation
        for (let layer of layers) {
            this.collisionsWorld2Screen(
                screenCollisionData,
                worldSize,
                screenWorldTopLeftX,
                screenWorldTopLeftY,
                tiles || layer.tiles,
                layer,
                scale
            );
        }
        return this.intersectCollisionData(screenCollisionData);
    }

    private collisionsWorld2Screen(
        visible: CollisionData[],
        worldSize: number,
        screenWorldTopLeftX: number,
        screenWorldTopLeftY: number,
        tiles: ViewportTile[],
        layer: Layer,
        displayScale: number
    ) {
        const layerId = this.getLayerId(layer);

        for (let screentile of tiles) {
            const {quadkey, scale: tileScale} = screentile;

            const zoom = quadkey.length;
            const tileCache = this.getTileCache(zoom);
            const tileCollisionData = tileCache.get(quadkey);

            if (tileCollisionData) {
                this.updateTileCollisionData(
                    layerId,
                    worldSize,
                    screenWorldTopLeftX,
                    screenWorldTopLeftY,
                    tileScale,
                    tileCollisionData,
                    displayScale,
                    visible
                );
            }
        }
    }

    private intersectCollisionData(visible: CollisionData[]): boolean {
        // sort by collision priority
        visible.sort((a, b) => a.priority - b.priority);

        const visibleItemsMapAligned = [];
        const visibleItemsViewportAligned = [];

        let updated = false;

        for (let bbox of visible) {
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

            if (this.dbg) {
                this.dbgBBoxes(bbox, intersects);
            }
        }
        return updated;
    }

    private updateTileCollisionData(
        layerId: string,
        worldSize: number,
        screenWorldTopLeftX: number,
        screenWorldTopLeftY: number,
        tileScale: number,
        tileCollisionData: CollisionDataMap,
        displayScale: number,
        collisionData: CollisionData[]
    ) {
        const {display} = this;

        for (let layer in tileCollisionData) {
            if (layer != layerId) {
                continue;
            }
            const collisions = tileCollisionData[layerId];

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
