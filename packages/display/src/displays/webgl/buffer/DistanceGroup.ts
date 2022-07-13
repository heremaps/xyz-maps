/*
 * Copyright (C) 2019-2022 HERE Europe B.V.
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
const DEFAULT_MIN_REPEAT = 256;

export class DistanceGroup {
    private sqDistance: number;

    length: number;
    // points: Float32Array;
    private points: Array<number>;// Float32Array;

    constructor(minDistance: number = DEFAULT_MIN_REPEAT) {
        this.length = 0;
        // this.points = new Float32Array(2 * 4096);
        this.points = []; // new Float32Array(2 * 4096);
        this.sqDistance = this.setMinDistance(minDistance);
    }

    setMinDistance(d: number): number {
        return this.sqDistance = d * d;
    }

    add(x: number, y: number) {
        const {points} = this;
        points[this.length++] = x;
        points[this.length++] = y;
    }

    clear() {
        this.length = 0;
        this.points.length = 0;
    }

    hasSpace(x, y): boolean {
        const {length, points, sqDistance} = this;
        let i = 0;
        if (sqDistance) {
            while (i < length) {
                const dx = x - points[i++];
                const dy = y - points[i++];
                const d = dx * dx + dy * dy;
                if (d < sqDistance) {
                    return false;
                }
            }
        }
        return true;
    }
}
