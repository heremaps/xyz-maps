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
import {CollisionData, CollisionHandler} from '../CollisionHandler';
import {DistanceGroup} from './DistanceGroup';
import {FlexAttribute} from './templates/TemplateBuffer';
import {GraphicsDevice} from '../device/GraphicsDevice';
import {GeoJSONCoordinate as Coordinate, Tile} from '@here/xyz-maps-core';
import {Expression} from '@here/xyz-maps-common';

const TO_DEG = 180 / Math.PI;
const DEFAULT_MIN_REPEAT = 256;
const LINE_STRAIGHTNESS_TOLERANCE_SQ = 2 * 2;
let UNDEF;

export const isDynamicProperty = (prop: any) => prop instanceof Expression;

enum DIR {
    MID_TO_END = 1,
    MID_TO_START = -1
}

type PlacePointCallback = (
    x: number,
    y: number,
    z: number | null,
    rotZDeg: number,
    rotYRad: number,
    collisionData?: CollisionData
) => void;


export class LineFactory {
    private dashes: DashAtlas;
    private readonly pixels: Float32Array; // projected coordinate cache
    private length: number = 0; // length of coordinate cache
    private readonly dimensions: number; // dimensions of coordinate cache
    private readonly rotationZ: Float32Array; // cached horizontal rotation (degrees)
    private readonly rotationY: Float32Array; // cached vertical rotation (radians)
    private readonly lineLength: Float32Array; // length from start to segment at index of the current projected line
    private collisions: CollisionData[];

    private coordinateScale: number; // increase precision for tile scaling

    private readonly repeat: { [groupId: string]: DistanceGroup };
    private dId: string;

    constructor(device: GraphicsDevice) {
        this.dashes = new DashAtlas(device);

        // reused pixel coordinate cache
        this.pixels = new Float32Array(262144); // -> 1MB;
        this.rotationZ = new Float32Array(131072);
        this.rotationY = new Float32Array(131072);
        this.lineLength = new Float32Array(131072);
        this.repeat = {};
    }

    private getDistanceGrp() {
        return this.repeat[this.dId];
    }

