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
import {Map} from '@here/xyz-maps-display';
import {onTestFinished} from 'vitest';
import prepare from '../utils/prepareData';

export type MapFixtureOptions = Omit<ConstructorParameters<typeof Map>[1], 'layers'> & {
    renderOptions?: WebGLContextAttributes
};

/**
 * Owns a fresh Map and dataset for one test, including failed construction.
 * Register viewport/editor readiness immediately after creation, before rendering actions.
 */
export async function createMapFixture(dataset: Parameters<typeof prepare>[0], options: MapFixtureOptions) {
    const preparedData = await prepare(dataset);
    let display: Map;
    onTestFinished(async () => {
        try {
            if (display?.destroy) display.destroy();
        } finally {
            await preparedData.clear();
        }
    });
    display = new Map(document.getElementById('map'), {...options, layers: preparedData.getLayers()});
    return {preparedData, display};
}
