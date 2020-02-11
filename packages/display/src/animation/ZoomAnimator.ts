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

import {JSUtils} from '@here/xyz-maps-common';

const isFnc = JSUtils.isFunction;

interface ZoomAnimatorOptions {
    onStart?: () => void;
    onStop?: () => void;
}

class ZoomAnimator {
    private duration: number;
    private startTs: number = 0;
    private zoomX: number;
    private zoomY: number;
    private zoomStart: number;
    private zoomDelta: number;
    private map;

    constructor(map, options: ZoomAnimatorOptions) {
        let handler = this;

        handler.map = map;

        if (isFnc(options.onStart)) {
            handler.onStart = options.onStart;
        }
        if (isFnc(options.onStop)) {
            handler.onStop = options.onStop;
        }

        handler._animate = handler._animate.bind(handler);

        // this.task = map.tasks.create({
        //     delay: 1000 / 60,
        //     // make sure next iteration is triggerd with delay!
        //     time: -1,
        //     priority: 1,
        //     exec: ()=>handler.zoom(),
        // });
    }

    private zoom() {
        const handler = this;
        const dMS = +new Date - handler.startTs;
        const percent = dMS / handler.duration;
        let sublevel = percent % 1;

        if (percent >= 1) {
            sublevel = 1;
        }

        handler.map.setZoomlevel(handler.zoomStart + (sublevel * handler.zoomDelta), handler.zoomX, handler.zoomY);

        if (dMS < handler.duration) {
            return true; // task.CONTINUE;
        }
        // animation done
        handler.startTs = 0;
        handler.onStop();
    }

    private _animate() {
        const handler = this;
        if (handler.zoom()) {
            requestAnimationFrame(handler._animate);
        }
    };

    private onStart() {

    }

    private onStop() {

    }


    animate(zoomToLevel: number, zoomX: number, zoomY: number, duration: number) {
        const handler = this;

        if (!handler.startTs) {
            handler.onStart();

            handler.startTs = Date.now();

            handler.zoomX = zoomX;

            handler.zoomY = zoomY;

            handler.zoomStart = handler.map.getZoomlevel();

            handler.duration = duration;

            handler.zoomDelta = zoomToLevel - handler.zoomStart;

            // handler.task.start();
            requestAnimationFrame(handler._animate);
        }
    };
}

export {ZoomAnimator};
