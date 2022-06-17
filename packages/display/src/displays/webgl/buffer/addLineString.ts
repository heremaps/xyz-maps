/*
 * Copyright (C) 2019-2021 HERE Europe B.V.
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

import {FlexArray} from './templates/FlexArray';

export type Cap = 'round' | 'butt' | 'square';
export type Join = 'round' | 'bevel' | 'miter' | 'none';

const CAP_JOIN_ROUND = 'round';
const CAP_BUTT = 'butt';
const CAP_SQUARE = 'square';
const JOIN_MITER = 'miter';
const JOIN_BEVEL = 'bevel';
const SCALE = 8191;
const TILE_CLIP_MARGIN = 16;

enum OutCode {
    INSIDE = 0, // 0000
    LEFT = 1, // 0001
    RIGHT = 2, // 0010
    BOTTOM = 4, // 0100
    TOP = 8 // 1000
}

const computeOutCode = (x: number, y: number, xmin: number, xmax: number, ymin: number, ymax: number): OutCode => {
    let code = OutCode.INSIDE;
    if (x < xmin) {
        code |= OutCode.LEFT;
    } else if (x > xmax) {
        code |= OutCode.RIGHT;
    }
    if (y < ymin) {
        code |= OutCode.BOTTOM;
    } else if (y > ymax) {
        code |= OutCode.TOP;
    }
    return code;
};


const normalize = (p: number[]) => {
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

const addCap = (cap: Cap, x: number, y: number, z: false | number, nx: number, ny: number, vertex: FlexArray, normal: FlexArray, dir = 1) => {
    if (cap == CAP_JOIN_ROUND) {
        if (z === false) {
            vertex.push(x, y, x, y, x, y);
        } else {
            vertex.push(x, y, z, x, y, z, x, y, z);
        }

        nx *= Math.SQRT2 * dir;
        ny *= Math.SQRT2 * dir;

        normal.push(
            nx << 1 | 0, ny << 1 | 1, nx << 1 | 0, ny << 1 | 1, // p1.1
            nx << 1 | 1, ny << 1 | 0, nx << 1 | 1, ny << 1 | 0, // p1.2
            ny << 1 | 1, nx << 1 | 1, ny << 1 | 1, nx << 1 | 1 // p1.0
        );
    } else if (cap == CAP_SQUARE) {
        // -----------
        // | \       |
        // |   \     |
        // |     \   |
        // |       \ |
        // -----------
        if (z === false) {
            vertex.push(x, y, x, y, x, y, x, y, x, y, x, y);
        } else {
            vertex.push(x, y, z, x, y, z, x, y, z, x, y, z, x, y, z, x, y, z);
        }


        let sqNx = ny - nx;
        let sqNy = nx + ny;

        normal.push(
            nx << 1 | 0, ny << 1 | 1, 0, 0, // p1.2
            sqNy << 1 | 1, sqNx << 1 | 0, 0, 0, // p1.0
            nx << 1 | 1, ny << 1 | 0, 0, 0, // p1.1

            sqNx << 1 | 1, sqNy << 1 | 1, nx << 1 | 1, ny << 1 | 1, // p1.0
            sqNy << 1 | 1, sqNx << 1 | 0, nx << 1 | 1, ny << 1 | 1, // p1.0
            nx << 1 | 0, ny << 1 | 1, 0, 0 // p1.2
        );
    }
};


// const alignJoin = (normal, vertex) => {
//     // if (z1 != z2 && join == JOIN_BEVEL) {
//     console.log('first', first, 'last', last, c, 'prevLeft', prevLeft, z1, z2, z3);
//
//     debugger;
//     if (prevLeft) {
//         const _p1Down = [(prevEx + 2 * nx) << 1 | 1, (prevEy - 2 * ny) << 1 | 1];
//
//         normal.push(
//             prevEx << 1 | 1, prevEy << 1 | 1, nx << 1 | 1, ny << 1 | 1,
//             p1Down[0], p1Down[1], nx << 1 | 0, ny << 1 | 0,
//             _p1Down[0], _p1Down[1], nx << 1 | 0, ny << 1 | 0
//         );
//         p1Down = _p1Down;
//     } else {
//         const _p1Up = [(prevEx + 2 * nx) << 1 | 0, (prevEy - 2 * ny) << 1 | 0];
//         normal.push(
//             prevEx << 1 | 0, prevEy << 1 | 0, nx << 1 | 0, ny << 1 | 0,
//             p1Up[0], p1Up[1], nx << 1 | 1, ny << 1 | 1,
//             _p1Up[0], _p1Up[1], nx << 1 | 1, ny << 1 | 1
//         );
//         p1Up = _p1Up;
//     }
//     vertex.push(prevX2, prevY2, prevZ2, prevX2, prevY2, prevZ2, prevX2, prevY2, prevZ2);
// };


const addLineString = (
    vertex: FlexArray,
    normal: FlexArray,
    coordinates: Float32Array,
    lengthToSegments: Float32Array,
    vLength: number,
    dimensions: number,
    height: boolean | number,
    tileSize: number,
    removeTileBounds: boolean,
    cap: Cap,
    join: Join,
    strokeWidth: number,
    lengthToVertex?: number[] | false,
    isRing?: boolean,
    offset?: number,
    relStart = 0,
    relStop = 0
): number => {
    strokeWidth *= .5;

    // join = 'none'
    const clipOnTileEdges = !!height;
    const includeHeight = clipOnTileEdges;
    if (height === true && dimensions == 2) {
        height = 0;
    }

    const tileMax = tileSize + TILE_CLIP_MARGIN;
    const tileMin = -TILE_CLIP_MARGIN;
    const totalLineLength = lengthToSegments[vLength / dimensions - 1];
    let absStart = relStart * totalLineLength;
    let absStop = relStop * totalLineLength;

    if (absStart && absStop && relStop < relStart) {
        const flip = absStart;
        absStart = absStop;
        absStop = flip;
    }
    if (offset/* || height*/) {
        cap = CAP_BUTT;
        // line offset currently only works with none or meter joins
        if (join != 'none') {
            join = JOIN_MITER;
            // return addSegments(vertex, normal, coordinates, 0, vLength, tileSize,
            //     cap, join, strokeWidth, lengthToVertex, length, absStart, absStop, offset
            // );
        }
    }

    if (height) {
        cap = CAP_BUTT;
        join = 'none';
    }

    if (lengthToVertex) {
        cap = 'butt';
        if (!offset) {
            // keep meter join for offset dashed lines
            join = 'none';
        }
    }

    let outCode0 = computeOutCode(coordinates[0], coordinates[1], tileMin, tileMax, tileMin, tileMax);
    let segmentStartIndex = null;
    let segmentStopIndex = null;
    let outCode1;
    let prevOutCode;
    // let tileIntersection0;
    // let tileIntersection1;

    for (let i0 = 0, i1 = dimensions; i1 < vLength; i0 = i1, i1 += dimensions) {
        let x0 = coordinates[i0];
        let y0 = coordinates[i0 + 1];
        let z0 = height === true ? coordinates[i0 + 2] : <number>height;

        let x1 = coordinates[i1];
        let y1 = coordinates[i1 + 1];
        let z1 = height === true ? coordinates[i1 + 2] : <number>height;

        outCode1 = prevOutCode = computeOutCode(x1, y1, tileMin, tileMax, tileMin, tileMax);

        // based on Cohen–Sutherland clipping algorithm (https://en.wikipedia.org/wiki/Cohen%E2%80%93Sutherland_algorithm)
        while (true) {
            if (!(outCode0 | outCode1)) { // accept
                if (segmentStartIndex == null) {
                    segmentStartIndex = i0;
                }
                if (outCode1 !== prevOutCode) {
                    // point0 still inside and point1 is now out of tile
                    segmentStopIndex = i1;
                }
                break;
            } else if (outCode0 & outCode1) {
                // point0 and point1 are out of tile
                break;
            } else {
                // if (segmentStartIndex == null || i0 < segmentStartIndex) {
                //     segmentStartIndex = i0;
                // }
                let outCode = outCode0 || outCode1;
                let a;
                let x;
                let y;
                // calculate intersection with tile edge
                if (outCode & OutCode.TOP) { // point is above the tile
                    a = (tileMax - y0) / (y1 - y0);
                    x = x0 + (x1 - x0) * a;
                    y = tileMax;
                } else if (outCode & OutCode.BOTTOM) { // point is below the tile
                    a = (tileMin - y0) / (y1 - y0);
                    x = x0 + (x1 - x0) * a;
                    y = tileMin;
                } else if (outCode & OutCode.RIGHT) { // point is to the right of tile
                    a = (tileMax - x0) / (x1 - x0);
                    y = y0 + (y1 - y0) * a;
                    x = tileMax;
                } else if (outCode & OutCode.LEFT) { // point is to the left of tile
                    a = (tileMin - x0) / (x1 - x0);
                    y = y0 + (y1 - y0) * a;
                    x = tileMin;
                }
                let z = z0 + (z1 - z0) * a;
                outCode = computeOutCode(x, y, tileMin, tileMax, tileMin, tileMax);

                if (outCode0) {
                    // point0 is out of tile
                    outCode0 = outCode;
                    x0 = x;
                    y0 = y;
                    z0 = z;
                    // tileIntersection0 = [x,y,z];
                } else {
                    // point1 is out of tile
                    outCode1 = outCode;
                    x1 = x;
                    y1 = y;
                    z1 = z;
                    // tileIntersection1 = [x,y,z];
                }
            }
        }

        if (segmentStartIndex != null && (segmentStopIndex != null || i1 == vLength - dimensions)) {
            // geometry fully inside tile
            segmentStopIndex ||= vLength - dimensions;

            if (isRing) {
                segmentStartIndex -= dimensions;
            }
            // const capStart = tileIntersection0 ? 'butt' : cap;
            // const capStop = tileIntersection1 ? 'butt' : cap;
            addSegments(vertex, dimensions, normal, coordinates, includeHeight,
                height, lengthToSegments, vLength, segmentStartIndex, segmentStopIndex + dimensions,
                tileSize, cap, cap, join, strokeWidth, lengthToVertex, absStart, absStop, offset, isRing
                // tileIntersection0,
                // tileIntersection1
            );
            segmentStartIndex = null;
            segmentStopIndex = null;
            // tileIntersection0 = null;
            // tileIntersection1 = null;
        }

        outCode0 = prevOutCode;
    }

    return vertex.length;
};

