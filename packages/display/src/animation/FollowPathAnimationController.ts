/*
 * Copyright (C) 2019-2025 HERE Europe B.V.
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
import {GeoJSONCoordinate} from '@here/xyz-maps-core';
import {geotools} from '@here/xyz-maps-common';
import {AnimationController} from './AnimationController';
import {Map} from '../Map';

const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
const lerp = (x: number, y: number, a: number) => x * (1 - a) + y * a;
const lerpGeoJSONCoordinate = (a: GeoJSONCoordinate, b: GeoJSONCoordinate, t: number): GeoJSONCoordinate => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
const smoothAngle = (prev: number, next: number, alpha: number): number => {
    alpha = Math.max(0, Math.min(1, alpha));
    const delta = ((next - prev + 540) % 360) - 180;
    return (prev + delta * alpha + 360) % 360;
};

/**
 * Animation controller for following a path on the map.
 * Interpolates position, altitude, and bearing along a given GeoJSON coordinate array
 * Handles speed, auto-rotation, pitch, camera offset, and heading smoothing.
 *
 * **Example:**
 * ```typescript
 * import {FollowPathAnimationController} from '@here/xyz-maps-display';
 *
 * const path: GeoJSONCoordinate[] = [
 *   [13.405, 52.52], [13.406, 52.521], [13.407, 52.522]
 * ];
 * const controller = new FollowPathAnimationController(mapDisplay, path, {
 *   duration: 10000, // 10 seconds
 * });
 * controller.start();
 *
 * // In case you want to wait for the animation to complete:
 * await controller.complete();
 * console.log('Animation completed');
 */
export class FollowPathAnimationController extends AnimationController {
    private coords!: GeoJSONCoordinate[];
    // private resampled!: GeoJSONCoordinate[];
    private segLens: number[];
    private totalLen = 0;
    private lastBearing = 0;

    private display: Map;
    private speed?: number;
    private autoRotate: boolean;
    private headingSmoothing: number;
    private mode: 'car' | 'drone' | 'default';
    private altitude: number;
    private cameraOffset: [number, number];
    private lookAheadMeters: number;
    private pitch: number;


    /**
     * Creates a new FollowPathAnimationController.
     * @param display - The map display instance.
     * @param coordinates - Array of GeoJSON coordinates representing the path.
     * @param options - Optional Animation options
     */
    constructor(display, coordinates: GeoJSONCoordinate[], options: {
        /**
         * duration of the animation in milliseconds. Ignored if `speed` is set.
         */
        duration?: number;
        /**
         * Whether the animation should loop upon completion.
         * @defaultValue false
         */
        loop?: boolean;
        /**
         * Animation speed in meters per second (m/s).
         */
        speed?: number;
        /**
         * If true, the camera automatically rotates to follow the path.
         * @defaultValue true
         */
        autoRotate?: boolean;
        /**
         * Camera pitch angle in degrees (0 = top-down, 90 = side view).
         */
        pitch?: number;
        /**
         * Additional altitude in meters to add to the path (for camera elevation).
         */
        altitude?: number;
        /**
         * Animation mode: 'car' (ground-level), 'drone' (aerial), or 'default'.
         * @hidden
         * @internal
         * @experimental
         */
        mode?: 'car' | 'drone' | 'default';
        /**
         * [forward/backward, up/down] camera offset in meters relative to the path.
         * @hidden
         * @internal
         * @experimental
         */
        cameraOffset?: [number, number];
        /**
         * Distance in meters to look ahead for bearing calculation (for smoother turns).
         * @hidden
         * @internal
         * @experimental
         */
        lookAheadMeters?: number;
        // resampleStepMeters?: number;
        /**
         * Controls how quickly the camera's heading (bearing) follows the path direction.
         *
         * Range: `0` to `1`.
         *
         * - `0` — No smoothing. Camera instantly snaps to path bearing; turns appear abrupt.
         * - `1` — Maximum smoothing. Camera rotates very slowly; turns appear smooth but delayed.
         * - `0 < x < 1` — Partial smoothing. Higher values = slower, smoother rotation; lower values = faster, more responsive rotation.
         *
         * Recommended values are between `0.8` and `0.99` for a good balance of responsiveness and smoothness.
         *
         * @defaultValue 0.95
         */
        headingSmoothing?: number;
    } = {}) {
        options.duration ??= 5_000;

        super(options);
        this.display = display;
        this.coords = coordinates as GeoJSONCoordinate[];
        this.speed = options.speed;
        this.autoRotate = options.autoRotate ?? true;
        this.headingSmoothing = options.headingSmoothing ?? .95;
        this.mode = options.mode ?? 'drone';
        this.altitude = options.altitude ?? (this.mode === 'drone' ? 5000 : 0);
        this.cameraOffset = options.cameraOffset ?? [0, 0];
        this.lookAheadMeters = options.lookAheadMeters ?? 0;

        this.segLens = [0];
        for (let i = 0; i < this.coords.length - 1; i++) {
            this.segLens.push(this.segLens[i] + geotools.distance(this.coords[i], this.coords[i + 1]));
        }
        this.totalLen = this.segLens[this.segLens.length - 1];
        // Initial bearing
        this.lastBearing = geotools.calcBearing(this.coords[0], this.coords[1]);

        // Duration override if speed is set
        if (this.speed && this.speed > 0) {
            this.duration = (this.totalLen / this.speed) * 1000;
        }

        this.pitch = this.mode === 'car' ? 85
            : this.mode === 'drone' ? 50
                : clamp(options.pitch, 0, 85);
    }

