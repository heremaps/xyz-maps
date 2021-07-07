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

import {Map} from '../Map';
import {Animator, AnimatorOptions} from './Animator';
import {getDistance} from '../geometry';
import {GeoPoint, webMercator as project} from '@here/xyz-maps-core';

class FlightAnimator extends Animator {
    private map: Map;

    constructor(map: Map, options: AnimatorOptions = {}) {
        options.easing = options.easing || 'easeOut';
        super(options);
        this.map = map;
    }

    // animation is based on https://www.win.tue.nl/~vanwijk/zoompan.pdf
    async start(centerTo, zoomTo: number, duration?: number) {
        const {map} = this;
        const zoomFrom = map.getZoomlevel();
        const worldSizePixel = map._wSize;
        const centerFrom = map.getCenter();
        const centerFromX = project.lon2x(centerFrom.longitude, worldSizePixel);
        const centerFromY = project.lat2y(centerFrom.latitude, worldSizePixel);
        const centerToX = project.lon2x(centerTo.longitude, worldSizePixel);
        const centerToY = project.lat2y(centerTo.latitude, worldSizePixel);

        const w0 = Math.max(map.getWidth(), map.getHeight());
        const w1 = w0 / Math.pow(2, zoomTo - zoomFrom);
        const u1 = getDistance(centerToX, centerToY, centerFromX, centerFromY) || 1;
        const rho = 1.42;
        const rho2 = rho * rho;
        const sinh = (n) => (Math.exp(n) - Math.exp(-n)) / 2;
        const cosh = (n) => (Math.exp(n) + Math.exp(-n)) / 2;
        const tanh = (n) => sinh(n) / cosh(n);
        const r = (i) => {
            const b = (w1 * w1 - w0 * w0 + (i ? -1 : 1) * rho2 * rho2 * u1 * u1) / (2 * (i ? w1 : w0) * rho2 * u1);
            return Math.log(Math.sqrt(b * b + 1) - b);
        };
        const r0 = r(0);
        const w = (s) => w0 * (cosh(r0) / cosh(r0 + rho * s));
        const u = (s) => w0 * (cosh(r0) * tanh(r0 + rho * s) - sinh(r0)) / rho2;
        const S = (r(1) - r0) / rho;
        const W = w0 * Math.pow(2, zoomFrom);

        duration = duration || 1000 * S * .77;

        this.animate(0, S, duration, (s: number) => {
            const U = u(s) / u1;
            const x = centerFromX + (centerToX - centerFromX) * U;
            const y = centerFromY + (centerToY - centerFromY) * U;
            let center;
            let zoom;

            if (s >= S) {
                center = centerTo;
                zoom = zoomTo;
            } else {
                center = new GeoPoint(project.x2lon(x, worldSizePixel), project.y2lat(y, worldSizePixel));
                zoom = Math.log(W / w(s)) / Math.LN2;
                zoom = isNaN(zoom) ? zoomFrom : zoom;
            }

            map.setZoomlevel(zoom);
            map.setCenter(center);
        });
    }
}

export {FlightAnimator};
