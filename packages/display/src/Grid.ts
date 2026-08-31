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

import {tileUtils} from '@here/xyz-maps-core';
import {doPolygonsIntersect} from './geometry';
import BasicDisplay from './displays/BasicDisplay';
import {measureReset} from './displays/webgl/PerfTimer';
import {FIXED_TILE_PITCH_THRESHOLD} from './displays/webgl/constants';

const INFINITY = Infinity;

/**
 * Smooth progressive horizon falloff for adaptive LOD.
 *
 * Computes a [0..1] falloff for adaptive LOD based on the camera's elevation
 * angle. Steeply viewed tiles retain the full split range, while tiles near
 * the horizon use a progressively smaller range to prevent over-subdivision.
 *
 * @param verticalDist Camera height above the tile's terrain plane (pixels)
 * @param forwardDist Camera-to-tile distance along the view direction (pixels)
 * @returns Scale factor applied to maxSplitRange
 *
 * @internal
 * @hidden
 */
const computeHorizonFalloff = (verticalDist: number, forwardDist: number): number => {
    if (verticalDist <= 0 || forwardDist <= 0) return 1.0;
    const sinElev = Math.min(1, verticalDist / forwardDist);
    // sin(45°) — the elevation angle above which perspective compression
    // is negligible and tiles retain enough visible detail for full LOD.
    // Below 45°, tiles are increasingly viewed at a grazing angle and their
    // projected height shrinks relative to width, reducing effective detail.
    const LOD_FULL_DETAIL_SIN = Math.SQRT1_2;
    if (sinElev >= LOD_FULL_DETAIL_SIN) return 1.0;
    const t = sinElev / LOD_FULL_DETAIL_SIN;
    return Math.sqrt(t) * (0.5 + 0.5 * t);

    // quadratic falloff: gradually reduces the split range toward the horizon.
    // const horizonMinScale: number = 0.3 // 0.15
    // return horizonMinScale + (1.0 - horizonMinScale) * t * t;

    // Cubic falloff: gentle near the threshold, aggressive near horizon.
    // t=0.5 (~22°) → 0.125, t=0.3 (~12°) → 0.027, t=0.1 (~4°) → 0.001
    // return t * t * t;
};

export interface ViewportTile {
    quadkey: string,
    x: number,
    y: number,
    renderTileSize: number,
    worldTileSize: number;
    gridX: number;
    gridY: number;
    gridZ: number;
}

type TerrainTileStats = {
    readonly min: number;
    readonly max: number;
    readonly avg: number;
    readonly available?: boolean;
};

const EMPTY_TERRAIN_STATS: TerrainTileStats = {min: 0, max: 0, avg: 0};

export class GridTile implements ViewportTile {
    static minTileSize: number = 256;
    static tileGeoContainer: number[][] = [[0, 0], [0, 0], [0, 0], [0, 0]];

    quadkey: string;
    x: number;
    y: number;
    renderTileSize: number;
    worldTileSize: number;
    gridZ: number;
    gridX: number;
    gridY: number;

    private globalBounds: number[][];

    constructor(
        tileZoomLevel: number,
        x: number,
        y: number,
        renderTileSize: number,
        worldTileSize: number,
        gridX: number,
        gridY: number,
        bounds: number[][]
    ) {
        this.quadkey = tileUtils.tileXYToQuadKey(tileZoomLevel, gridY, gridX);

        this.gridZ = tileZoomLevel;
        this.x = x;
        this.y = y;

        this.renderTileSize = renderTileSize;
        this.worldTileSize = worldTileSize;

        this.gridX = gridX;
        this.gridY = gridY;

        this.globalBounds = bounds;
    }

    static updateTileBBox(tx1: number, ty1: number, tileSize: number) {
        const tileGeoContainer = GridTile.tileGeoContainer;
        const [tile1, tile2, tile3, tile4] = tileGeoContainer;
        const tx2 = tx1 + tileSize;
        const ty2 = ty1 + tileSize;

        tile1[0] = tx1;
        tile1[1] = ty1;

        tile2[0] = tx2;
        tile2[1] = ty1;

        tile3[0] = tx2;
        tile3[1] = ty2;

        tile4[0] = tx1;
        tile4[1] = ty2;

        return tileGeoContainer;
    }

