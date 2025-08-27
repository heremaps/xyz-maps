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

import {Map} from './Map';
import {GeoPoint} from '@here/xyz-maps-core';

export class CameraTerrainController {
    private _camTerrainGuard: boolean;
    private _camTerrainSmoothedAltitude: number | null;
    private _prevCamPos: GeoPoint | null;
    private _prevTime: number | null;

    constructor(private map: Map) {
        this._prevCamPos = {longitude: 0, latitude: 0, altitude: 0};
        this._prevTime = null;
        this._camTerrainSmoothedAltitude = null;
    }

    private computeCamSpeed(cam: GeoPoint): number {
        const now = performance.now() / 1000; // seconds
        let camSpeed = 0;
        if (this._prevTime != null) {
            const dt = now - this._prevTime;
            if (dt > 0) {
                const dx = cam.longitude - this._prevCamPos.longitude;
                const dy = cam.latitude - this._prevCamPos.latitude;
                const dz = cam.altitude - this._prevCamPos.altitude;
                // rough distance in meters (for small deltas)
                camSpeed = Math.sqrt(dx * dx + dy * dy + dz * dz) / dt;
            }
        }
        this._prevCamPos.longitude = cam.longitude;
        this._prevCamPos.latitude = cam.latitude;
        this._prevCamPos.altitude = cam.altitude;
        this._prevTime = now;
        return camSpeed;
    }

    /**
     * Returns the terrain height at a given geographic coordinate.
     *
     * @hidden
     * @internal
     * @param lon - Longitude of the location.
     * @param lat - Latitude of the location.
     */
    private getTerrainHeightAtGeo(lon: number, lat: number): number | null {
        const map = this.map;
        const screen = map.geoToPixel(lon, lat);
        const groundWorld = map._unprj(screen.x, screen.y);
        return map._getTerrainAtWorldXY(groundWorld[0], groundWorld[1]);
    }

    public ensureAboveTerrain() {
        if (this._camTerrainGuard) return null;

        const offset = 200;
        const map = this.map;
        const cam = map.getCamera().position;
        const rawTerrain = this.getTerrainHeightAtGeo(cam.longitude, cam.latitude);
        if (rawTerrain == null) return;

        let smoothedAltitude = this._camTerrainSmoothedAltitude;
        if (smoothedAltitude == null) {
            smoothedAltitude = rawTerrain;
        } else {
            // Temporal smoothing of terrain altitude (Exponential Moving Average)
            const smoothing = 0.85; // closer to 1 = smoother, but more lag
            smoothedAltitude = smoothedAltitude * smoothing + rawTerrain * (1 - smoothing);
        }
        this._camTerrainSmoothedAltitude = smoothedAltitude;

        // Adaptive minDiff based on speed
        // const camSpeed = this.computeCamSpeed(cam);
        // const baseMinDiff = 1.0; // meters
        // const speedScaling = 0.05;
        // const minDiff = baseMinDiff + camSpeed * speedScaling;
        const minDiff = 2.0; // meters
        const targetAltitude = smoothedAltitude + offset;
        const diff = targetAltitude - cam.altitude;

        if (diff > minDiff) {
            this._camTerrainGuard = true;
            const newAltitude = diff > 5
                // Way too deep -> snap directly to safe altitude
                ? targetAltitude
                // Slightly below -> ease upwards
                : cam.altitude + diff * 0.2;

            map.setAltitude(newAltitude);

            this._camTerrainGuard = false;
            return targetAltitude;
        }
        return null;
    }
}
