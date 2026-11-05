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
import * as core from '@here/xyz-maps-core';
import {describe, expect, it} from 'vitest';

describe('Core module exports', () => {
    it('provides defined runtime exports', () => {
        for (const [name, value] of Object.entries(core)) {
            expect(value, name).not.toBeUndefined();
        }
        expect(core.TileLayer).toBeTypeOf('function');
        expect(core.GeoPoint).toBeTypeOf('function');
        expect(core.TileLoaderManager).toBeTypeOf('function');
    });

    it('shares constructors between named exports and the legacy default API', () => {
        expect(core.default.layers.TileLayer).toBe(core.TileLayer);
        expect(core.default.geo.Point).toBe(core.GeoPoint);
        expect(core.default.loaders.Manager).toBe(core.TileLoaderManager);
    });
});
