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

type Cap = 'round' | 'butt' | 'square';
type Join = 'round' | 'bevel' | 'miter' | 'none';

const CAP_SQUARE = 'square';
const JOIN_MITER = 'miter';
const JOIN_BEVEL = 'bevel';

// const SCALE = 1;
const SCALE = 8192;

const normalize = (p) => {
    let x = p[0];
    let y = p[1];
    let len = x * x + y * y;
    if (len > 0) {
        len = 1 / Math.sqrt(len);
        // len = 127 / Math.sqrt(len);
        // len = SCALE / Math.sqrt(len);
        // len = 32767 / Math.sqrt(len);
        p[0] = x * len;
        p[1] = y * len;
    }
    return p;
};


const addCap = (cap: Cap, x: number, y: number, nx: number, ny: number, vertex: number[], normal: number[]) => {
    if (cap == 'round') {
        vertex.push(x, y, x, y, x, y);

        nx *= Math.SQRT2;
        ny *= Math.SQRT2;

        normal.push(
            -nx, ny, -nx, ny, // p1.1
            nx, -ny, nx, -ny, // p1.2
            ny, nx, ny, nx // p1.0
        );
    } else if (cap == CAP_SQUARE) {
        // -----------
        // | \       |
        // |   \     |
        // |     \   |
        // |       \ |
        // -----------
        vertex.push(x, y, x, y, x, y, x, y, x, y, x, y);

        let sqNx = ny - nx;
        let sqNy = nx + ny;

        normal.push(
            -nx, ny, 0, 0, // p1.2
            sqNy, -sqNx, 0, 0, // p1.0
            nx, -ny, 0, 0, // p1.1

            sqNx, sqNy, nx, ny, // p1.0
            sqNy, -sqNx, nx, ny, // p1.0
            -nx, ny, 0, 0, // p1.2
        );
    }
};