    static intersects(bounds: number[][], x: number, y: number, size: number) {
        const tileGeoContainer = GridTile.updateTileBBox(x, y, size);
        return doPolygonsIntersect(bounds, tileGeoContainer);
    }

    private collectVisibleTerrainElevation(display: BasicDisplay, terrainAltitude: TerrainTileStats) {
        // Only real terrain stats should lower the visible terrain reference plane.
        // Fallback stats are conservative for culling but would incorrectly pull
        // flat elevated terrain down to sea level and enlarge zFar/grid bounds.
        if (terrainAltitude.available !== false) {
            display.includeVisibleTerrainElevation(terrainAltitude.min, terrainAltitude.max, this);
        }
    }

    /**
     * Camera-distance-based tile hierarchy generation.
     *
     * Uses a single unified split criterion: a tile subdivides when the closest
     * camera-forward distance to its bounding region is less than a zoom-scaled
     * split threshold. This naturally handles terrain elevation, high pitch, and
     * any maxDataZoom cap without special-case branching.
     *
     * @param splitCalibration Controls overall tile density. Higher = more tiles.
     *        Range: 0.5 (sparse) to 2.0 (dense). Default: 1.0
     *
     * @internal
     * @hidden
     */
    generateVisibleLODTiles(
        display: BasicDisplay,
        minTileSize: number = GridTile.minTileSize,
        useAdaptiveLOD: boolean = true,
        maxZoomLevel: number = 20,
        minZoomLevel: number = 1,
        tiles: ViewportTile[] = [],
        renderTileSize: number = this.renderTileSize,
        // tuning parameter
        splitCalibration: number = 0.28 // 0.35
    ): ViewportTile[] {
        type TileNode = {
            tile: GridTile,
            terrainAltitude?: TerrainTileStats
        };
        const terrainEnabled = display.terrainPivotAltitude > 0;
        const fixedCoverageAltitude = terrainEnabled ? display.terrainPivotAltitude : 0;
        const effectiveMinZoomLevel = minZoomLevel - Math.log2(minTileSize / 256);

        // Detect large terrain height differences (e.g. mountain summit → sea level).
        // When the camera is far above the lowest visible terrain, distant tiles on
        // the lower plane need distance-based limiting even at moderate pitch.
        const minVisibleAltitude = display.visibleTerrainElevation.min ?? 0;
        const significantTerrainDrop = (fixedCoverageAltitude - minVisibleAltitude) > 500;
        const cameraToCenterDist = display.getCameraToCenterDistance();

        // The base split unit: how many target-zoom tiles fit between camera and
        // map center along the forward axis. This is the fundamental scale that
        // determines LOD transitions.
        // Smaller tiles (e.g. 256px) are barely distinguishable in the distance,
        // so they get a more aggressive cutoff via tileSizeFactor.
        const tileSizeFactor = renderTileSize / 512;
        const splitUnit = cameraToCenterDist / renderTileSize * splitCalibration * tileSizeFactor;

        // Camera height above the terrain surface in pixel units.
        // cameraToCenterDist is the perpendicular height of the camera above
        // the map plane in pixels — it does not change with pitch.
        // forwardDist (tileDepth * cameraToCenterDist) is the along-view-ray
        // distance in the same pixel units, so sinElev = height/forwardDist
        // gives the correct elevation angle.
        const cameraHeightAboveTerrain = cameraToCenterDist;
        // // Camera height above the terrain surface (not sea level).
        // // Used for horizon-angle correction.
        // const cameraWorldZ = display.getCameraWorldPosition()[2];
        // const cameraHeightAboveTerrain = Math.max(1, cameraWorldZ - fixedCoverageAltitude);

        // Screen center point — tile coordinates are screen-relative.
        const screenCenterX = display.w * 0.5;
        const screenCenterY = display.h * 0.5;

        // Non-adaptive coverage limit: maximum forward-distance at which a tile
        // is still considered "within coverage". Beyond this, the tile (or subtree)
        // is pruned. Only active at high pitch or with significant terrain drop.
        const nonAdaptiveCoverageBase = cameraToCenterDist / renderTileSize * tileSizeFactor;
        const needsCoverageLimit = display.rx > FIXED_TILE_PITCH_THRESHOLD || significantTerrainDrop;

        // Returns true if the tile at the given depth is beyond the non-adaptive
        // coverage limit. Used both for early subtree pruning (split decision)
        // and for leaf-level filtering.
        const isBeyondCoverage = (tileDepth: number, tileX: number, tileY: number, size: number): boolean => {
            if (!needsCoverageLimit) return false;
            const falloff = computeHorizonFalloff(cameraHeightAboveTerrain, tileDepth * cameraToCenterDist);
            const maxCoverage = nonAdaptiveCoverageBase * falloff;
            if (tileDepth < maxCoverage) return false;
            // Safety net: tile containing the map center is never beyond coverage.
            const containsCenter = tileX <= screenCenterX && tileX + size >= screenCenterX
                && tileY <= screenCenterY && tileY + size >= screenCenterY;
            return !containsCenter;
        };


        const getTerrainHeight = (gridZ, gridX, gridY): TerrainTileStats =>
            terrainEnabled ? display.getTerrainHeight(gridZ, gridX, gridY) : EMPTY_TERRAIN_STATS;


        const tileNodes: TileNode[] = [{
            tile: this,
            terrainAltitude: getTerrainHeight(this.gridZ, this.gridX, this.gridY)
        }];

        while (tileNodes.length) {
            const node = tileNodes.pop();
            const tile = node.tile;
            const {gridZ, gridX, gridY, worldTileSize} = tile;

            const canSubdivide = worldTileSize > minTileSize;
            const requestableByMinZoom = gridZ >= effectiveMinZoomLevel;

            // Terrain elevation for this tile
            const tileTerrainAltitude = getTerrainHeight(gridZ, gridX, gridY);
            const tileTerrainAvg = tileTerrainAltitude.avg
                ?? (tileTerrainAltitude.min + tileTerrainAltitude.max) * 0.5;
            const terrainLodAltitude = tileTerrainAltitude.available === false
                ? fixedCoverageAltitude
                : tileTerrainAvg;

            // --- Frustum culling ---
            const leafCandidate = worldTileSize <= minTileSize && requestableByMinZoom;
            const canCull = !terrainEnabled
                || tileTerrainAltitude.available !== false
                || leafCandidate
                || gridZ >= maxZoomLevel;

            if (canCull) {
                // When terrain stats are unavailable for a leaf tile, the fallback
                // elevation range (min:0, max:~pivot) can be far too low. A tile on
                // a 2400m mountain tested with max=982m may appear above the viewport
                // and get incorrectly culled. Use the maximum elevation observed in
                // the previous frame's visible tiles as conservative upper bound.
                let cullMaxZ = tileTerrainAltitude.max;
                if (terrainEnabled && tileTerrainAltitude.available === false) {
                    cullMaxZ = Math.max(cullMaxZ, display.visibleTerrainElevation.max);
                }
                if (display.isTileOutsideViewport(
                    tile.x, tile.y,
                    tileTerrainAltitude.min, cullMaxZ,
                    worldTileSize
                )) {
                    continue;
                }
            }

            // Non-adaptive coverage is handled in the split decision below.
            // --- Split decision ---
            let shouldSplit = false;

            if (gridZ >= maxZoomLevel || !canSubdivide) {
                shouldSplit = false;
            } else {
                // Compute tile depth (camera-forward distance).
                // Use the minimum depth of the 4 tile corners instead of the tile center.
                // This produces more gradual LOD.
                const d0 = display.computeDistanceScale(tile.x, tile.y, terrainLodAltitude);
                const d1 = display.computeDistanceScale(tile.x + worldTileSize, tile.y, terrainLodAltitude);
                const d2 = display.computeDistanceScale(tile.x, tile.y + worldTileSize, terrainLodAltitude);
                const d3 = display.computeDistanceScale(tile.x + worldTileSize, tile.y + worldTileSize, terrainLodAltitude);
                const tileDepth = Math.min(d0, d1, d2, d3) / display.s;
                // const depthRefX = tile.x + worldTileSize * 0.5;
                // const depthRefY = tile.y + worldTileSize * 0.5;
                // const tileDepth = display.computeDistanceScale(depthRefX, depthRefY, terrainLodAltitude) / display.s;

                const viewSpan = worldTileSize / renderTileSize;

                if (!useAdaptiveLOD) {
                    // Non-adaptive: split to target zoom, but prune subtrees beyond
                    // coverage at high pitch or with large terrain drop.
                    shouldSplit = !isBeyondCoverage(tileDepth, tile.x, tile.y, worldTileSize);
                } else {
                    // Adaptive LOD: always apply falloff regardless of pitch.
                    // At low pitch on flat terrain, falloff ≈ 1.0 (no effect).
                    // At low pitch with large terrain height range (e.g. mountain summit
                    // looking down to sea level), distant tiles on the lower plane get
                    // reduced — prevents tile explosion without needing a pitch threshold.
                    const falloff = computeHorizonFalloff(cameraHeightAboveTerrain, tileDepth * cameraToCenterDist);
                    let maxSplitRange = viewSpan * splitUnit * falloff;
                    shouldSplit = tileDepth < maxSplitRange;

                    // tiles containing the map center always split.
                    if (!shouldSplit) {
                        const containsCenter = tile.x <= screenCenterX && tile.x + worldTileSize >= screenCenterX
                            && tile.y <= screenCenterY && tile.y + worldTileSize >= screenCenterY;
                        if (containsCenter) shouldSplit = true;
                    }
                }
            }

            if (shouldSplit) {
                const childZoom = gridZ + 1;
                const childSize = worldTileSize * 0.5;
                const childGridBaseX = gridX * 2;
                const childGridBaseY = gridY * 2;
                let queuedChildren = 0;

                // Push children in reverse order (stack is LIFO → traversal stays
                // top-left, top-right, bottom-left, bottom-right).
                for (let i = 3; i >= 0; i--) {
                    const gx = i & 1;
                    const gy = i >> 1;
                    const x = tile.x + gx * childSize;
                    const y = tile.y + gy * childSize;
                    // Frustum check first — avoid terrain lookup and object allocation
                    // for children outside the viewport.
                    if (!GridTile.intersects(tile.globalBounds, x, y, childSize)) continue;

                    const childGridX = childGridBaseX + gx;
                    const childGridY = childGridBaseY + gy;
                    const childTerrainAlt = getTerrainHeight(childZoom, childGridX, childGridY);

                    tileNodes.push({
                        tile: new GridTile(
                            childZoom, x, y,
                            renderTileSize, childSize,
                            childGridX, childGridY,
                            tile.globalBounds
                        ),
                        terrainAltitude: childTerrainAlt
                    });
                    queuedChildren++;
                }

                // Terrain safety net: if all children were culled, keep the parent
                // to avoid rendering holes.
                if (!queuedChildren && terrainEnabled && requestableByMinZoom) {
                    this.collectVisibleTerrainElevation(display, tileTerrainAltitude);
                    tiles.push(tile);
                }
                continue;
            }

            // Leaf tile: add to result if within requestable zoom range.
            if (!requestableByMinZoom) continue;

            // Skip coarser parent tiles that couldn't be split.
            // For non-adaptive layers: they can only load tiles at their target zoom.
            // Adaptive layers keep coarser parents as LOD tiles (even with maxDataZoom cap).
            if (canSubdivide && !useAdaptiveLOD) continue;

            // Non-adaptive leaf tiles at target zoom: drop tiles beyond coverage.
            if (!useAdaptiveLOD && !canSubdivide) {
                const leafX = tile.x + worldTileSize * 0.5;
                const leafY = tile.y + worldTileSize * 0.5;
                const leafDepth = display.computeDistanceScale(leafX, leafY, terrainLodAltitude) / display.s;
                if (isBeyondCoverage(leafDepth, tile.x, tile.y, worldTileSize)) continue;
            }

            if (terrainEnabled) {
                this.collectVisibleTerrainElevation(display, tileTerrainAltitude);
            }
            tiles.push(tile);
        }
        return tiles;
    }
}

