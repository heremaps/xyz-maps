/*
 * Copyright (C) 2019-2020 HERE Europe B.V.
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

import {easeOutSine} from './Easings';
import {JSUtils} from '@here/xyz-maps-common';

const isFnc = JSUtils.isFunction;

interface KineticPanHandlerOptions {
    duration?: number;
    onStart?: () => void;
    onStop?: () => void;
}


class KineticPanAnimator {
    // private task;
    private map;
    private duration: number;
    private raf: () => void;
    private rafId: number;
    private startTs: number;
    private deltaX: number;
    private deltaY: number;
    private lastDx: number;
    private lastDy: number;

    constructor(map, options: KineticPanHandlerOptions) {
        options = options || {};

        const handler = this;

        handler.map = map;
        handler.duration = options.duration || 500;

        if (isFnc(options.onStart)) {
            handler.onStart = options.onStart;
        }
        if (isFnc(options.onStop)) {
            handler.onStop = options.onStop;
        }

        // let fps = options.fps || (1000 / 60);
        // this.task = map.tasks.create({
        //     priority: 1,
        //     time: -1,
        //     delay: fps,
        //     exec: () => this._pan()
        // });

        handler.raf = () => {
            if (handler._pan()) {
                handler.rafId = requestAnimationFrame(handler.raf);
            }
        };
    }

    private _pan() {
        const panHandler = this;
        const deltaX = panHandler.deltaX;
        const deltaY = panHandler.deltaY;
        const duration = panHandler.duration;
        const startTs = panHandler.startTs;

        let dt = Date.now() - startTs;

        if (dt > duration) {
            dt = duration;
        }

        const cx = easeOutSine(dt, 0, deltaX, duration);
        const cy = easeOutSine(dt, 0, deltaY, duration);

        panHandler.map.pan(
            cx - panHandler.lastDx || 0,
            cy - panHandler.lastDy || 0
        );


        if (cx != deltaX || cy != deltaY) {
            panHandler.lastDx = cx;
            panHandler.lastDy = cy;

            return true; // panHandler.task.CONTINUE;
        }

        panHandler.onStop();
    }

    pan(startTS: number, dx: number, dy: number) {
        this.startTs = startTS;

        this.deltaX = dx;

        this.deltaY = dy;

        this.onStart();
        // this.task.start();
        this.raf();
    };

    cancel() {
        const rafId = this.rafId;
        if (rafId) {
            cancelAnimationFrame(rafId);
            this.rafId = null;
        }
        // this.task.cancel();
        this.onStop();

        this.startTs = 0;
        this.lastDx = 0;
        this.lastDy = 0;
    };

    onStart() {

    }

    onStop() {

    }
}


export {KineticPanAnimator};
