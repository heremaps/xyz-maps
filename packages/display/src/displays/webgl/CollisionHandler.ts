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
import {TaskManager, Task, TaskOptions} from '@here/xyz-maps-common';
import {LocalProvider, Tile, TileLayer, tileUtils, webMercator} from '@here/xyz-maps-core';
import Display from './Display';
import {Attribute} from './buffer/Attribute';
import {Layer} from '../Layers';
import {FlexAttribute} from './buffer/templates/TemplateBuffer';
import {mapInstances} from '../../MapInstances';
import {DisplayTile, ViewportTile} from '../BasicDisplay';
import {BUFFER_FACTORY_TASK_PRIORITY} from './buffer/factory/GeometryBufferFactory';
import {measureStart, measureEnd, measurePause, measureResume, MeasureHandle} from './PerfTimer';


const DEBUG = false;
const UPDATE_DELAY_MS = !DEBUG && (1000 / 4); // 4 times per second

export type BBox = {
    minX: number,
    maxX: number,
    minY: number,
    maxY: number
};

export type CollisionData = {
    boxes: BBox[],
    attrs: { start: number, stop: number, attr: Attribute | FlexAttribute }[],
    priority: number,
    cx?: number,
    cy?: number,
    // absolute height for collision projection.
    cz: number // altitude in meters (above sea level).
        | string // terrain height key (e.g. a quadkey) used to resolve elevation from terrain data.,
        | null // flat geometry; corresponding GeometryBuffer is created in 2D (x,y).
    offsetX?: number,
    offsetY?: number,
    halfWidth?: number,
    halfHeight?: number,
    isMapAligned: boolean,
    // map-aligned vector defines the direction/extent used to generate multiple collision boxes along that axis (e.g., for long labels).
    slope?: number[]
};
type CollisionDataMap = { [dataKey: string]: CollisionData[] }

type TileCache = Map<string, CollisionDataMap>;

type LayerTileCollision = {
    // tileKey: string,
    tile: Tile,
    tileCache: TileCache,
    data: CollisionData[],
    layer: Layer,
    existing: {
        [dataKey: string]: CollisionData[]
    }
}


const CollisionTask: TaskOptions<[CollisionHandler, Iterable<Layer>, () => void], {
    perfHandle?: MeasureHandle,
    screenCollisionData: CollisionData[],
    index: number,
    sorted: boolean,
    updated: boolean,
    processBatchSize: number,
    visibleMap: CollisionData[],
    visibleViewport: CollisionData[],
    collisionHandler: CollisionHandler,
    onDone?: (updated: boolean) => void
}> = {
    time: 4,
    priority: BUFFER_FACTORY_TASK_PRIORITY - 1,
    init([collisionHandler, layers, onDone]) {
        // const perfHandle = measureStart('CollisionTask');
        // measurePause(perfHandle);

        const screenCollisionData = collisionHandler.projectCollisionsToScreen(layers, null);
        // sort by collision priority
        screenCollisionData.sort((a, b) => a.priority - b.priority);

        return {
            // perfHandle,
            screenCollisionData,
            index: 0,
            sorted: false,
            updated: false,
            processBatchSize: 100,
            visibleMap: [],
            visibleViewport: [],
            collisionHandler,
            onDone
        };
    },
    exec(taskData) {
        // measureResume(taskData.perfHandle);
        const {collisionHandler, screenCollisionData, visibleMap, visibleViewport, processBatchSize} = taskData;
        const visible: CollisionData[] = screenCollisionData;

        for (let i = taskData.index, len = visible.length; i < len;) {
            const bbox = visible[i++];
            const updateBBox = collisionHandler.processCollision(bbox, visibleMap, visibleViewport);
            taskData.updated ||= updateBBox;
            if (i % processBatchSize == 0) {
                taskData.index = i;
                // measurePause(taskData.perfHandle);
                return true;
            }
        }
        // measurePause(taskData.perfHandle);
        return false;
    },
    onDone(data) {
        // measureEnd(data.perfHandle);
        data.onDone(data.updated);
    }
};


