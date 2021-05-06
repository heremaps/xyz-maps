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

import {LineBuffer} from './templates/LineBuffer';
import {addLineString, Cap, Join} from './addLineString';
import {DashAtlas} from '../DashAtlas';
import {GeoJSONCoordinate as Coordinate, Tile} from '@here/xyz-maps-core';
import {CollisionData, CollisionHandler} from '../CollisionHandler';
import {getRotatedBBox, rotate} from '../../../geometry';

const TO_DEG = 180 / Math.PI;
const DEFAULT_MIN_TEXT_REPEAT = 256;
let UNDEF;

export type PixelCoordinateCache = {
    data: Float32Array,
    length: number,
    lineLength: number
    collisions?: CollisionData[];
};

export class LineFactory {
    private dashes: DashAtlas;
    private readonly gl: WebGLRenderingContext;
    private prjCoords: PixelCoordinateCache = null; // coordinate cache
    private pixels: Float32Array;
    private decimals: number; // increase precision for tile scaling

    constructor(gl: WebGLRenderingContext) {
        this.dashes = new DashAtlas(gl);
        this.gl = gl;
        // reused pixel coordinate cache
        this.pixels = new Float32Array(262144); // -> 1MB;
    }

    private projectLine(coordinates: Coordinate[], tile: Tile, tileSize: number): PixelCoordinateCache {
        const {pixels, decimals} = this;
        if (!this.prjCoords) {
            let t = 0;
            let lineLength = 0;
            for (let c = 0, length = coordinates.length, x, y, _x, _y; c < length; c++) {
                x = tile.lon2x(coordinates[c][0], tileSize);
                y = tile.lat2y(coordinates[c][1], tileSize);

                if (!c ||
                    (Math.round(_x * decimals) - Math.round(x * decimals)) ||
                    (Math.round(_y * decimals) - Math.round(y * decimals))
                ) {
                    pixels[t++] = x;
                    pixels[t++] = y;

                    if (t > 2) {
                        const dx = _x - x;
                        const dy = _y - y;
                        lineLength += Math.sqrt(dx * dx + dy * dy);
                    }
                }
                _x = x;
                _y = y;
            }

            this.prjCoords = {
                data: pixels,
                length: t,
                lineLength: lineLength
            };
        }
        return this.prjCoords;
    }

    init(zoom: number, tileSize: number) {
        // allow more precision in case tiles are getting zoomed very close (zoomlevel 20+)
        this.decimals = zoom >= 20 - Number(tileSize == 512) ? 1e2 : 1;
        // clear projected coordinate cache
        this.prjCoords = null;
    }

    createLine(
        coordinates: Coordinate[],
        group,
        tile: Tile,
        tileSize: number,
        removeTileBounds: boolean,
        strokeDasharray: [number, number],
        strokeLinecap: Cap,
        strokeLinejoin: Join,
        strokeWidth: number,
        offset?: number,
        start?: number,
        stop?: number
    ) {
        if (strokeDasharray) {
            group.texture = this.dashes.get(strokeDasharray);
        }

        if (!group.buffer) {
            group.buffer = new LineBuffer();
        }

        const groupBuffer = group.buffer;

        addLineString(
            groupBuffer.attributes.a_position.data,
            groupBuffer.attributes.a_normal.data,
            this.projectLine(coordinates, tile, tileSize),
            tile,
            tileSize,
            removeTileBounds,
            strokeLinecap,
            strokeLinejoin,
            strokeWidth,
            strokeDasharray && groupBuffer.attributes.a_lengthSoFar.data,
            offset,
            start,
            stop
        );
    }

    placeAtSegments(
        coordinates: Coordinate[],
        tile: Tile,
        tileSize: number,
        collisions: CollisionHandler,
        priority: number,
        repeat: number,
        offsetX: number,
        offsetY: number,
        width: number,
        height: number,
        applyRotation: boolean,
        placeFunc: any
    ) {
        this.projectLine(coordinates, tile, tileSize);

        this.placeAlongLine(
            tile,
            tileSize,
            collisions,
            priority,
            repeat == UNDEF ? DEFAULT_MIN_TEXT_REPEAT : repeat,
            offsetX,
            offsetY,
            width,
            height,
            applyRotation,
            placeFunc
        );
    }

