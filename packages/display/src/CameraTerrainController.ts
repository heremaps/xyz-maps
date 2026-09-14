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
import BasicDisplay from './displays/BasicDisplay';
import {Map} from './Map';
import {measureStart, measureEnd} from './displays/webgl/PerfTimer';


export class CameraTerrainController {
    // Guard against recursive calls (ensureAboveTerrain → setAltitude → updateGrid → ensureAboveTerrain)
    private _guard: boolean = false;

    // Terrain height sampled below the camera (possibly from a coarser parent heightmap), used to calculate the
    // maximum safe zoom. Null while only a fallback reference exists, so it never restricts the zoom range.
    // Updated by ensureAboveTerrain() and read by getMaxZoom().
    private _cachedTerrainHeightForZoom: number | null = null;

    // Minimum distance (meters) the camera must remain above the terrain surface.
    private minCamTerrainDistance: number;

    constructor(private map: Map, private display: BasicDisplay, minCamTerrainDistance: number = 1000) {
        this.minCamTerrainDistance = minCamTerrainDistance;
    }

    /**
     * Returns the terrain height at a given geographic coordinate.
     * Uses the persistent heightmap cache — works even when the tile is not rendered (frustum-independent).
     * Falls back to the regional maximum at the map center if no heightmap covers the requested position.
     *
     * @internal
     * @hidden
     */
    private getTerrainHeightAtGeo(lon: number, lat: number): number | null {
        const display = this.display;
        // measureStart('getTerrainPointHeight');
        const height = display.getTerrainPointHeight(lon, lat);
        // measureEnd('getTerrainPointHeight');
        this._cachedTerrainHeightForZoom = height;

        if (height != null) return height;
        // No heightmap covers the camera position, which happens on a pitched start before the tile below the camera
        // is loaded. Use the regional maximum at the map center as a conservative reference until a location-specific
        // height becomes available.
        const center = this.map.getCenter();
        const centerRegionHeight = display.getTerrainRegionMaxHeight(center.longitude, center.latitude);
        return Number.isFinite(centerRegionHeight) ? centerRegionHeight : null;
    }

    /**
     * Returns the maximum zoom level at which the camera remains above the terrain surface,
     * or null if terrain data is unavailable.
     * Uses the cached terrain height below the camera (updated via ensureAboveTerrain).
     *
     * @internal
     * @hidden
     */
    public getMaxZoom(): number | null {
        const terrainAlt = this._cachedTerrainHeightForZoom;
        if (terrainAlt == null || !Number.isFinite(terrainAlt)) {
            return null;
        }
        const safeAltitude = terrainAlt + this.minCamTerrainDistance;
        if (safeAltitude <= 0) {
            return null;
        }
        const maxZoom = this.map._altToZoom(safeAltitude);
        return Number.isFinite(maxZoom) ? maxZoom : null;
    }

    /**
     * Checks whether the camera is above the terrain and corrects if not.
     * Also updates the cached terrain height below the camera (used by getMaxZoom).
     *
     * Called after every view change (from updateGrid) and when terrain tiles finish loading.
     *
     * @internal
     * @hidden
     */
    public ensureAboveTerrain(): void {
        if (this._guard) return;

        const map = this.map;
        const cam = map.getCamera().position;
        const terrainAlt = this.getTerrainHeightAtGeo(cam.longitude, cam.latitude);

        // Fallback terrain references may temporarily place the camera higher than
        // necessary until the exact point becomes available.
        if (terrainAlt == null || !Number.isFinite(terrainAlt)) return;

        const minCamAlt = terrainAlt + this.minCamTerrainDistance;
        const diff = minCamAlt - cam.altitude;

        if (diff > 2) {
            this._guard = true;
            try {
                map.setAltitude(minCamAlt);
            } finally {
                this._guard = false;
            }
        }
    }

    public reset(): void {
        this._cachedTerrainHeightForZoom = null;
    }
}