class Grid {
    private minX: number;
    private maxX: number;
    private minY: number;
    private maxY: number;

    // tile size
    private size: number;

    // center world pixel
    private cwpx: number;
    private cwpy: number;

    // width/height of screen
    private width: number;
    private height: number;

    // untransformed view bounds relative to screen
    private bounds: number[][];

    constructor(tileSize: number) {
        this.size = tileSize;
    }

    init(centerWorldPixel: number[], width: number, height: number, bounds: number[][]) {
        this.cwpx = centerWorldPixel[0];
        this.cwpy = centerWorldPixel[1];

        this.width = width;
        this.height = height;
        // used for clipping
        this.bounds = bounds;

        let minOx = INFINITY;
        let maxOx = -minOx;
        let minOy = INFINITY;
        let maxOy = -minOy;

        for (let [x, y] of bounds) {
            if (x < minOx) minOx = x;
            if (x > maxOx) maxOx = x;

            if (y < minOy) minOy = y;
            if (y > maxOy) maxOy = y;
        }

        this.minX = minOx;
        this.maxX = maxOx;
        this.minY = minOy;
        this.maxY = maxOy;

        measureReset('getTerrainHeightForQuadkey');
    };

    getTiles(zoomLevel: number, zoomOutLookahead: number): GridTile[] {
        const {width, height} = this;
        const gridZoomLevel = Math.max(0, zoomLevel ^ 0);
        const effectiveLookahead = Math.max(0, Math.min(zoomOutLookahead ^ 0, gridZoomLevel));
        const baseTileSize = 256;
        const tileSize = baseTileSize * (1 << effectiveLookahead);
        const tileZoomLevel = gridZoomLevel - effectiveLookahead;
        const worldSizePixel = Math.pow(2, tileZoomLevel) * tileSize;
        const centerPixelX = this.cwpx * worldSizePixel;
        const centerPixelY = this.cwpy * worldSizePixel;

        let minX = (centerPixelX - width / 2 + this.minX) / tileSize;
        let minY = (centerPixelY - height / 2 + this.minY) / tileSize;
        let maxX = (centerPixelX + width / 2 + this.maxX - width) / tileSize;
        let maxY = (centerPixelY + height / 2 + this.maxY - height) / tileSize;


        // let [topLeftRow, topLeftCol] = tileUtils.pixelToGrid(minX, minY, tileZoomLevel);
        let topLeftRow = Math.floor(minX);
        let topLeftCol = Math.floor(minY);
        // let [bottomRightRow, bottomRightCol] = tileUtils.pixelToGrid(maxX, maxY, tileZoomLevel);
        let bottomRightRow = Math.floor(maxX);
        let bottomRightCol = Math.floor(maxY);

        let gridX = bottomRightRow - topLeftRow + 1;
        let gridY = bottomRightCol - topLeftCol + 1;
        let gridOx = (topLeftRow - minX) * tileSize + this.minX;
        let gridOy = (topLeftCol - minY) * tileSize + this.minY;

        const tiles = [];

        for (let y = 0; y < gridY; y++) {
            for (let x = 0; x < gridX; x++) {
                const topLeftScreenX = gridOx + x * tileSize;
                const topLeftScreenY = gridOy + y * tileSize;

                if (GridTile.intersects(this.bounds, topLeftScreenX, topLeftScreenY, tileSize)) {
                    const gridTile = new GridTile(
                        tileZoomLevel,
                        topLeftScreenX,
                        topLeftScreenY,
                        tileSize,
                        tileSize,
                        topLeftRow + x,
                        topLeftCol + y,
                        this.bounds
                    );
                    tiles.push(gridTile);
                }
            }
        }
        return tiles;
    };


    initTileScreenXY(tile: {
        x?: number, y?: number, quadkey: string, worldTileSize: number
    }, tileX: number, tileY: number, tileZ: number): { x: number; y: number, quadkey: string, worldTileSize: number } {
        const tileSize = tile.worldTileSize;
        // const [_tileZ, _tileY, _tileX] = tileUtils.quadToGrid(tile.quadkey);
        // if (tileX !== _tileX || tileY !== _tileY || tileZ !== _tileZ) debugger;
        // console.log(tileZ, tileY, tileX);
        const worldSizePixel = (1 << tileZ) * tileSize;
        const centerPixelX = this.cwpx * worldSizePixel;
        const centerPixelY = this.cwpy * worldSizePixel;
        const tilePixelX = tileX * tileSize;
        const tilePixelY = tileY * tileSize;
        tile.x = tilePixelX - centerPixelX + this.width / 2;
        tile.y = tilePixelY - centerPixelY + this.height / 2;
        return tile as { x: number; y: number, quadkey: string, worldTileSize: number };
    }
}


export default Grid;
