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

class ZoomAnimator extends Animator {
    private map: Map;

    constructor(map: Map, options: AnimatorOptions = {}) {
        options.easing = options.easing || 'easeOutCubic';
        super(options);
        this.map = map;
    }

    async start(zoomTo: number, zoomX: number, zoomY: number, duration: number) {
        const {map} = this;

        this.animate(map.getZoomlevel(), zoomTo, duration, (z) => {
            map.setZoomlevel(<number>z, zoomX, zoomY);
        });
    };
}

export {ZoomAnimator};