const addLineString = (vertex: number[], normal: number[], coordinates: [number, number, number?][], tile, tileSize: number, cap: Cap, join: Join, strokeWidth: number, lengthSoFar?: number[]) => {
    strokeWidth *= .5;

    const vLength = coordinates.length;
    let x1 = tile.lon2x(coordinates[0][0], tileSize);
    let y1 = tile.lat2y(coordinates[0][1], tileSize);
    let totalLength = 0;
    let segments = 0;
    let prevNUp;
    let prevNDown;
    let length;
    let curJoin;
    let x2;
    let y2;
    let dx;
    let dy;
    let nx;
    let ny;
    let x3 = null;
    let y3 = null;
    let ex;
    let ey;
    let prevEx;
    let prevEy;
    let nUp;
    let p1Up;
    let p2Up;
    let nDown;
    let p1Down;
    let p2Down;
    let prevBisectorExceeds;
    let prevBisectorLength = 0;
    let prevLeft;
    let nextDx = null;
    let nextDy = null;
    let nextNx = null;
    let nextNy = null;
    let first = null;
    let prevX2 = null;
    let prevY2 = null;
    let prevJoin;
    let n;

    if (lengthSoFar) {
        cap = 'butt';
        join = 'none';
    }


    for (let c = 1; c < vLength; c++) {
        x2 = x3 == null ? tile.lon2x(coordinates[c][0], tileSize) : x3;
        y2 = y3 == null ? tile.lat2y(coordinates[c][1], tileSize) : y3;

        let last = c == vLength - 1;
        let left;
        let nextNormal = null;
        let next = null;
        let bisectorExceeds = false;
        let bisectorLength;

        curJoin = join;

        if (!last || first == null) {
            dx = x1 - x2;
            dy = y1 - y2;

            n = normalize([dx, dy]);
            nx = n[1];
            ny = n[0];
        } else {
            dx = nextDx;
            dy = nextDy;
            prevBisectorLength = 0;

            x2 = x1;
            y2 = y1;

            x1 = x3;
            y1 = y3;
            nx = -nextNx;
            ny = -nextNy;
            ex = -prevEx;
            ey = -prevEy;
            left = !prevLeft;
            bisectorExceeds = prevBisectorExceeds;
            curJoin = prevJoin;
        }

        if (!dx && !dy) {
            x3 = null;
            y3 = null;
            continue;
        }

        first = first == null;

        if (first && last) {
            // single segment line -> we can skip joins
            join = 'none';
        }

        let isEnd = last || first;

        length = Math.sqrt(dx * dx + dy * dy);

        //          p1.1                        p2.1
        //         / *---------------------------* \
        //       /   ^             ^             |   \
        //      /    |n1           |n            |     \
        //     /     |             |             |      \
        // p1.0 --- p1 ------------------------- p2 --- p2.0
        //     \     |                           |     /
        //      \    |n2                         |    /
        //       \   v                           |   /
        //         \ *---------------------------* /
        //          p1.2                        p2.2

        if (!last) {
            let p3;
            while (p3 = coordinates[c + 1]) {
                x3 = tile.lon2x(p3[0], tileSize);
                y3 = tile.lat2y(p3[1], tileSize);

                nextDx = x2 - x3;
                nextDy = y2 - y3;

                if (nextDx || nextDy) {
                    break;
                }
                // skip next next segment
                c++;
            }

            if (!p3) {
                last = true;
                // last/ending segment -> we can skip triangulation for linejoins
                join = 'none';
            } else {
                next = [nextDx, nextDy];
                nextNormal = normalize(next.slice());
                // nextNormal = normalize2([], next);
                nextNx = nextNormal[1];
                nextNy = nextNormal[0];

                ex = nextNx + nx;
                ey = -nextNy - ny;

                left = dx * nextDy - dy * nextDx < 0;
                // left = -nx * nextDx + ny * nextDy <0;

                const bisector = [ex, ey];
                // dot product
                bisectorLength = 1 / (bisector[0] * nx - bisector[1] * ny);

                if (bisectorLength == Infinity) {
                    // parallel
                    bisectorExceeds = true;
                    ex = 2 * SCALE;
                    ey = 2 * SCALE;
                } else {
                    // if angle is to sharp and bisector length goes to infinity we cut the cone
                    // bisectorLength > 10 behaves exactly like canvas2d..
                    // ..but we cut earlier to prevent "cone explosion"
                    if (join == JOIN_MITER) {
                        if (bisectorLength > 2) {
                            curJoin = JOIN_BEVEL;
                        }
                    }

                    ex = bisector[0] * bisectorLength;
                    ey = bisector[1] * bisectorLength;

                    // >2 -> >90deg
                    let b = Math.sqrt(ex * ex + ey * ey) / 2;
                    bisectorExceeds = b > 1;

                    if (bisectorExceeds) {
                        ex /= b;
                        ey /= b;
                    }

                    ex *= SCALE;
                    ey *= SCALE;
                }
            }
        }

        nx *= SCALE;
        ny *= SCALE;

        nUp = [-nx, ny];
        nDown = [nx, -ny];

        p1Down = nDown;
        p2Down = nDown;
        p1Up = nUp;
        p2Up = nUp;

        if (join != 'none') {
            if (curJoin == JOIN_MITER && vLength > 2) {
                if (left) {
                    p2Up = [-ex, -ey];
                    p2Down = [ex, ey];
                } else {
                    p2Up = [-ex, -ey];
                    p2Down = [ex, ey];
                }
            }

            if (!isEnd && !prevBisectorExceeds) {
                if (!prevLeft) {
                    p1Down = [prevEx, prevEy];
                    if (join == 'miter') {
                        p1Up = [-prevEx, -prevEy]; // miter
                    }
                } else {
                    p1Up = [-prevEx, -prevEy];
                    if (join == 'miter') {
                        p1Down = [prevEx, prevEy]; // miter
                    }
                }
            }

            // if (!bisectorExceeds && totalLength ) {
            if (!bisectorExceeds && vLength > 2) {
                if (join != JOIN_MITER) {
                    let aEx = strokeWidth * ex / SCALE;
                    let aEy = strokeWidth * ey / SCALE;
                    let s;

                    if (left) {
                        s = n[0] * -aEx + n[1] * -aEy;
                    } else {
                        s = n[0] * aEx + n[1] * aEy;
                    }
                    if (length < s) {
                        bisectorExceeds = true;
                    } else {
                        if (left) {
                            p2Up = [-ex, -ey];
                        } else {
                            p2Down = [ex, ey];
                        }
                    }
                }
            }


            if ((!first || last) && totalLength) {
                // if ((!first || last) && vLength > 2 ) {
                if (join == 'round') {
                    if (prevLeft) {
                        // Cone
                        // 1---2
                        //  \ /
                        //   3
                        let p3x = p1Down[0];
                        let p3y = p1Down[1];

                        if (last) { // reverse order
                            p3x = p2Up[0];
                            p3y = p2Up[1];
                        }
                        normal.push(
                            prevNDown[0], prevNDown[1], prevNDown[0], prevNDown[1],
                            p3x, p3y, p3x, p3y,
                            prevEx, prevEy, prevEx, prevEy
                        );
                    } else {
                        // Cone
                        //   1
                        //  / \
                        // 3---2
                        let p3x = p1Up[0];
                        let p3y = p1Up[1];

                        if (last) { // reverse order
                            p3x = p2Down[0];
                            p3y = p2Down[1];
                        }
                        normal.push(
                            -prevEx, -prevEy, -prevEx, -prevEy,
                            p3x, p3y, p3x, p3y,
                            prevNUp[0], prevNUp[1], prevNUp[0], prevNUp[1]
                        );
                    }

                    vertex.push(prevX2, prevY2, prevX2, prevY2, prevX2, prevY2);
                }


                if (!first && !prevBisectorExceeds) {
                    if (join != JOIN_MITER) {
                        // if (join != JOIN_MITER && !(prevEvil) ) {
                        let an = normalize([prevEx, prevEy]); // alias normal
                        an[0] *= SCALE;
                        an[1] *= SCALE;

                        if (prevLeft) {
                            //   1
                            //  / \
                            // 3---2
                            let p3x = p1Down[0];
                            let p3y = p1Down[1];

                            if (last) { // reverse order
                                p3x = p2Up[0];
                                p3y = p2Up[1];
                            }

                            if (join == JOIN_BEVEL) {
                                // allow antialias for bevel join
                                normal.push(
                                    -prevEx, -prevEy, -an[0], -an[1],
                                    p3x, p3y, an[0], an[1],
                                    prevNDown[0], prevNDown[1], an[0], an[1]
                                );
                            } else {
                                normal.push(
                                    -prevEx, -prevEy, -an[0], -an[1],
                                    p3x, p3y, p3x, p3y,
                                    prevNDown[0], prevNDown[1], prevNDown[0], prevNDown[1]
                                );
                            }
                        } else {
                            // 3---1
                            //  \ /
                            //   2
                            let p3x = p1Up[0];
                            let p3y = p1Up[1];

                            if (last) { // reverse order
                                p3x = p1Down[0];
                                p3y = p1Down[1];
                            }

                            if (join == JOIN_BEVEL) {
                                // allow antialias for bevel join
                                normal.push(
                                    p3x, p3y, -an[0], -an[1],
                                    prevEx, prevEy, an[0], an[1],
                                    prevNUp[0], prevNUp[1], -an[0], -an[1]
                                );
                            } else {
                                normal.push(
                                    p3x, p3y, p3x, p3y,
                                    prevEx, prevEy, an[0], an[1],
                                    prevNUp[0], prevNUp[1], prevNUp[0], prevNUp[1]
                                );
                            }
                        }

                        vertex.push(prevX2, prevY2, prevX2, prevY2, prevX2, prevY2);
                    }
                } else {
                    if (!first) {
                        // alias normal: no alias for round joins
                        let anX = 0;
                        let anY = 0;
                        if (join != 'round') {
                            let an = normalize([ex, ey]);
                            anX = an[0] * SCALE;
                            anY = an[1] * SCALE;
                        }

                        if (prevLeft) {
                            let down = last ? nUp : nDown;
                            normal.push(
                                0, 0, 0, 0,
                                down[0], down[1], anX, anY,
                                prevNDown[0], prevNDown[1], anX, anY
                            );
                        } else {
                            let up = last ? nDown : nUp;
                            normal.push(
                                0, 0, 0, 0,
                                up[0], up[1], anX, anY,
                                prevNUp[0], prevNUp[1], anX, anY
                            );
                        }

                        vertex.push(prevX2, prevY2, prevX2, prevY2, prevX2, prevY2);
                    }
                }
            }
        }

        normal.push(
            // 1up -> 2down -> 1down
            //
            // 1
            // | >.
            // 1  2
            p1Up[0], p1Up[1], nUp[0], nUp[1],
            p2Down[0], p2Down[1], nDown[0], nDown[1],
            p1Down[0], p1Down[1], nDown[0], nDown[1],
            // 1up -> 2up -> 2down
            //
            // 1  2
            // °< |
            //    2
            p1Up[0], p1Up[1], nUp[0], nUp[1],
            p2Up[0], p2Up[1], nUp[0], nUp[1],
            p2Down[0], p2Down[1], nDown[0], nDown[1]
        );

        // add vertex data
        vertex.push(
            x1, y1,
            x2, y2,
            x1, y1,

            x1, y1,
            x2, y2,
            x2, y2
        );

        if (first || last) {
            addCap(cap, x1, y1, nx, ny, vertex, normal);
        }

        if (first && last) {
            addCap(cap, x2, y2, -nx, -ny, vertex, normal);
        }

        // length so far including current segment
        length += totalLength;

        if (lengthSoFar) {
            lengthSoFar.push(
                totalLength, length, totalLength,
                totalLength, length, length
            );
        }

        prevNUp = nUp;
        prevNDown = nDown;
        prevEx = ex;
        prevEy = ey;

        prevX2 = x2;
        prevY2 = y2;

        x1 = x2;
        y1 = y2;

        prevLeft = left;
        prevBisectorExceeds = bisectorExceeds;
        prevBisectorLength = bisectorLength;
        prevJoin = curJoin;
        totalLength = length;
    }

    return segments;
};

export {addLineString, normalize};
