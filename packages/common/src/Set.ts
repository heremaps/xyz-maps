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

// TODO: switch to native es6 Set if IE11 support is dropped.

class Set {
    constructor(values?: any[]) {
        if (values) {
            for (var i = 0; i < values.length; i++) {
                this.add(values[i]);
            }
        }
    }

    add(value: any): boolean {
        const hasNot = !this.has(value);
        if (hasNot) {
            this.size = this._.push(value);
        }
        return hasNot;
    }

    clear(): void {
        this.size = this._.length = 0;
    }

    delete(value: any): boolean {
        const i = this._.indexOf(value);
        const has = i != -1;
        if (has) {
            this._.splice(i, 1);
            this.size--;
        }
        return has;
    }

    has(value: any): boolean {
        return this._.indexOf(value) != -1;
    }

    toArray(): any[] {
        return this._.slice(0);
    }

    size: number = 0;

    private _: any[] = [];
}

export default Set;
