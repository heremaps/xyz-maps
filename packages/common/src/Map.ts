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

let UNDEF;

type Key = string | number;

// TODO: switch to native es6 MAP if IE11 support is dropped.

class Map<TYPE> {
    private _: { [key: string]: TYPE } = {};

    constructor(map?: any[][]) {
        if (map) {
            for (let i = 0; i < map.length; i++) {
                this.set(map[i][0], map[i][1]);
            }
        }
    }

    clear() {
        this.size = 0;
        this._ = {};
    }

    delete(key: Key): boolean {
        const has = this.has(key);
        if (has) {
            delete this._[key];
            this.size--;
        }
        return has;
    }

    get(key: Key): TYPE {
        return this._[key];
    }

    has(key: Key): boolean {
        return this._[key] != UNDEF;
    }

    set(key: Key, value: TYPE): boolean {
        let hasNot = !this.has(key);

        if (hasNot) {
            this.size++;
            this._[key] = value;
        }
        return hasNot;
    }

    values(): TYPE[] {
        const map = this._;
        const values = [];
        for (let key in map) {
            values[values.length] = map[key];
        }
        return values;
    }

    keys(): Key[] {
        const map = this._;
        const keys = [];
        for (let key in map) {
            keys[keys.length] = key;
        }
        return keys;
    }

    forEach(callback: (value: TYPE, key: Key, map: Map<TYPE>) => void) {
        const map = this._;
        for (let key in map) {
            callback(map[key], key, this);
        }
    }

    size: number = 0;
}

export default Map;
