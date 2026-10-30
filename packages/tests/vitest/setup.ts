/*
 * Copyright (C) 2019-2026 HERE Europe B.V.
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
import {afterAll} from 'vitest';
import './matchers';

// Lowers the mapviewchangeend trigger delay to speed up tests.
globalThis.__XYZTST_MVCEDelayMs = 10;

// Markup of the former statics/runner<component>.html. The specs and src/utils/triggerEvents.ts rely on #map.
if (__XYZ_MAP__ != 'none' && !document.getElementById('map')) {
    if (__XYZ_MAP__ == 'sized') {
        // a stylesheet rule and not an inline style, because specs validate that the container has no inline style
        const style = document.createElement('style');
        style.textContent = '#map { position: absolute; width: 800px; height: 600px; left: 50px; top: 50px; }';
        document.head.appendChild(style);
    }
    const map = document.createElement('div');
    map.id = 'map';
    document.body.appendChild(map);
}

// The integration tests create spaces in the XYZ Hub. Delete them when the spec file is done.
if (__XYZ_COMPONENT__ == 'integration') {
    afterAll(async () => {
        const {spacePool} = await import('../src/utils/spacePool');
        await new Promise<void>((resolve) => spacePool.clear(resolve));
    });
}
