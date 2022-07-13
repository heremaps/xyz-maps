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

import {Tile} from '../../tile/Tile';

export class MVTTile extends Tile {
    private s: number;

    constructor(quadkey: string, type: string, clipped: boolean, expire?: number) {
        super(quadkey, type, clipped, expire);
        this.s = (1 << this.z);
    }

    lon2x(x: number, width: number = 256) {
        // const size = 1 << this.z;
        // const tileX = this.x / size;
        // return (x-tileX) * 512 * size;
        return (x * this.s - this.x) * width;
    }

    lat2y(y: number, height: number = 256) {
        // const size = 1 << this.z;
        // const tileY = this.y / size;
        // return (y - tileY) * 512 * size;
        return (y * this.s - this.y) * height;
    }

    isInside(point) {
        const x = point[0] * this.s - this.x;
        const y = point[1] * this.s - this.y;
        return !(x < 0 || x > 1 || y < 0 || y > 1);
        // return true;
    }
}
