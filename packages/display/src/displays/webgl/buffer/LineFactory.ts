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
import {DistanceGroup} from './DistanceGroup';

const TO_DEG = 180 / Math.PI;
const DEFAULT_MIN_REPEAT = 256;
let UNDEF;

type PlacePointCallback = (x: number, y: number, z: number | null, rotZ: number, rotY: number, collisionData?: CollisionData) => void;


export class LineFactory {
    private dashes: DashAtlas;
    private readonly gl: WebGLRenderingContext;

    private readonly pixels: Float32Array; // projected coordinate cache
    private length: number = 0; // length of coordinate cache
    private dimensions: number; // dimensions of coordinate cache
    private readonly alpha: Float32Array; // segment angle cache
    private lineLength: Float32Array; // length from start to segment at index of the current projected line
    private collisions: CollisionData[];

    private decimals: number; // increase precision for tile scaling

    private readonly repeat: { [groupId: string]: DistanceGroup };
    private dId: string;

    constructor(gl: WebGLRenderingContext) {
        this.dashes = new DashAtlas(gl);
        this.gl = gl;
        // reused pixel coordinate cache
        this.pixels = new Float32Array(262144); // -> 1MB;
        this.alpha = new Float32Array(131072);
        this.lineLength = new Float32Array(131072);
        this.repeat = {};
    }

    private getDistanceGrp() {
        return this.repeat[this.dId];
    }

    private projectLine(coordinates: Coordinate[], tile: Tile, tileSize: number): number {
        const {pixels, decimals} = this;
        if (!this.length) {
            let t = 0;
            const dimensions = typeof coordinates[0][2] == 'number' ? 3 : 2;
            const hasZ = dimensions === 3;

            for (let c = 0, length = coordinates.length, x, y, z, _x, _y, _z; c < length; c++) {
                let coord = coordinates[c];
                x = tile.lon2x(coord[0], tileSize);
                y = tile.lat2y(coord[1], tileSize);
                z = coord[2] || 0;

                if (!c ||
                    (Math.round(_x * decimals) - Math.round(x * decimals)) ||
                    (Math.round(_y * decimals) - Math.round(y * decimals)) ||
                    (hasZ && z != _z)
                ) {
                    pixels[t++] = x;
                    pixels[t++] = y;

                    if (hasZ) {
                        pixels[t++] = z;
                    }

                    if (t > dimensions) {
                        const dx = _x - x;
                        const dy = _y - y;
                        this.lineLength[c] = this.lineLength[c - 1] + Math.sqrt(dx * dx + dy * dy);
                    }
                }
                _x = x;
                _y = y;
                _z = z;
            }

            this.length = t;
            this.dimensions = dimensions;
        }
        return this.length;
    }

    private placeCached(place: PlacePointCallback, tile: Tile, tileSize: number, applyRotation?: boolean) {
        const {collisions} = this;
        const z = 0;
        for (let i = 0, cData; i < collisions.length; i++) {
            cData = collisions[i];
            let {cx, cy} = cData;
            if (tileSize == 256) {
                cx -= tile.x % 2 * tileSize;
                cy -= tile.y % 2 * tileSize;
            }
            place(cx, cy, z, applyRotation ? this.alpha[i] : 0, 0, cData);
        }
    }

    initTile() {
        const {repeat} = this;
        for (let id in repeat) {
            repeat[id].clear();
        }
        // this.repeat.clear();
    }

    initFeature(zoom: number, tileSize: number, distanceGroup?: string) {
        // allow more precision in case tiles are getting zoomed very close (zoomlevel 20+)
        this.decimals = zoom >= 20 - Number(tileSize == 512) ? 1e2 : 1;
        // clear projected coordinate cache
        this.length = 0;
        this.collisions = null;


        const {repeat} = this;
        this.dId = distanceGroup;

        if (distanceGroup && !repeat[distanceGroup]) {
            repeat[distanceGroup] = new DistanceGroup();
        }
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
        altitude: boolean | number,
        offset?: number,
        start?: number,
        stop?: number
    ): number {
        if (strokeDasharray) {
            group.texture = this.dashes.get(strokeDasharray);
        }

        if (!group.buffer) {
            group.buffer = new LineBuffer(!altitude);
        }

        const groupBuffer = group.buffer;

        this.projectLine(coordinates, tile, tileSize);

        const {pixels, length, dimensions} = this;
        const last = length - dimensions;
        const isRing = pixels[0] == pixels[last] && pixels[1] == pixels[last + 1];

        return addLineString(
            groupBuffer.flexAttributes.a_position.data,
            groupBuffer.flexAttributes.a_normal.data,
            pixels,
            this.lineLength,
            length,
            dimensions,
            altitude,
            tileSize,
            removeTileBounds,
            strokeLinecap,
            strokeLinejoin,
            strokeWidth,
            strokeDasharray && groupBuffer.flexAttributes.a_lengthSoFar.data,
            isRing,
            offset,
            start,
            stop
        );
    }

