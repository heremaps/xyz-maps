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
import {Animation} from './Animation';

const isFnc = JSUtils.isFunction;

interface ZoomAnimatorOptions {
    onStart?: () => void;
    onStop?: () => void;
}

class ZoomAnimator {
    private active: boolean;
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
    }

    private onStart() {
    }

    private onStop() {
    }

    async animate(zoomTo: number, zoomX: number, zoomY: number, duration: number) {
        const handler = this;
        const {map} = handler;

        if (!handler.active) {
            handler.active = true;
            handler.onStart();

            await (new Animation(map.getZoomlevel(), zoomTo, duration, 'easeOutCubic', (z) => {
                map.setZoomlevel(z, zoomX, zoomY);
            })).start();

            handler.onStop();
            handler.active = false;
        }
    };
}

export {ZoomAnimator};
