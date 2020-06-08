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

import Map from '@here/xyz-maps-display';

export function waitForViewportReady(display: Map, fn?:Function): Promise<Map> {
    return new Promise(async (resolve) => {
        let readyTimer;
        let mapviewchangestartcb = () => clearTimeout(readyTimer);
        // wait for next mapviewchangestart event, if map is not ready (e.g. map is still dragging), timout will be cleared by next start event
        let mapviewchangeendcb = () => readyTimer = setTimeout(()=>resolve(display), 50);

        display.addEventListener('mapviewchangestart', mapviewchangestartcb);
        display.addEventListener('mapviewchangeend', mapviewchangeendcb);

        if (fn) {
            await fn();
        }
    });
}

