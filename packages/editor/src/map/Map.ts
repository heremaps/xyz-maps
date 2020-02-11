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

import {geotools} from '@here/xyz-maps-common';
import {getPntOnLine} from '../geometry';
import oTools from '../features/oTools';
import Feature from '../features/feature/Feature';

// var MAX_DECIMAL_PRECISION = 1e8; // ⁓1.1mm
const MAX_DECIMAL_PRECISION = 1e9; // ⁓110microns

const TO_RAD = Math.PI / 180;
let UNDEF;

type Point = [number, number, number?];
type PixelPoint = { x: number, y: number, z?: number };
type GeoPoint = { longitude: number, latitude: number, z?: number };


class Crossing {
    point: Point;
    index: number;
    existingShape: boolean;

    constructor(x: number, y: number, index: number, foundExistingShape: boolean) {
        this.point = [x, y];
        this.index = index;
        this.existingShape = foundExistingShape;
    }
}

function rotatePoint(point: Point, origin: Point, deg: number): Point {
    const dx = point[0] - origin[0];
    const dy = point[1] - origin[1];
    const rad = deg * TO_RAD;

    const x = origin[0] + (Math.cos(rad) * dx - Math.sin(rad) * dy / Math.abs(Math.cos(origin[1] * TO_RAD)));
    const y = origin[1] + (Math.sin(rad) * dx * Math.abs(Math.cos(origin[1] * TO_RAD)) + Math.cos(rad) * dy);

    return [x, y, point[2] ^ 0];
}

// *****************************************************************************************************************
function forEachCoord(coordinates, transform) {
    if (typeof coordinates[0] == 'number') {
        return transform(coordinates);
    }

    const cpy = [];
    let l = coordinates.length;

    while (l--) {
        cpy[l] = forEachCoord(coordinates[l], transform);
    }

    return cpy;
}

// *****************************************************************************************************************

class Map {
    private display;

    constructor(display) {
        this.display = display;
    }

    distance(p1: Point, p2: Point) {
        return geotools.distance(p1, p2);
    }

    rotatePoint(point: Point, origin: Point, deg: number) {
        return this.clipGeoCoord(
            rotatePoint(point, origin, deg)
        );
    }

    movePoint(position: Point, distance: number, bearing: number, radius?: number): Point {
        return this.clipGeoCoord(
            geotools.movePoint(position, distance, bearing, radius)
        );
    }

    scaleGeometry(geometry, scale, center) {
        return forEachCoord(geometry.coordinates, (c) => this.clipGeoCoord([
            center[0] + (c[0] - center[0]) * scale[0],
            center[1] + (c[1] - center[1]) * scale[1],
            c[2] ^ 0
        ]));
    }

    rotateGeometry(geometry, rotationCenter, bearing) {
        const map = this;
        return forEachCoord(geometry.coordinates, (c) => {
            return map.rotatePoint(c, rotationCenter, bearing);
        });
    }

    getClosestPoint(A, B, P) {
        const dx = A[0] - B[0];
        const dy = A[1] - B[1];
        const det = A[1] * B[0] - A[0] * B[1];
        const dot = dx * P[0] + dy * P[1];
        const x = dot * dx + det * dy;
        const y = dot * dy - det * dx;
        const z = dx * dx + dy * dy;
        const zinv = 1 / z;

        return [x * zinv, y * zinv];
    };


    calcCrossingAt(path: Point[], pos: Point, snapTolerance: number, idx?: number, maxDistance?: number) {
        const map = this;
        let index = null;
        let minDistance = maxDistance || Infinity;
        let foundExistingShape = false;
        let foundX = null;
        let foundY = null;
        let p1;
        let iPnt;
        let distance;


        if (idx != UNDEF) {
            const result = map.calcCrossingAt(path.slice(idx, idx + 2), pos, snapTolerance, UNDEF, maxDistance);
            result.index += idx;
            return result;
        }

        // calculate index of line for new Shape to add
        for (var i = 0; i < path.length; i++) {
            p1 = path[i];

            // check if a existing pnt is in range
            distance = map.distance(p1, pos);

            if (distance <= minDistance) {
                minDistance = distance;
                foundX = p1[0];
                foundY = p1[1];
                index = i;
                foundExistingShape = true;
            }
        }


        if (minDistance > snapTolerance || !foundExistingShape) {
            for (var i = 0; i < path.length; i++) {
                // calc related segment of line for new Shape
                if (i < path.length - 1) {
                    if (iPnt = getPntOnLine(path[i], path[i + 1], pos)) {
                        distance = map.distance(iPnt, pos);

                        if (
                            distance < minDistance
                        ) {
                            minDistance = distance;
                            index = i + 1;
                            foundX = iPnt[0];
                            foundY = iPnt[1];

                            foundExistingShape = false;
                        }
                    }
                }
            }
        }

        return new Crossing(foundX, foundY, index, foundExistingShape);
    };