    private projectLine(coordinates: Coordinate[], tile: Tile, tileSize: number): number {
        const {pixels, coordinateScale} = this;
        const minPointDistance = 1 / coordinateScale;
        const minPointDistanceSq = minPointDistance * minPointDistance;

        if (!this.length) {
            let t = 0;
            let pointCount = 0;
            let lineLength = 0;
            let lastX;
            let lastY;
            let lastZ;
            const dimensions = typeof coordinates[0][2] == 'number' ? 3 : 2;
            const hasZ = dimensions === 3;

            for (let c = 0, length = coordinates.length, x, y, z; c < length; c++) {
                let coord = coordinates[c];
                x = tile.lon2x(coord[0], tileSize);
                y = tile.lat2y(coord[1], tileSize);
                z = coord[2] || 0;

                const dx = pointCount ? lastX - x : 0;
                const dy = pointCount ? lastY - y : 0;
                const distanceSq = dx * dx + dy * dy;

                if (!pointCount || distanceSq >= minPointDistanceSq || (hasZ && z != lastZ)) {
                    pixels[t++] = x;
                    pixels[t++] = y;

                    if (hasZ) {
                        pixels[t++] = z;
                    }

                    if (pointCount) {
                        lineLength += Math.sqrt(distanceSq);
                    }

                    this.lineLength[pointCount++] = lineLength;
                    lastX = x;
                    lastY = y;
                    lastZ = z;
                }
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
            const worldSize = tileSize << tile.z;
            const tilesPerAxis = 1 << tile.z;

            cx = (cx - tile.x / tilesPerAxis) * worldSize;
            cy = (cy - tile.y / tilesPerAxis) * worldSize;

            place(
                cx,
                cy,
                typeof cz == 'number' ? cz : null,
                applyRotation ? this.rotationZ[i] : 0,
                applyRotation ? this.rotationY[i] : 0,
                cData
            );
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
        this.coordinateScale = zoom >= 20 - Number(tileSize == 512) ? 100 : 1;
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
        strokeDasharray: { pattern: number[], units: string[] },
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

        const groupBuffer: LineBuffer = group.buffer;

        if (strokeDasharray) {
            if (!isDynamicProperty(strokeDasharray.pattern) &&
                // Multiple dash/gap combinations are exclusively supported within the same unit due to the utilization of a pattern texture.
                strokeDasharray.pattern.length > 2 &&
                // has mixed units
                !strokeDasharray.units.some((e) => e != strokeDasharray.units[0])
            ) {
                const dashPatternTexture = this.dashes.get(strokeDasharray.pattern);
                groupBuffer.addUniform('u_dashPattern', dashPatternTexture.texture);
                groupBuffer.addUniform('u_dashSize', [dashPatternTexture.texture.width / dashPatternTexture.scale, 0]);
            } else {
                groupBuffer.addUniform('u_dashSize', strokeDasharray.pattern);
            }
        }

        this.projectLine(coordinates, tile, tileSize);

        const {pixels, length, dimensions} = this;
        const last = length - dimensions;
        const isRing = pixels[0] == pixels[last] && pixels[1] == pixels[last + 1];

        return addLineString(
            (groupBuffer.flexAttributes.a_position as FlexAttribute).data,
            (groupBuffer.flexAttributes.a_normal as FlexAttribute).data,
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
            strokeDasharray && (groupBuffer.flexAttributes.a_lengthSoFar as FlexAttribute).data,
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
        isMapAligned: boolean,
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
            isMapAligned,
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
        isMapAligned: boolean,
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
        const handleAltitude = altitude === true && dimensions == 3;
        // const fixZ = typeof altitude == 'number' ? altitude : null;
        const isAltitudeAbs = typeof altitude == 'number';
        const fixZ = isAltitudeAbs ? altitude : null;

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

                    x += (x2 - x) * relSegmentStart;
                    y += (y2 - y) * relSegmentStart;

                    if (z != null) {
                        const z2 = handleAltitude ? data[i2 + 2] : fixZ;
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
                            priority,
                            isMapAligned
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
        isMapAligned: boolean,
        checkLineSpace: boolean,
        altitude: boolean | number | 'terrain',
        relativeStart: number,
        relativeStop: number,
        place: PlacePointCallback
    ) {
        if (this.collisions) {
            return this.placeCached(place, tile, tileSize, isMapAligned);
        }

        let {length, dimensions, lineLength} = this;
        const totalLineLength = lineLength[length / dimensions - 1];
        // segment extension is limited to the complete line because from/to points
        // are interpolated and are not cached vertices.
        let fullLine = true;
        // number of consecutive short segments skipped while extending the current segment.
        let segmentSkipCount = 0;
        let referenceX = 0;
        let referenceY = 0;
        let referenceDx = 0;
        let referenceDy = 0;
        let referenceSqLineWidth = 0;
        let absStartPx = 0;
        let absStopPx = Infinity;

        if (relativeStart > 0) {
            absStartPx = relativeStart * totalLineLength;
            fullLine = false;
        }
        if (relativeStop < 1) {
            absStopPx = relativeStop * totalLineLength;
            fullLine = false;
        }
        const dim = this.dimensions;
        const checkCollisions = collisions && [];
        const vLength = this.length / dim;
        let coordinates = this.pixels;
        let rotY = 0;
        let sqWidth = Math.pow(2 * offsetX + width, 2);
        // for optimal repeat distance the first label gets placed in the middle of the linestring.
        let offset = Math.floor(vLength / 2) - 1;
        // let offset = 0;
        // we move to the end of the linestring...
        let dir = DIR.MID_TO_END;
        let skipMidToStart = false;
        const handleAltitude = altitude === true && dimensions == 3;


        const isAltitudeAbs = typeof altitude == 'number';
        const fixZ = isAltitudeAbs ? altitude : null;
        let cz = fixZ;

        for (let i = 1; i < vLength; i++) {
            if (offset + i === vLength) {
                if (skipMidToStart) break;
                // from now on we move from middle to beginning of linestring
                dir = DIR.MID_TO_START;
                offset = vLength;
                segmentSkipCount = 0;
            }
            let c = (offset + dir * i) % vLength;
            const c0 = c - 1;
            const prevLengthSoFar = lineLength[c0];
            const lengthSoFar = lineLength[c];

            // segmentSkipCount stays within the current directional run, keeping the extended indices in bounds.
            const i1 = (dir == DIR.MID_TO_END ? c0 - segmentSkipCount : c0) * dim;
            let x1 = coordinates[i1];
            let y1 = coordinates[i1 + 1];
            let z1 = handleAltitude ? coordinates[i1 + 2] : fixZ;

            const i2 = (dir == DIR.MID_TO_START ? c + segmentSkipCount : c) * dim;
            let x2 = coordinates[i2];
            let y2 = coordinates[i2 + 1];
            let z2 = handleAltitude ? coordinates[i2 + 2] : fixZ;

            if (absStartPx > 0) {
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

            if (absStopPx !== Infinity) {
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

            let canExtendSegment = false;
            if (
                // not inside tile -> skip!
                cx >= 0 && cy >= 0 && cx < tileSize && cy < tileSize
            ) {
                const sqLineWidth = checkLineSpace ? dx * dx + dy * dy : Infinity;
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
                    let collisionData;
                    let distanceGrp;
                    if (checkCollisions) {
                        distanceGrp = this.getDistanceGrp();
                        if (!distanceGrp || distanceGrp.hasSpace(cx, cy)) {
                            let ox = offsetX;
                            let oy = offsetY;

                            if (isMapAligned && alpha && (ox || oy)) {
                                const sin = Math.sin(alpha);
                                const cos = Math.cos(alpha);
                                ox = cos * offsetX - sin * offsetY;
                                oy = sin * offsetX + cos * offsetY;
                            }

                            let slope = null;
                            if (isMapAligned) {
                                const slopeScale = Math.sqrt(sqWidth / sqLineWidth);
                                slope = [dx * slopeScale, dy * slopeScale];
                            }

                            collisionData = collisions.insert(
                                cx,
                                cy,
                                altitude === 'terrain' ? altitude : cz,
                                ox,
                                oy,
                                width / 2,
                                height / 2,
                                priority,
                                isMapAligned,
                                slope
                            );

                            if (collisionData) {
                                const collisionIndex = checkCollisions.length;
                                this.rotationZ[collisionIndex] = alpha * TO_DEG;
                                this.rotationY[collisionIndex] = rotY;
                                checkCollisions.push(collisionData);
                            }
                        }
                    }

                    if ((!checkCollisions || collisionData)) {
                        place(cx, cy, cz, isMapAligned ? alpha * TO_DEG : 0, rotY, collisionData);
                        distanceGrp?.add(cx, cy);
                    }
                } else if (checkLineSpace && fullLine) {
                    if (!segmentSkipCount) {
                        referenceX = x1;
                        referenceY = y1;
                        referenceDx = dx;
                        referenceDy = dy;
                        referenceSqLineWidth = sqLineWidth;
                    }

                    const nextC = c + dir;
                    const nextC0 = nextC - 1;

                    if (nextC0 >= 0 && nextC < vLength) {
                        const nextI1 = nextC0 * dim;
                        const nextI2 = nextC * dim;
                        const nextDx = coordinates[nextI2] - coordinates[nextI1];
                        const nextDy = coordinates[nextI2 + 1] - coordinates[nextI1 + 1];
                        const pointI = dir == DIR.MID_TO_END ? nextI2 : nextI1;
                        const pointX = coordinates[pointI];
                        const pointY = coordinates[pointI + 1];
                        const pointDx = pointX - referenceX;
                        const pointDy = pointY - referenceY;
                        const cross = referenceDx * pointDy - referenceDy * pointDx;
                        const dot = referenceDx * nextDx + referenceDy * nextDy;

                        canExtendSegment = dot > 0 &&
                            cross * cross <= referenceSqLineWidth * LINE_STRAIGHTNESS_TOLERANCE_SQ;
                    }
                }
            }

            segmentSkipCount = canExtendSegment ? segmentSkipCount + 1 : 0;
        }

        if (checkCollisions?.length) {
            this.collisions = checkCollisions;
        }
    }
}
