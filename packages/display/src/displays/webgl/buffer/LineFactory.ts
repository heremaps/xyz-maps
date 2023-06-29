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

import {LineBuffer} from './templates/LineBuffer';
import {addLineString, Cap, Join} from './addLineString';
import {DashAtlas} from '../DashAtlas';
import {GeoJSONCoordinate as Coordinate, Tile} from '@here/xyz-maps-core';
import {CollisionData, CollisionHandler} from '../CollisionHandler';
import {DistanceGroup} from './DistanceGroup';

const TO_DEG = 180 / Math.PI;
const DEFAULT_MIN_REPEAT = 256;
let UNDEF;

enum DIR {
    MID_TO_END = 1,
    MID_TO_START = -1
}

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
        for (let i = 0, cData: CollisionData; i < collisions.length; i++) {
            cData = collisions[i];
            let {cx, cy, cz} = cData;

            if (tileSize == 256) {
                cx -= tile.x % 2 * tileSize;
                cy -= tile.y % 2 * tileSize;
            }
            place(cx, cy, cz, applyRotation ? this.alpha[i] : 0, 0, cData);
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
        if (!group.buffer) {
            group.buffer = new LineBuffer(!altitude);
        }

        if (strokeDasharray) {
            group.buffer.addUniform('u_pattern', this.dashes.get(strokeDasharray));
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
        relativeStart: number,
        relativeStop: number,
        placeFunc: PlacePointCallback
    ) {
        this.projectLine(coordinates, tile, tileSize);

        this.getDistanceGrp()?.setMinDistance(repeat == UNDEF ? DEFAULT_MIN_REPEAT : repeat);


        if (relativeStop < relativeStart) {
            // swap
            const bak = relativeStop;
            relativeStop = relativeStart;
            relativeStart = bak;
        }


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
            relativeStart,
            relativeStop,
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
        let handleAltitude = altitude === true;
        const fixZ = typeof altitude == 'number' ? altitude : null;
        if (handleAltitude && dimensions == 2) {
            handleAltitude = null;
        }
        let lengthSoFar = 0;
        let prevLengthSoFar;

        for (let i = 0, data = this.pixels; i < length; i += dimensions) {
            let x = data[i];
            let y = data[i + 1];
            let z = handleAltitude ? data[i + 2] : fixZ;
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
                    const z2 = handleAltitude ? data[i2 + 2] : fixZ;

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
                    const z0 = handleAltitude ? data[i0 + 2] : fixZ;

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
                            x, y, z,
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
                    console.log('place', x, y, z);
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
        relativeStart: number,
        relativeStop: number,
        place: PlacePointCallback
    ) {
        if (this.collisions) {
            return this.placeCached(place, tile, tileSize, applyRotation);
        }

        let {length, dimensions, lineLength} = this;
        const totalLineLength = lineLength[length / dimensions - 1];
        let absStartPx = relativeStart * totalLineLength;
        let absStopPx = relativeStop * totalLineLength;
        const dim = this.dimensions;
        const checkCollisions = collisions && [];
        const vLength = this.length / dim;
        let coordinates = this.pixels;
        let rotY = 0;
        let sqWidth = Math.pow(2 * offsetX + width, 2);
        // for optimal repeat distance the first label gets placed in the middle of the linestring.
        let offset = Math.floor(vLength / 2) - 1;
        // we move to the end of the linestring...
        let dir = DIR.MID_TO_END;
        let skipMidToStart = false;
        let handleAltitude = altitude === true;

        const fixZ = typeof altitude == 'number' ? altitude : null;
        let cz = typeof altitude == 'number' ? altitude : null;

        if (handleAltitude && dimensions == 2) {
            handleAltitude = null;
        }

        for (let i = 1; i < vLength; i++) {
            let c = offset + dir * i;

            if (c >= vLength) {
                // from now on we move from middle to beginning of linestring
                dir = DIR.MID_TO_START;
                c = offset;
                offset = vLength - 1;
                if (skipMidToStart) break;
            }

            const c0 = c - 1;
            const prevLengthSoFar = lineLength[c0];
            const lengthSoFar = lineLength[c];

            const i1 = (c0) * dim;
            let x1 = coordinates[i1];
            let y1 = coordinates[i1 + 1];
            let z1 = handleAltitude ? coordinates[i1 + 2] : fixZ;

            const i2 = c * dim;
            let x2 = coordinates[i2];
            let y2 = coordinates[i2 + 1];
            let z2 = handleAltitude ? coordinates[i2 + 2] : fixZ;

            if (absStartPx) {
                if (absStartPx < lengthSoFar) {
                    if (absStartPx >= prevLengthSoFar) {
                        const segmentLengthPx = lengthSoFar - prevLengthSoFar;
                        const relSegmentStart = (absStartPx - prevLengthSoFar) / segmentLengthPx;

                        x1 += (x2 - x1) * relSegmentStart;
                        y1 += (y2 - y1) * relSegmentStart;
                        z1 += (z2 - z1) * relSegmentStart;

                        if (dir == DIR.MID_TO_END) {
                            // finish directional run and stop, because mid to start run is not needed.
                            skipMidToStart = true;
                        } else {
                            // range is fully handled, so we can stop after current iteration.
                            i = Infinity;
                        }
                    }
                } else {
                    continue;
                }
            }

            if (absStopPx) {
                if (absStopPx > prevLengthSoFar) {
                    if (absStopPx <= lengthSoFar) {
                        const segmentLengthPx = lengthSoFar - prevLengthSoFar;
                        const relSegmentStop = 1 - (absStopPx - prevLengthSoFar) / segmentLengthPx;

                        x2 -= (x2 - x1) * relSegmentStop;
                        y2 -= (y2 - y1) * relSegmentStop;
                        z2 -= (z2 - z1) * relSegmentStop;

                        if (dir == DIR.MID_TO_END) {
                            // we can flip direction immediately
                            i = vLength - offset - 1;
                        }
                    }
                } else {
                    if (dir == DIR.MID_TO_END) {
                        // we can flip direction immediately
                        i = vLength - offset - 1;
                    }
                    continue;
                }
            }
            const dx = x2 - x1;
            const dy = y2 - y1;
            const cx = x1 + dx * .5;
            const cy = y1 + dy * .5;

            if (
                // not inside tile -> skip!
                cx >= 0 && cy >= 0 && cx < tileSize && cy < tileSize
            ) {
                let sqLineWidth = checkLineSpace ? dx * dx + dy * dy : Infinity;
                // let sqLineWidth = checkLineSpace ? Math.abs(lineLengthSq[c] - lineLengthSq[c-dir]) : Infinity;

                if (sqLineWidth > sqWidth) {
                    if (handleAltitude) {
                        const dz = z2 - z1;
                        cz = z1 + dz * .5;
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

                            collisionData = collisions.insert(cx, cy, cz, ox, oy, width / 2, height / 2, tile, tileSize, priority, slope);

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
        }

        if (checkCollisions?.length) {
            this.collisions = checkCollisions;
        }
    }
}


