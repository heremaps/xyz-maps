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

type Point = [number, number, number?];

export const doPolygonsIntersect = (polyA: Point[], polyB: Point[]): boolean => {
    for (let polygon of [polyA, polyB]) {
        for (let i1 = 0; i1 < polygon.length; i1++) {
            let minA = UNDEF;
            let maxA = UNDEF;
            let minB = UNDEF;
            let maxB = UNDEF;
            let projected;
            let i2 = (i1 + 1) % polygon.length;
            let p1 = polygon[i1];
            let p2 = polygon[i2];
            let normal = [p2[1] - p1[1], p1[0] - p2[0]];

            for (let point of polyA) {
                projected = normal[0] * point[0] + normal[1] * point[1];
                if (minA === UNDEF || projected < minA) {
                    minA = projected;
                }
                if (maxA === UNDEF || projected > maxA) {
                    maxA = projected;
                }
            }

            for (let point of polyB) {
                projected = normal[0] * point[0] + normal[1] * point[1];
                if (minB === UNDEF || projected < minB) {
                    minB = projected;
                }
                if (maxB === UNDEF || projected > maxB) {
                    maxB = projected;
                }
            }

            if (maxA < minB || maxB < minA) {
                return false;
            }
        }
    }
    return true;
};

export const rotate = (x: number, y: number, originX: number, originY: number, angle: number): Point => {
    let sin = Math.sin(angle);
    let cos = Math.cos(angle);
    let dx = x - originX;
    let dy = y - originY;

    return [
        cos * dx - sin * dy + originX,
        sin * dx + cos * dy + originY
    ];
};

export const getRotatedBBox = (
    rotation: number,
    width: number,
    height: number,
    cx = 0,
    cy = 0
): [number, number, number, number] => {
    width *= .5;
    height *= .5;
    const minX = cx - width;
    const maxX = cx + width;
    const minY = cy - height;
    const maxY = cy + height;
    const r1 = rotate(minX, minY, cx, cy, rotation);
    const r2 = rotate(maxX, maxY, cx, cy, rotation);
    const r3 = rotate(minX, maxY, cx, cy, rotation);
    const r4 = rotate(maxX, minY, cx, cy, rotation);
    return [
        Math.min(r1[0], r2[0], r3[0], r4[0]),
        Math.min(r1[1], r2[1], r3[1], r4[1]),
        Math.max(r1[0], r2[0], r3[0], r4[0]),
        Math.max(r1[1], r2[1], r3[1], r4[1])
    ];
};

export const isInBox = (x: number, y: number, xmin: number, ymin: number, xmax: number, ymax: number): boolean => {
    return x > xmin && x < xmax && y > ymin && y < ymax;
};


export const intersectBBox = (ax: number, ax2: number, ay: number, ay2: number, bx: number, bx2: number, by: number, by2: number): boolean => {
    return ax <= bx2 && bx <= ax2 && ay <= by2 && by <= ay2;
};