    placeAtPoints(
        coordinates: Coordinate[],
        tile: Tile,
        tileSize: number,
        collisions: CollisionHandler,
        priority: number,
        halfWidth: number,
        halfHeight: number,
        offsetX: number,
        offsetY: number,
        place: (x: number, y: number, alpha: number, collisionData?: CollisionData) => void
    ) {
        const prjCoords = this.projectLine(coordinates, tile, tileSize);

        if (prjCoords.collisions) {
            for (let cData of prjCoords.collisions) {
                place(cData.cx, cData.cy, 0, cData);
            }
            return;
        }

        const checkCollisions = collisions && [];

        for (let i = 0, {data, length} = prjCoords; i < length; i++) {
            let x = data[i];
            let y = data[++i];
            let collisionData;

            if (x >= 0 && y >= 0 && x < tileSize && y < tileSize) {
                if (checkCollisions) {
                    collisionData = collisions.insert(
                        x, y,
                        offsetX, offsetY,
                        halfWidth, halfHeight,
                        tile, tileSize,
                        priority
                    );

                    if (collisionData) {
                        checkCollisions.push(collisionData);
                    }
                }

                if (!checkCollisions || collisionData) {
                    place(x, y, 0, collisionData);
                }
            }
        }

        if (checkCollisions?.length) {
            prjCoords.collisions = checkCollisions;
        }
    }

    private placeAlongLine(
        tile: Tile,
        tileSize: number,
        collisions: CollisionHandler,
        priority: number,
        minRepeatDistance: number,
        offsetX: number,
        offsetY: number,
        width: number,
        height: number,
        applyRotation: boolean,
        place: (x: number, y: number, alpha: number, collisionData?: CollisionData) => void
    ) {
        const {prjCoords} = this;

        if (prjCoords.collisions) {
            for (let cData of prjCoords.collisions) {
                place(cData.cx, cData.cy, 0, cData);
            }
            return;
        }

        const vLength = prjCoords.length / 2;
        let coordinates = prjCoords.data;
        let prevDistance = Infinity;
        const checkCollisions = collisions && [];
        let lineWidth;
        let x2;
        let y2;
        let dx;
        let dy;
        let cx;
        let cy;
        // for optimal repeat distance the first label gets placed in the middle of the linestring.
        let offset = Math.floor(vLength / 2) - 1;
        // we move to the end of the linestring..
        let dir = 1;
        let x1 = coordinates[offset * 2];
        let y1 = coordinates[offset * 2 + 1];
        let startX = x1;
        let startY = y1;
        let startDistance = prevDistance;

        for (let i = 1; i < vLength; i++) {
            let c = offset + dir * i;
            if (c >= vLength) {
                // from now on we move from middle to beginning of linestring
                dir = -1;
                c = offset - 1;
                offset = vLength - 1;
                x1 = startX;
                y1 = startY;
                prevDistance = startDistance;
            }

            x2 = coordinates[c * 2];
            y2 = coordinates[c * 2 + 1];
            dx = x2 - x1;
            dy = y2 - y1;

            cx = dx * .5 + x1;
            cy = dy * .5 + y1;

            // not inside tile -> skip!
            if (cx >= 0 && cy >= 0 && cx < tileSize && cy < tileSize) {
                lineWidth = Math.sqrt(dx * dx + dy * dy);

                if (Math.floor(lineWidth / width) > 0) {
                    let alpha = 0;

                    if (applyRotation) {
                        alpha = Math.atan2(dy, dx);

                        if (dir == -1) {
                            alpha += Math.PI;
                        }
                    }


                    let d = (lineWidth - width) / 2;

                    if (prevDistance + d < minRepeatDistance) {
                        prevDistance += lineWidth;
                    } else {
                        let collisionData;
                        if (checkCollisions) {
                            let x = cx;
                            let y = cy;
                            let w = width;
                            let h = height;

                            if (alpha) {
                                const bbox = getRotatedBBox(alpha, width, height, cx, cy);
                                [x, y] = rotate(cx + offsetX, cy + offsetY, cx, cy, alpha);
                                w = bbox[2] - bbox[0];
                                h = bbox[3] - bbox[1];
                            }
                            collisionData = collisions.insert(
                                x, y,
                                0, 0,
                                w / 2, h / 2,
                                tile, tileSize,
                                priority
                            );

                            if (collisionData) {
                                checkCollisions.push(collisionData);
                            }
                        }

                        if (!checkCollisions || collisionData) {
                            if (startDistance == Infinity) {
                                startDistance = d;
                            }
                            prevDistance = d;

                            place(cx, cy, alpha * TO_DEG, collisionData);
                        }
                    }
                } else {
                    prevDistance += lineWidth;
                }
            }

            x1 = x2;
            y1 = y2;
        }

        if (checkCollisions?.length) {
            prjCoords.collisions = checkCollisions;
        }
    }
}


