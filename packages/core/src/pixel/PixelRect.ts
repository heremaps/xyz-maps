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

/**
 *  A PixelRect represents a rectangular area in pixels.
 */
export class PixelRect {
    /**
     *  minimum x, the left-most x coordinate of the rectangular area.
     */
    minX: number;
    /**
     *  maximum y, the top-most y coordinate of the rectangular area.
     */
    minY: number;
    /**
     *  max x, the right-most x coordinate of the rectangular area.
     */
    maxX: number;
    /**
     *  max y, the bottom-most y coordinate of the rectangular area.
     */
    maxY: number;

    /**
     *  @param minX - minimum x coordinate
     *  @param minY - minimum y coordinate
     *  @param maxX - maximum x coordinate
     *  @param maxY - maximum y coordinate
     */
    constructor(minX: number, minY: number, maxX: number, maxY: number) {
        this.minX = minX;

        this.minY = minY;

        this.maxX = maxX;

        this.maxY = maxY;
    }
}
