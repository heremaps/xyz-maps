/*
 * Copyright (C) 2019-2023 HERE Europe B.V.
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

import {Feature} from '../features/Feature';


export class FeatureRegistryInfo {
    feature: Feature;
    tiles: Set<string>;

    constructor(feature: Feature) {
        this.feature = feature;
        this.tiles = new Set();
    }
}

export class FeatureRegistry {
    private _map: Map<string, FeatureRegistryInfo> = new Map();

    has(id: string | number): boolean {
        return this._map.has(String(id));
    }

    get(id: number | string): FeatureRegistryInfo {
        return this._map.get(String(id));
    }

    set(id: string | number, featureStorageInfo: FeatureRegistryInfo) {
        this._map.set(String(id), featureStorageInfo);
    }

    delete(id: string | number) {
        this._map.delete(String(id));
    }

    toArray(): FeatureRegistryInfo['feature'][] {
        const array = new Array(this._map.size);
        let i = 0;
        this._map.forEach((f) => array[i++] = f.feature);
        return array;
    }

    size(): number {
        return this._map.size;
    }

    clear() {
        this._map.clear();
    }
}