    translateGeo(coordinates: Point[], dx: number, dy: number) {
        const map = this;
        const display = map.display;
        return forEachCoord(coordinates, (c) => {
            const pixel = display.geoToPixel(c[0], c[1]);
            return map.getGeoCoord(
                pixel.x + dx,
                pixel.y + dy,
                c[2]
            );
        });
    }

    // map.calcBearing = (c1, c2) => {
    //     let r; let l1; let l2; let l3; let l4; let dr;
    //     r = Math.PI / 180;
    //     l1 = c1[1] * r;
    //     l2 = c2[1] * r;
    //     l3 = c1[0] * r;
    //     l4 = c2[0] * r;
    //     dr = Math.atan2(
    //         Math.cos(l1) * Math.sin(l2) - Math.sin(l1) * Math.cos(l2) * Math.cos(l4 - l3),
    //         Math.sin(l4 - l3) * Math.cos(l2)
    //     );
    //     return (dr/r+360)%360;
    // };

    pixelMove(feature: Feature, dx: number, dy: number) {
        const provider = feature.getProvider();
        const curPos = this.translateGeo(provider.decCoord(feature), dx, dy);
        const setCoords = oTools.getTool(feature, '_setCoords');

        if (setCoords) {
            setCoords(feature, curPos);
        } else {
            provider.setFeatureCoordinates(feature, curPos);
        }
    };

    clipGeoCoord(c: Point): Point {
        c[0] = Math.round(c[0] * MAX_DECIMAL_PRECISION) / MAX_DECIMAL_PRECISION;
        c[1] = Math.round(c[1] * MAX_DECIMAL_PRECISION) / MAX_DECIMAL_PRECISION;
        return c;
    };

    getGeoCoord(x: number | Point | PixelPoint | GeoPoint, y?: number, z?: number) {
        const map = this;
        const display = map.display;
        let coord;

        if (arguments.length > 1) {
            coord = display.pixelToGeo(x, y);
        } else {
            coord = x;
            if (coord.x != UNDEF && coord.y != UNDEF) {
                z = coord.z;
                coord = display.pixelToGeo(coord.x, coord.y);
            } else if (x[0] != UNDEF && x[1] != UNDEF) {
                z = coord[2];
                coord = display.pixelToGeo(coord[0], coord[1]);
            }
        }
        return map.clipGeoCoord([coord.longitude, coord.latitude, z | 0]);
    };

    getPixelCoord(lon: number | Point | PixelPoint | GeoPoint, lat?: number, z?: number) {
        const display = this.display;
        if (arguments.length == 2) {
            lon = display.geoToPixel(lon, lat);
        } else if ((<GeoPoint>lon).longitude != UNDEF && (<GeoPoint>lon).latitude != UNDEF) {
            lon = display.geoToPixel((<GeoPoint>lon).longitude, (<GeoPoint>lon).latitude);
        } else if (lon[0] != UNDEF && lon[1] != UNDEF) {
            lon = display.geoToPixel(lon[0], lon[1]);
        }
        return [(<PixelPoint>lon).x, (<PixelPoint>lon).y, (<PixelPoint>lon).z | 0];
    };

    getEventsMapXY(event/* , noCheck?: boolean*/): Point {
        const display = this.display;
        let x;
        let y;

        if (event.mapX != UNDEF) {
            x = event.mapX;
            y = event.mapY;
        } else {
            // use parent node of canvas as its parent node stays static in panning
            const offset = display.getContainer().getBoundingClientRect();
            x = event.pageX - offset.left;
            y = event.pageY - offset.top;
        }
        // check if mouse position is outside of map div
        // return !noCheck && (x < 0 || y < 0 || x > display.getWidth() || y > display.getHeight()) ? false : [x, y];
        return [x, y];
    };
}

export default Map;