const addSegments = (
    vertex: FlexArray,
    dimensions: number,
    normal: FlexArray,
    coordinates: Float32Array,
    includeHeight: boolean,
    height: boolean | number,
    lengthToSegments: Float32Array,
    totalLineCoords: number,
    start: number,
    end: number,
    tileSize: number,
    capStart: Cap,
    capStop: Cap,
    join: Join,
    strokeWidth: number,
    lengthToVertex: number[] | false,
    absStart?: number,
    absStop?: number,
    offset?: number,
    isRing?: boolean,
    firstCoord?: number[],
    lastCoord?: number[]
) => {
    let i0 = start;
    if (start < 0) {
        // handle rings
        i0 = totalLineCoords - dimensions + start;
    }

    let x1 = coordinates[i0];
    let y1 = coordinates[i0 + 1];
    let z1 = height === true ? coordinates[i0 + 2] : <number>height;

    if (firstCoord) {
        [x1, y1, z1] = firstCoord;
    }

    let lengthSoFar = lengthToSegments[i0 / dimensions];

    let vLength = end;
    let prevNUp;
    let prevNDown;
    let curJoin;
    let x2;
    let y2;
    let z2;
    let dx;
    let dy;
    let nx;
    let ny;
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
    let prevZ2 = null;
    let prevJoin;
    let n;

    if (absStop && absStop < lengthSoFar) {
        // we can skip because of absolute stop.
        return lengthSoFar;
    }

    // console.log('addsegment', start, '->', vLength);

    // let skipFirstSegment = isRing;
    let skipFirstSegment = isRing;


    for (let c = start + dimensions; c < vLength; c += dimensions) {
        let last = !isRing && c == vLength - dimensions;


        // console.log(c,'last?',last);

        let nextNormal = null;
        let bisectorExceeds = false;
        let left;
        let bisectorLength;

        if (last && lastCoord) {
            [x2, y2, z2] = lastCoord;
        } else {
            x2 = coordinates[c];
            y2 = coordinates[c + 1];
            z2 = height === true ? coordinates[c + 2] : <number>height;
        }

        curJoin = join;

        dx = x1 - x2;
        dy = y1 - y2;

        n = normalize([dx, dy]);
        nx = n[1];
        ny = n[0];

        first = first == null;

        const prevLengthSoFar = lengthSoFar;
        lengthSoFar = lengthToSegments[c / dimensions];
        // const totalSegmentLength = // Math.sqrt(dx*dx+dy*dy);
        const totalSegmentLength = lengthSoFar - prevLengthSoFar;

        length = totalSegmentLength;

        if (absStop) {
            if (absStop < lengthSoFar) {
                if (absStop > prevLengthSoFar) {
                    const relStopSegment = (absStop - prevLengthSoFar) / totalSegmentLength;

                    x2 = x1 - dx * relStopSegment;
                    y2 = y1 - dy * relStopSegment;
                    z2 = z1;

                    length *= relStopSegment;

                    // if (offset) {
                    //     // optimize if relative stop position is located in dead section of offset line..
                    //     // ..and line would run in opposite direction
                    //     const relStartSegment = (absStart - prevLengthSoFar) / totalSegmentLength;
                    //     // start is not on same segment
                    //     if (relStartSegment < 0) {
                    //         if (prevLeft) {
                    //             if (length + offset < 0) return prevLengthSoFar;
                    //         } else {
                    //             if (length + offset > 0) return prevLengthSoFar;
                    //         }
                    //     }
                    // }

                    last = true;
                    // we can skip the following coordinates
                    vLength = 0;
                }
            }
        }


        if (absStart) {
            if (absStart < lengthSoFar) {
                if (absStart > prevLengthSoFar) {
                    const relStartSegment = (absStart - prevLengthSoFar) / totalSegmentLength;
                    x1 = x1 - dx * relStartSegment;
                    y1 = y1 - dy * relStartSegment;
                    length *= (1 - relStartSegment);
                    first = true;
                }
            } else {
                x1 = x2;
                y1 = y2;
                z1 = z2;
                continue;
            }
        }


        if (first && last) {
            // single segment line -> we can skip joins
            join = 'none';
        }

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
            const j = c % (totalLineCoords - dimensions) + dimensions;
            const x3 = coordinates[j];
            const y3 = coordinates[j + 1];

            nextDx = x2 - x3;
            nextDy = y2 - y3;

            nextNormal = normalize([nextDx, nextDy]);
            nextNx = nextNormal[1];
            nextNy = nextNormal[0];

            ex = nextNx + nx;
            ey = -nextNy - ny;

            left = dx * nextDy - dy * nextDx < 0;
            // left = -nx * nextDx + ny * nextDy <0;

            let bisector = [ex, ey];
            // dot product
            bisectorLength = 1 / (bisector[0] * nx - bisector[1] * ny);

            if (bisectorLength == Infinity) {
                // parallel
                bisectorExceeds = true;
                ex = 2;
                ey = 2;
            } else {
                // >2 -> >90deg
                // bisectorExceeds = bisectorLength > 2;
                bisectorExceeds = bisectorLength > 3;
                // if angle is to sharp and bisector length goes to infinity we cut the cone
                // // bisectorLength > 10 behaves exactly like canvas2d..
                // // ..but we cut earlier to prevent "cone explosion"
                if (join == JOIN_MITER) {
                    if (bisectorExceeds) {
                        curJoin = JOIN_BEVEL;
                    }
                }
                // if (bisectorLength > 2) {
                if (bisectorLength > 2) {
                    [ex, ey] = normalize(bisector);
                    ex *= 2;
                    ey *= 2;
                } else {
                    // console.log('bisectorExceeds', ex, ey, b);
                    ex = bisector[0] * bisectorLength;
                    ey = bisector[1] * bisectorLength;
                }
            }
            ex *= -SCALE;
            ey *= -SCALE;
        }

        nx *= SCALE;
        ny *= SCALE;

        nUp = [-nx << 1 | 1, ny << 1 | 1];
        nDown = [nUp[0] ^ 1, nUp[1] ^ 1];

        p1Down = nDown;
        p2Down = nDown;
        p1Up = nUp;
        p2Up = nUp;

        if (join != 'none') {
            if (!last && curJoin == JOIN_MITER && vLength > 2 * dimensions /** 4**/) {
                p2Down = [ex << 1 | 0, ey << 1 | 0];
                p2Up = [ex << 1 | 1, ey << 1 | 1];
            }

            if (!first && !prevBisectorExceeds) {
                if (prevLeft) {
                    p1Up = [prevEx << 1 | 1, prevEy << 1 | 1];
                    if (join == 'miter') {
                        p1Down = [prevEx << 1 | 0, prevEy << 1 | 0]; // miter
                    }
                } else {
                    p1Down = [prevEx << 1 | 0, prevEy << 1 | 0];
                    if (join == 'miter') {
                        p1Up = [prevEx << 1 | 1, prevEy << 1 | 1]; // miter
                    }
                }
            }


            if (!bisectorExceeds && !last) {
                if (join != JOIN_MITER) {
                    let aEx = strokeWidth * ex / -SCALE;
                    let aEy = strokeWidth * ey / -SCALE;

                    if (left) {
                        aEx *= -1;
                        aEy *= -1;
                    }

                    let s = n[0] * aEx + n[1] * aEy;

                    if (length < s) {
                        bisectorExceeds = true;
                    } else if (left) {
                        p2Up = [ex << 1 | 1, ey << 1 | 1];
                    } else {
                        p2Down = [ex << 1 | 0, ey << 1 | 0];
                    }
                }
            }


            // if (hasZ && join == JOIN_BEVEL) {
            // if (!bisectorExceeds && z1 != z2 && join == JOIN_BEVEL && !last ) {
            //     console.log(bisectorExceeds, 'first???', first, 'last', last, c, 'left', left, z1, z2, z3);
            //     if (left) {
            //         const _p2Down = [(ex + 2 * nx) << 1 | 1, (ey - 2 * ny) << 1 | 1];
            //         // const _p2Up = [(ex + 2 * nx) << 1 | 0, (ey - 2 * ny) << 1 | 0];
            //         normal.push(
            //             p2Down[0], p2Down[1], 0, 0,
            //             p2Up[0], p2Up[1], 0, 0,
            //             _p2Down[0], _p2Down[1], 0, 0
            //         );
            //         p2Down = _p2Down;
            //     } else {
            //         const _p2Up = [(ex + 2 * nx) << 1 | 0, (ey - 2 * ny) << 1 | 0];
            //         // const _p2Up = [(ex + 2 * nx) << 1 | 0, (ey - 2 * ny) << 1 | 0];
            //         normal.push(
            //             p2Down[0], p2Down[1], 0, 0,
            //             p2Up[0], p2Up[1], 0, 0,
            //             _p2Up[0], _p2Up[1], 0, 0
            //         );
            //         p2Up = _p2Up;
            //     }
            //     vertex.push(x2, y2, z2, x2, y2, z2, x2, y2, z2);
            // }


            // console.log(c,first,last,'lengthSoFar',lengthSoFar);

            if ((!first || last) && lengthSoFar) {
                if (join == CAP_JOIN_ROUND) {
                    if (prevLeft) {
                        // Cone
                        // 1---2
                        //  \ /
                        //   3
                        normal.push(
                            prevNDown[0], prevNDown[1], prevNDown[0], prevNDown[1],
                            p1Down[0], p1Down[1], p1Down[0], p1Down[1],
                            prevEx << 1 | 0, prevEy << 1 | 0, prevEx << 1 | 0, prevEy << 1 | 0
                        );
                    } else {
                        // Cone
                        //   1
                        //  / \
                        // 3---2
                        normal.push(
                            prevEx << 1 | 1, prevEy << 1 | 1, prevEx << 1 | 1, prevEy << 1 | 1,
                            p1Up[0], p1Up[1], p1Up[0], p1Up[1],
                            prevNUp[0], prevNUp[1], prevNUp[0], prevNUp[1]
                        );
                    }

                    if (includeHeight) {
                        vertex.push(prevX2, prevY2, prevZ2, prevX2, prevY2, prevZ2, prevX2, prevY2, prevZ2);
                    } else {
                        vertex.push(prevX2, prevY2, prevX2, prevY2, prevX2, prevY2);
                    }
                }

                if (!first) {
                    if (!prevBisectorExceeds) {
                        if (join != JOIN_MITER) {
                            let an = normalize([prevEx, prevEy]); // alias normal
                            an[0] *= SCALE;
                            an[1] *= SCALE;

                            if (prevLeft) {
                                //   1
                                //  / \
                                // 3---2
                                if (join == JOIN_BEVEL) {
                                    // allow antialias for bevel join
                                    normal.push(
                                        prevEx << 1 | 1, prevEy << 1 | 1, an[0] << 1 | 1, an[1] << 1 | 1,
                                        p1Down[0], p1Down[1], an[0] << 1 | 0, an[1] << 1 | 0,
                                        prevNDown[0], prevNDown[1], an[0] << 1 | 0, an[1] << 1 | 0
                                    );
                                } else {
                                    normal.push(
                                        prevEx << 1 | 1, prevEy << 1 | 1, an[0] << 1 | 1, an[1] << 1 | 1,
                                        p1Down[0], p1Down[1], p1Down[0], p1Down[1],
                                        prevNDown[0], prevNDown[1], prevNDown[0], prevNDown[1]
                                    );
                                }
                            } else {
                                // 3---1
                                //  \ /
                                //   2
                                if (join == JOIN_BEVEL) {
                                    // allow antialias for bevel join
                                    normal.push(
                                        p1Up[0], p1Up[1], an[0] << 1 | 1, an[1] << 1 | 1,
                                        prevEx << 1 | 0, prevEy << 1 | 0, an[0] << 1 | 0, an[1] << 1 | 0,
                                        prevNUp[0], prevNUp[1], an[0] << 1 | 1, an[1] << 1 | 1
                                    );
                                } else {
                                    normal.push(
                                        p1Up[0], p1Up[1], p1Up[0], p1Up[1],
                                        prevEx << 1 | 0, prevEy << 1 | 0, an[0] << 1 | 0, an[1] << 1 | 0,
                                        prevNUp[0], prevNUp[1], prevNUp[0], prevNUp[1]
                                    );
                                }
                            }

                            if (includeHeight) {
                                vertex.push(prevX2, prevY2, prevZ2, prevX2, prevY2, prevZ2, prevX2, prevY2, prevZ2);
                            } else {
                                vertex.push(prevX2, prevY2, prevX2, prevY2, prevX2, prevY2);
                            }


                            // if (hasZ && join == JOIN_BEVEL) {
                            // if (z1 != z2 && join == JOIN_BEVEL) {
                            //     // console.log('first', first, 'last', last, c, 'prevLeft', prevLeft, z1, z2, z3);
                            //     if (prevLeft) {
                            //         const _p1Down = [(prevEx + 2 * nx) << 1 | 1, (prevEy - 2 * ny) << 1 | 1];
                            //         normal.push(
                            //             prevEx << 1 | 1, prevEy << 1 | 1, nx << 1 | 1, ny << 1 | 1,
                            //             p1Down[0], p1Down[1], nx << 1 | 0, ny << 1 | 0,
                            //             _p1Down[0], _p1Down[1], nx << 1 | 0, ny << 1 | 0
                            //         );
                            //         p1Down = _p1Down;
                            //     } else {
                            //         const _p1Up = [(prevEx + 2 * nx) << 1 | 0, (prevEy - 2 * ny) << 1 | 0];
                            //         normal.push(
                            //             prevEx << 1 | 0, prevEy << 1 | 0, nx << 1 | 0, ny << 1 | 0,
                            //             p1Up[0], p1Up[1], nx << 1 | 1, ny << 1 | 1,
                            //             _p1Up[0], _p1Up[1], nx << 1 | 1, ny << 1 | 1
                            //         );
                            //         p1Up = _p1Up;
                            //     }
                            //     vertex.push(prevX2, prevY2, prevZ2, prevX2, prevY2, prevZ2, prevX2, prevY2, prevZ2);
                            // }
                            // if (hasZ && join == JOIN_BEVEL) {
                            //     console.log(c,'prevLeft',prevLeft, z1, z2 ,z3);
                            //     if (prevLeft) {
                            //         const _p1Down = [(prevEx + 2 * nx) << 1 | 1, (prevEy - 2 * ny) << 1 | 1];
                            //
                            //         normal.push(
                            //             prevEx << 1 | 1, prevEy << 1 | 1, an[0] << 1 | 1, an[1] << 1 | 1,
                            //             p1Down[0], p1Down[1], an[0] << 1 | 0, an[1] << 1 | 0,
                            //             _p1Down[0], _p1Down[1], an[0] << 1 | 0, an[1] << 1 | 0
                            //         );
                            //         p1Down = _p1Down;
                            //     } else {
                            //         const _p1Up = [(prevEx + 2 * nx) << 1 | 0, (prevEy - 2 * ny) << 1 | 0];
                            //         normal.push(
                            //             prevEx << 1 | 0, prevEy << 1 | 0, an[0] << 1 | 0, an[1] << 1 | 0,
                            //             p1Up[0], p1Up[1], an[0] << 1 | 1, an[1] << 1 | 1,
                            //             _p1Up[0], _p1Up[1], an[0] << 1 | 1, an[1] << 1 | 1
                            //         );
                            //         p1Up = _p1Up;
                            //     }
                            //     vertex.push(prevX2, prevY2, prevZ2, prevX2, prevY2, prevZ2, prevX2, prevY2, prevZ2);
                            // }
                        }
                    } else if (!offset) {
                        // alias normal: no alias for round joins
                        let anX = 0;
                        let anY = 0;

                        if (join != CAP_JOIN_ROUND) {
                            let an = normalize([ex, ey]);
                            anX = an[0] * SCALE;
                            anY = an[1] * SCALE;
                        }

                        anX = anX << 1 | 1;
                        anY = anY << 1 | 1;

                        if (prevLeft) {
                            normal.push(
                                0, 0, 0, 0,
                                nDown[0], nDown[1], anX, anY,
                                prevNDown[0], prevNDown[1], anX, anY
                            );
                        } else {
                            normal.push(
                                0, 0, 0, 0,
                                prevNUp[0], prevNUp[1], anX, anY,
                                nUp[0], nUp[1], anX, anY
                            );
                        }

                        if (includeHeight) {
                            vertex.push(prevX2, prevY2, prevZ2, prevX2, prevY2, prevZ2, prevX2, prevY2, prevZ2);
                        } else {
                            vertex.push(prevX2, prevY2, prevX2, prevY2, prevX2, prevY2);
                        }
                    }
                }
            }
        }


        if (!skipFirstSegment) {
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
            if (includeHeight) {
                vertex.push(
                    x1, y1, z1,
                    x2, y2, z2,
                    x1, y1, z1,

                    x1, y1, z1,
                    x2, y2, z2,
                    x2, y2, z2
                );
            } else {
                vertex.push(
                    x1, y1,
                    x2, y2,
                    x1, y1,

                    x1, y1,
                    x2, y2,
                    x2, y2
                );
            }

            if (first) {
                addCap(capStart, x1, y1, includeHeight && z1, nx, ny, vertex, normal);
            }

            if (last) {
                addCap(capStop, x2, y2, includeHeight && z2, -nx, -ny, vertex, normal);
            }

            if (lengthToVertex) {
                const prevLengthSoFar = lengthSoFar - length;
                lengthToVertex.push(
                    prevLengthSoFar, lengthSoFar, prevLengthSoFar,
                    prevLengthSoFar, lengthSoFar, lengthSoFar
                );
            }
        }

        skipFirstSegment = false;

        prevNUp = nUp;
        prevNDown = nDown;
        prevEx = ex;
        prevEy = ey;

        prevX2 = x2;
        prevY2 = y2;
        prevZ2 = z2;

        x1 = x2;
        y1 = y2;
        z1 = z2;

        prevLeft = left;
        prevBisectorExceeds = bisectorExceeds;
        prevBisectorLength = bisectorLength;
        prevJoin = curJoin;
    }
};

export {addLineString, normalize};