export class CollisionHandler {
    private tiles: { [targetZoom: number]: TileCache };
    private curLayerTileCollision: LayerTileCollision;
    private display: Display;
    private updated: boolean;
    // used for bbox debugging only
    private dbgLayers: TileLayer[];
    private dbgSkipNextRefresh: boolean;
    private dbg;
    private task: Task;
    private maxMapAlignedPitch: number = 70 / 180 * Math.PI;

    constructor(display: Display) {
        this.tiles = {};
        this.display = display;
        this.debug(!!DEBUG);
        this.task = TaskManager.getInstance().create(CollisionTask);
    }

    private getTileCache(zoom: number) {
        return this.tiles[zoom ^ 0] ||= new Map<string, CollisionDataMap>();
    }

    // debug collision bounding boxes
    debug(dbg: boolean) {
        if (dbg) {
            if (!this.dbgLayers) {
                setTimeout(() => {
                    const map = mapInstances.find((map) => (map as any)._display == this.display);
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
                                    collide: true,
                                    altitude: true
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
    private dbgBBoxes(bbox: CollisionData, z: boolean | number, color?: string, worldSize?: number) {
        const map = mapInstances[mapInstances.length - 1];
        const phase1 = typeof z == 'number';

        for (let box of bbox.boxes) {
            let w = (box.maxX - box.minX) * .5;
            let h = (box.maxY - box.minY) * .5;
            const altitude = bbox.cz as number ?? 0;
            const coordinates = [0, 0, altitude];
            if (phase1) {
                // collision detection phase 1 (world-pixels)
                coordinates[0] = webMercator.x2lon(box.maxX - w, 1);
                coordinates[1] = webMercator.y2lat(box.maxY - h, 1);

                worldSize ||= 256 << z;
                w *= worldSize;
                h *= worldSize;
            } else {
                // collision detection phase 2 (projected screen-pixels)
                const geo = map.pixelToGeo(box.minX + w, box.minY + h);
                coordinates[0] = geo.longitude;
                coordinates[1] = geo.latitude;

                color = z ? 'orange' : 'green';
            }

            this.dbgLayers[Number(!phase1)].addFeature({
                type: 'Feature',
                geometry: {type: 'Point', coordinates},
                properties: {color, width: w * 2, height: h * 2}
            });
        }
    };

    private getTileCacheKey(quadkey: string, layer?: Layer) {
        return quadkey;
    }

    private getLayerId(layer: Layer): string {
        return String(layer.layer.id || layer.id);
    }

    private static readonly MAP_ALIGNED_MIN_SHRINK = 0.35;
    private static readonly MAP_ALIGNED_MAX_PITCH_RAD = (75 * Math.PI) / 180;

    private _mapPitchShrinkFactor: number = 1;
    private _mapPitchShrinkFactorPitch: number = 0;
    private getMapAlignedShrinkFactor(): number {
        // 1.0 at pitch 0, down to MIN_SHRINK at/above MAX_PITCH.
        // const pitch = Math.abs(this.display.rx ?? 0);
        // const t = Math.min(1, pitch / CollisionHandler.MAP_ALIGNED_MAX_PITCH_RAD);
        // return 1 - t * (1 - CollisionHandler.MAP_ALIGNED_MIN_SHRINK);
        const pitch = this.display.rx;
        if (this._mapPitchShrinkFactorPitch !== pitch) {
            this._mapPitchShrinkFactorPitch = pitch;
            this._mapPitchShrinkFactor = Math.max(0, Math.min(1, Math.cos(pitch)));
        }
        return this._mapPitchShrinkFactor;
    }

    private intersects(box1: CollisionData, data: CollisionData[]): boolean {
        const boxes1 = box1.boxes;
        for (let i = 0, length = data.length; i < length; ++i) {
            const boxes2 = data[i].boxes;
            for (let j = 0, length2 = boxes2.length; j < length2; ++j) {
                const bbox2 = boxes2[j];
                for (let k = 0, bbox = bbox2, length1 = boxes1.length; k < length1; ++k) {
                    const bbox1 = boxes1[k];
                    if (
                        bbox1.minX <= bbox.maxX &&
                        bbox.minX <= bbox1.maxX &&
                        bbox1.minY <= bbox.maxY &&
                        bbox.minY <= bbox1.maxY
                    ) {
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

        // const tileKey = this.getTileCacheKey(quadkey, layer);
        this.curLayerTileCollision = {
            tile,
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
        // null to indicates geometry is 2d/flat
        cz: number | 'terrain' | null,
        offsetX: number,
        offsetY: number,
        halfWidth: number,
        halfHeight: number,
        // tile: Tile,
        // tileSize: number,
        priority: number = Number.MAX_SAFE_INTEGER,
        isMapAligned: boolean,
        slope?: number[]
    ): CollisionData | false {
        const {tile, layer, data, existing} = this.curLayerTileCollision;
        const {dbg} = this;
        const tileSize = layer.tileSize;

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

        const centerZ = cz === 'terrain' ? tile.quadkey : cz; // || 0;

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
            cx, cy,
            cz: centerZ,
            halfWidth, halfHeight,
            offsetX, offsetY,
            boxes,
            slope,
            isMapAligned,
            priority,
            attrs: []
        };

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
        const {data, tileCache, tile, layer} = this.curLayerTileCollision;
        const tileKey = this.getTileCacheKey(tile.quadkey, layer);
        const tileCollisionData = tileCache.get(tileKey) || {};

        this.curLayerTileCollision = null;

        tileCollisionData[this.getLayerId(layer)] = data;
        tileCache.set(tileKey, tileCollisionData);

        if (updateScreenSpaceCollision && this.updated) {
            // update collision in projected screen-pixels to minimize possible collisions for newly added tiles to vp...
            // ...until fullscreen phase2 collision detection has been completed.
            this.updateTileSync(this.display.getScreenTile(tileKey, layer), layer);
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

    private isUpdating: boolean;

    private updateTileSync(tile: DisplayTile, layer: Layer) {
        if (tile) {
            const screenCollisionData = this.projectCollisionsToScreen([layer], [tile]);
            return this.intersectCollisionData(screenCollisionData);
        }
    }


    update(tiles: ViewportTile[], callback: () => void) {
        if (!this.isUpdating) {
            this.isUpdating = true;
            setTimeout(() => {
                if (this.dbg) {
                    if (this.dbgSkipNextRefresh = !this.dbgSkipNextRefresh) {
                        this.dbgLayers[1].getProvider().clear();
                    }
                }
                this.task.start([this, this.display.layers, (updated: boolean) => {
                    this.isUpdating = false;
                    if (updated) {
                        callback?.();
                    }
                }]);
            }, UPDATE_DELAY_MS);
        }
    }


    projectCollisionsToScreen(layers: Iterable<Layer>, tiles?: DisplayTile[]): CollisionData[] {
        const {centerWorld, w, h, s: scale, zoom} = this.display;
        const worldSize = 256 << zoom;
        const screenWorldTopLeftX = centerWorld[0] * worldSize - w * .5;
        const screenWorldTopLeftY = centerWorld[1] * worldSize - h * .5;
        const screenCollisionData: CollisionData[] = [];

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
        return screenCollisionData;
    }

    private collisionsWorld2Screen(
        visible: CollisionData[],
        worldSize: number,
        screenWorldTopLeftX: number,
        screenWorldTopLeftY: number,
        tiles: DisplayTile[],
        layer: Layer,
        displayScale: number
    ) {
        const layerId = this.getLayerId(layer);

        // When tiles are repeated due to the singleWorldView setting, we skip processing them for collision detection.
        // This prevents redundant checks and ensures they don't incorrectly collide with themselves,
        // which could cause them to become invisible.
        const skipRepeatedTiles = new Set<string>();

        for (let screentile of tiles) {
            const {quadkey, scale: tileScale} = screentile;
            if (skipRepeatedTiles.has(quadkey)) continue;
            skipRepeatedTiles.add(quadkey);

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
            const updateBBox = this.processCollision(bbox,
                visibleItemsMapAligned,
                visibleItemsViewportAligned
            );
            updated ||= updateBBox;
        }
        return updated;
    }

    processCollision(
        bbox: CollisionData,
        visibleItemsMapAligned: CollisionData[],
        visibleItemsViewportAligned: CollisionData[]
    ): boolean {
        let updated = false;
        let visibleItems: CollisionData[];

        let intersects = this.intersects(bbox, visibleItemsViewportAligned);

        const isMapAligned = bbox.isMapAligned;
        if (isMapAligned) {
            visibleItems = visibleItemsMapAligned;
        } else {
            intersects ||= this.intersects(bbox, visibleItemsMapAligned);
            visibleItems = visibleItemsViewportAligned;
        }

        if (!intersects) {
            visibleItems[visibleItems.length] = bbox;
        }
        // const updatedX = new Uint16Array(1);
        for (let {attr, start, stop} of bbox.attrs) {
            const {data, size} = attr;
            const visible = (data[start] & 1) == 1;
            if (
                // Hide all buffers (intersects && visible) or
                // restore previously hidden buffers to make them visible again (!intersects && !visible).
                intersects == visible
            ) {
                while (start < stop) {
                    data[start] ^= 1; // toggle LSB
                    // updatedX[0] = data[start];
                    // attr.gl.bindBuffer(attr.gl.ARRAY_BUFFER, attr.buffer);
                    // attr.gl.bufferSubData(attr.gl.ARRAY_BUFFER,
                    //     start * Uint16Array.BYTES_PER_ELEMENT, // Correct byte offset,
                    //     updatedX
                    // ); // Update only the x value
                    start += size;
                }
                (<Attribute>attr).dirty = true;
                updated = true;
            }
        }

        if (this.dbg) {
            this.dbgBBoxes(bbox, intersects);
        }
        return updated;
    }

    private getCollisionHeight(cData: CollisionData, screenX: number, screenY: number) {
        let terrainHeight = cData.cz;
        if (typeof terrainHeight == 'string') {
            terrainHeight = this.display.getTerrainHeightAtWorldXY(screenX, screenY);
            if (terrainHeight != null) {
                cData.cz = terrainHeight;
            }
        }
        return terrainHeight ?? 0;
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

                // if (slope !== null) {
                if (cData.isMapAligned && !slope) {
                    halfHeight *= this.getMapAlignedShrinkFactor();
                }

                const boxCnt = cData.boxes.length;
                let boxes: BBox[];
                let height = this.getCollisionHeight(cData, screenX, screenY);

                if (boxCnt > 1) {
                    // map aligned
                    boxes = new Array(boxCnt);
                    screenX += offsetX / displayScale;
                    screenY += offsetY / displayScale;

                    let prjScreen1 = display.project(screenX, screenY, height
                        // 0, 0/* -> unscaled world pixels, fixed zoom-level */
                    );
                    let prjScreen2 = display.project(screenX + slope[0], screenY + slope[1], height
                        // 0, 0
                    );

                    const slopeX = (prjScreen2[0] - prjScreen1[0]) / displayScale;
                    const slopeY = (prjScreen2[1] - prjScreen1[1]) / displayScale;

                    this.updateBBoxes(prjScreen1[0], prjScreen1[1], slopeX, slopeY, halfWidth, halfHeight, boxes.length - 1, boxes);
                } else {
                    // viewport aligned
                    const projected = display.project(screenX, screenY, height
                        // 0, 0/* -> unscaled world pixels */
                    );

                    boxes = [{
                        minX: projected[0] - halfWidth + offsetX,
                        maxX: projected[0] + halfWidth + offsetX,
                        minY: projected[1] - halfHeight + offsetY,
                        maxY: projected[1] + halfHeight + offsetY
                    }];
                }

                collisionData.push({
                    boxes,
                    attrs,
                    slope,
                    priority: cData.priority,
                    isMapAligned: cData.isMapAligned,
                    cz: height
                });
            }
        }
    };

    removeTiles(layer: Layer) {
        for (let zoom in this.tiles) {
            this.tiles[zoom].forEach((collisionTile, quadkey) => {
                this.clearTile(quadkey, layer, Number(zoom));
            });
        }
    }
}