    protected updateFrame(t: number): void {
        const te = t;
        const dist = te * this.totalLen;
        const {i: index, t: segmentT} = this.locateAlong(dist);
        const p1 = this.coords[index];
        const p2 = this.coords[Math.min(index + 1, this.coords.length - 1)];
        const posXY = lerpGeoJSONCoordinate(p1, p2, segmentT);

        let pathAlt = (p1[2] != null && p2[2] != null) ? p1[2] + (p2[2] - p1[2]) * segmentT : 0;
        let altitude = pathAlt + this.altitude;
        this.display.setAltitude(altitude);

        let camRefXY = posXY;
        if (this.mode === 'drone' && this.cameraOffset) {
            // apply forward/backward offset
            camRefXY = geotools.movePoint(posXY, this.cameraOffset[0], this.lastBearing);
            altitude += this.cameraOffset[1];
        }
        // this.display.setAltitude(altitude);

        // LookAhead bearing
        let rawBearing: number;
        if (t >= 1) {
            // rawBearing = geotools.calcBearing(this.coords[this.coords.length - 2], this.coords[this.coords.length - 1]);
            rawBearing = this.lastBearing;
        } else {
            const aheadDist = Math.min(dist + Math.max(1, this.lookAheadMeters), this.totalLen - 1e-3);
            const {i: i2, t: t2} = this.locateAlong(aheadDist);
            const A2 = this.coords[i2];
            const B2 = this.coords[Math.min(i2 + 1, this.coords.length - 1)];
            const aheadXY = lerpGeoJSONCoordinate(A2, B2, t2);
            rawBearing = this.mode === 'car' ? geotools.calcBearing(camRefXY, aheadXY) : geotools.calcBearing(posXY, aheadXY);
        }

        const bearing = smoothAngle(this.lastBearing, rawBearing, 1-this.headingSmoothing);
        this.lastBearing = bearing;

        this.display.setCenter(camRefXY[0], camRefXY[1]);
        this.display.pitch(this.pitch);
        if (this.autoRotate /* && t < 1 */) {
            // Bearing (Azimut): 0°=N, 90°=E, 180°=S, 270°=W
            // Map.rotate: 0°=N oben, CW
            this.display.rotate((360 - bearing) % 360);
        }
    }

    private locateAlong(dist: number) {
        const cumDist = this.segLens;
        const n = cumDist.length - 1;
        if (dist <= 0) return {i: 0, t: 0};
        if (dist >= cumDist[n]) return {i: n - 1, t: 1};
        let lo = 0;
        let hi = n;
        while (lo < hi) {
            const mid = (lo + hi) >> 1;
            if (cumDist[mid] <= dist) lo = mid + 1;
            else hi = mid;
        }
        const i = Math.max(0, lo - 1);
        const segLen = cumDist[i + 1] - cumDist[i];
        const t = segLen > 0 ? (dist - cumDist[i]) / segLen : 0;
        return {i, t};
    };
}