    placeAtSegments(
        coordinates: Coordinate[],
        altitude: boolean | number,
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
        checkLineSpace: boolean,
        placeFunc: PlacePointCallback
    ) {
        this.projectLine(coordinates, tile, tileSize);

        this.getDistanceGrp()?.setMinDistance(repeat == UNDEF ? DEFAULT_MIN_REPEAT : repeat);

        this.placeAlongLine(
            tile,
            tileSize,
            collisions,
            priority,
            offsetX,
            offsetY,
            width,
            height,
            applyRotation,
            checkLineSpace,
            altitude,
            placeFunc
        );
    }


    private getAbsOffset(offset: string | number) {
        if (typeof offset == 'string') {
            if (offset.endsWith('px')) {
                return parseFloat(offset);
                // offset = parseFloat(offset) / totalLineLength;
            }
        }

        const {length, dimensions, lineLength} = this;
        const totalLineLength = lineLength[length / dimensions - 1];

        return <number>offset * totalLineLength;
    }

    placeAtPoints(
        coordinates: Coordinate[],
        altitude: boolean | number,
        tile: Tile,
        tileSize: number,
        collisions: CollisionHandler,
        priority: number,
        halfWidth: number,
        halfHeight: number,
        offsetX: number,
        offsetY: number,
        relativeStart: number = 0.0,
        relativeStop: number = 1.0,
        place: PlacePointCallback
    ) {
        this.projectLine(coordinates, tile, tileSize);

        let {length, dimensions, lineLength} = this;
        const totalLineLength = lineLength[length / dimensions - 1];
        let absStartPx = relativeStart * totalLineLength;
        let absStopPx = relativeStop * totalLineLength;

        if (this.collisions) {
            return this.placeCached(place, tile, tileSize);
        }

        const checkCollisions = collisions && [];
        const fixZ = typeof altitude == 'number' ? altitude : null;


        let lengthSoFar = 0;
        let prevLengthSoFar;

        for (let i = 0, data = this.pixels; i < length; i += dimensions) {
            let x = data[i];
            let y = data[i + 1];
            let z = altitude === true ? data[i + 2] : fixZ;
            let j = i / dimensions;

            prevLengthSoFar = lengthSoFar;
            lengthSoFar = lineLength[j + 1];

            if (absStartPx) {
                if (absStartPx < lengthSoFar) {
                    const segmentLengthPx = lengthSoFar - prevLengthSoFar;
                    const relSegmentStart = (absStartPx - prevLengthSoFar) / segmentLengthPx;
                    const i2 = i + dimensions;
                    const x2 = data[i2];
                    const y2 = data[i2 + 1];
                    const z2 = altitude === true ? data[i2 + 2] : fixZ;

                    x += (x2 - x) * relSegmentStart;
                    y += (y2 - y) * relSegmentStart;

                    if (z != null) {
                        z += (z2 - z) * relSegmentStart;
                    }

                    if (absStartPx == absStopPx) {
                        // just a single point...so we can stop after point has been placed.
                        length = null;
                        absStopPx = null;
                    }
                    absStartPx = null;
                } else {
                    continue;
                }
            }


            if (absStopPx) {
                if (absStopPx && prevLengthSoFar > absStopPx) {
                    const segmentLengthPx = prevLengthSoFar - lineLength[j - 1];
                    const relSegmentStop = (absStopPx - prevLengthSoFar) / segmentLengthPx;
                    const i0 = i - dimensions;
                    const x0 = data[i0];
                    const y0 = data[i0 + 1];
                    const z0 = altitude === true ? data[i0 + 2] : fixZ;

                    x -= (x0 - x) * relSegmentStop;
                    y -= (y0 - y) * relSegmentStop;

                    if (z != null) {
                        z -= (z0 - z) * relSegmentStop;
                    }
                    // stop after point has been placed...
                    length = null;
                }
            }

            let collisionData;

            if (x >= 0 && y >= 0 && x < tileSize && y < tileSize) {
                let distanceGrp;
                if (checkCollisions) {
                    distanceGrp = this.getDistanceGrp();
                    if (!distanceGrp || distanceGrp.hasSpace(x, y)) {
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
                }

                if (!checkCollisions || collisionData) {
                    place(x, y, z, 0, 0, collisionData);
                    distanceGrp?.add(x, y);
                }
            }
        }

        if (checkCollisions?.length) {
            this.collisions = checkCollisions;
        }
    }

    private placeAlongLine(
        tile: Tile,
        tileSize: number,
        collisions: CollisionHandler,
        priority: number,
        offsetX: number,
        offsetY: number,
        width: number,
        height: number,
        applyRotation: boolean,
        checkLineSpace: boolean,
        altitude: boolean | number,
        place: PlacePointCallback
    ) {
        if (this.collisions) {
            return this.placeCached(place, tile, tileSize, applyRotation);
        }

        const dim = this.dimensions;
        const checkCollisions = collisions && [];
        const vLength = this.length / dim;
        let coordinates = this.pixels;
        let prevDistance = Infinity;
        let sqWidth = Math.pow(2 * offsetX + width, 2);
        let x2;
        let y2;
        let z2;
        let dx;
        let dy;
        let cx;
        let cy;
        let cz;
        // for optimal repeat distance the first label gets placed in the middle of the linestring.
        let offset = Math.floor(vLength / 2) - 1;
        // we move to the end of the linestring..
        let dir = 1;
        let x1 = coordinates[offset * dim];
        let y1 = coordinates[offset * dim + 1];
        let z1;

        const handleAltitude = altitude == true;
        let rotY = 0;

        if (handleAltitude) {
            z1 = coordinates[offset * dim + 2];
        } else {
            cz = typeof altitude == 'number' ? altitude : null;
        }

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

            x2 = coordinates[c * dim];
            y2 = coordinates[c * dim + 1];
            z2 = coordinates[c * dim + 2];

            dx = x2 - x1;
            dy = y2 - y1;

            cx = dx * .5 + x1;
            cy = dy * .5 + y1;


            // not inside tile -> skip!
            if (cx >= 0 && cy >= 0 && cx < tileSize && cy < tileSize) {
                let sqLineWidth = checkLineSpace ? dx * dx + dy * dy : Infinity;

                if (sqLineWidth > sqWidth) {
                    if (handleAltitude) {
                        const dz = z2 - z1;
                        // const length = Math.sqrt(sqLineWidth);
                        cz = z1 + (z2 - z1) * .5;
                        // rotY = Math.atan(dz / length);
                        rotY = Math.asin(dz / Math.sqrt(dx * dx + dy * dy + dz * dz));
                        // rotY = dx ? Math.sin(dz / dx) : dy ? Math.cos(dz / dy) : 0;
                    }


                    let alpha = Math.atan2(dy, dx);
                    if (dir == -1) {
                        alpha += Math.PI;
                    }

                    let collisionData;
                    let distanceGrp;
                    if (checkCollisions) {
                        distanceGrp = this.getDistanceGrp();
                        if (!distanceGrp || distanceGrp.hasSpace(cx, cy)) {
                            let ox = offsetX;
                            let oy = offsetY;

                            if (applyRotation && alpha && (ox || oy)) {
                                const sin = Math.sin(alpha);
                                const cos = Math.cos(alpha);
                                ox = cos * offsetX - sin * offsetY;
                                oy = sin * offsetX + cos * offsetY;
                            }

                            const slopeScale = Math.sqrt(sqWidth / sqLineWidth);
                            const slope = [dx * slopeScale, dy * slopeScale];

                            collisionData = collisions.insert(cx, cy, ox, oy, width / 2, height / 2, tile, tileSize, priority, slope);

                            if (collisionData) {
                                this.alpha[checkCollisions.length] = alpha * TO_DEG;
                                checkCollisions.push(collisionData);
                            }
                        }
                    }

                    if ((!checkCollisions || collisionData)) {
                        place(cx, cy, cz, applyRotation ? alpha * TO_DEG : 0, rotY, collisionData);
                        distanceGrp?.add(cx, cy);
                    }
                }
            }

            x1 = x2;
            y1 = y2;
            z1 = z2;
        }

        if (checkCollisions?.length) {
            this.collisions = checkCollisions;
        }
    }
}


