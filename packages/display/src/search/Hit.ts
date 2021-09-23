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

import {getMaxZoom, getPixelSize, getLineWidth, StyleGroup, getValue} from '../displays/styleTools';
import {Map} from '../Map';
import {Feature} from '@here/xyz-maps-core';
import {intersectBBox} from '../geometry';

type Point = [number, number, number?];
type Coordinates = Point | Point[] | Point[][] | Point[][][];

const pointToLineDistanceSq = (x: number, y: number, x1: number, y1: number, x2: number, y2: number): number => {
    const C = x2 - x1;
    const D = y2 - y1;
    const lenSq = C * C + D * D;
    let param = -1;
    let xx;
    let yy;

    if (lenSq != 0) { // in case of 0 length line
        const A = x - x1;
        const B = y - y1;
        const dot = A * C + B * D;
        param = dot / lenSq;
    }

    if (param < 0) {
        xx = x1;
        yy = y1;
    } else if (param > 1) {
        xx = x2;
        yy = y2;
    } else {
        xx = x1 + param * C;
        yy = y1 + param * D;
    }

    const dx = x - xx;
    const dy = y - yy;

    return dx * dx + dy * dy;
};

const pointInPolygon = (x: number, y: number, poly: Point[]): boolean => {
    // ray-casting algorithm based on
    // http://www.ecse.rpi.edu/Homepages/wrf/Research/Short_Notes/pnpoly.html
    let inside = false;

    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const xi = poly[i][0];
        const yi = poly[i][1];
        const xj = poly[j][0];
        const yj = poly[j][1];

        if (((yi > y) != (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
            inside = !inside;
        }
    }
    return inside;
};

const intersectLineLine = (g1p1: Point, g1p2: Point, g2p1: Point, g2p2: Point): boolean => {
    const uB = (g2p2[1] - g2p1[1]) * (g1p2[0] - g1p1[0]) - (g2p2[0] - g2p1[0]) * (g1p2[1] - g1p1[1]);

    if (uB != 0) {
        const uaT = (g2p2[0] - g2p1[0]) * (g1p1[1] - g2p1[1]) - (g2p2[1] - g2p1[1]) * (g1p1[0] - g2p1[0]);
        const ubT = (g1p2[0] - g1p1[0]) * (g1p1[1] - g2p1[1]) - (g1p2[1] - g1p1[1]) * (g1p1[0] - g2p1[0]);
        const ua = uaT / uB;
        const ub = ubT / uB;

        return 0 <= ua && ua <= 1 && 0 <= ub && ub <= 1;
    }
};

class Hit {
    private map: Map;
    private dpr: number;

    constructor(map, dpr: number) {
        this.map = map;
        this.dpr = dpr;
    }

    private pointInPolygon(x: number, y: number, coordinates: Point[][]): boolean {
        for (let p = 0; p < coordinates.length; p++) {
            if (pointInPolygon(x, y, coordinates[p]) != !p) {
                // point must be located inside exterior..
                // ..and outside of all interiors
                return false;
            }
        }
        return true;
    }

    private pointInBox(points: Point[], minLon: number, maxLon: number, minLat: number, maxLat: number): boolean {
        for (let [x, y] of points) {
            const isPointInBox = x >= minLon && x <= maxLon && y >= minLat && y <= maxLat;
            if (isPointInBox) {
                return true;
            }
        }
    }

    private linesIntersectBox(lines: Point[], minLon: number, maxLon: number, minLat: number, maxLat: number): boolean {
        const box: Point[] = [
            [minLon, maxLat],
            [maxLon, maxLat],
            [maxLon, minLat],
            [minLon, minLat],
            [minLon, maxLat]
        ];

        for (let i = 0, len = lines.length - 1; i < len; i++) {
            for (let j = 0; j < box.length - 1; j++) {
                if (intersectLineLine(lines[i], lines[i + 1], box[j], box[j + 1])) {
                    return true;
                }
            }
        }
    }


    private geometry(
        x: number,
        y: number,
        halfWidth: number,
        halfHeight: number,
        coordinates: Coordinates,
        geoType: string,
        featureStyle: StyleGroup,
        layerIndex: number,
        feature: Feature,
        zoomlevel: number,
        dimensions?: number[]
    ): number[] | false {
        let hit = false;
        const {dpr, map} = this;
        const isPointSearch = !halfWidth && !halfHeight;

        if (geoType == 'Point') {
            dimensions = dimensions || getPixelSize(featureStyle, feature, zoomlevel, dpr, layerIndex);

            if (dimensions) {
                // coordinates = feature.getProvider().decCoord( feature );
                const pixel = map.geoToPixel((<Point>coordinates)[0], (<Point>coordinates)[1]);
                const featureX1 = Math.round(pixel.x + dimensions[0]);
                const featureY1 = Math.round(pixel.y + dimensions[1]);
                const featureX2 = Math.round(pixel.x + dimensions[2]);
                const featureY2 = Math.round(pixel.y + dimensions[3]);

                hit = intersectBBox(x, x + halfWidth, y, y + halfHeight, featureX1, featureX2, featureY1, featureY2);
            }
        } else if (geoType == 'LineString') {
            dimensions = dimensions || getLineWidth(featureStyle, feature, zoomlevel, layerIndex);
            const width = dimensions[0] * .5;
            let cLen = coordinates.length;
            let minDistanceSq = Infinity;

            if (isPointSearch) {
                let p1 = map.geoToPixel(coordinates[0][0], coordinates[0][1]);
                let p2;
                let d;

                for (let c = 1; c < cLen; c++) {
                    p2 = map.geoToPixel(coordinates[c][0], coordinates[c][1]);

                    d = pointToLineDistanceSq(x, y, p1.x, p1.y, p2.x, p2.y);

                    if (d < minDistanceSq) {
                        minDistanceSq = d;
                    }
                    p1 = p2;
                }

                hit = minDistanceSq <= width * width;
            } else {
                const topLeft = map.pixelToGeo(x - halfWidth, y - halfWidth);
                const bottomRight = map.pixelToGeo(x + halfWidth, y + halfWidth);
                const minLon = topLeft.longitude;
                const maxLon = bottomRight.longitude;
                const minLat = bottomRight.latitude;
                const maxLat = topLeft.latitude;

                hit = this.pointInBox(<Point[]>coordinates, minLon, maxLon, minLat, maxLat) ||
                    this.linesIntersectBox(<Point[]>coordinates, minLon, maxLon, minLat, maxLat);

                if (!hit) {
                    return false;
                }
            }
        } else if (geoType == 'Polygon') {
            let hasLineStyle = false;
            const hasPolygonStyle = featureStyle.find((style) => {
                const type = getValue('type', style, feature, zoomlevel);
                hasLineStyle = hasLineStyle || type == 'Line';
                return type == 'Polygon';
            });

            if (!hasPolygonStyle) {
                // do hit calculation on line geometry if there a line-style but no polygon-style
                return hasLineStyle && this.geometry(
                    x, y, halfWidth, halfHeight, coordinates, 'MultiLineString', featureStyle, layerIndex, feature, zoomlevel
                );
            }

            coordinates = <Point[][]>coordinates;

            if (isPointSearch) {
                const {longitude, latitude} = map.pixelToGeo(x, y);
                hit = this.pointInPolygon(longitude, latitude, coordinates);
                if (!hit) {
                    return false;
                }
            } else {
                const topLeft = map.pixelToGeo(x - halfWidth, y - halfWidth);
                const bottomRight = map.pixelToGeo(x + halfWidth, y + halfWidth);
                const minLon = topLeft.longitude;
                const maxLon = bottomRight.longitude;
                const minLat = bottomRight.latitude;
                const maxLat = topLeft.latitude;

                for (let p = 0; p < coordinates.length; p++) {
                    hit = this.pointInBox(coordinates[p], minLon, maxLon, minLat, maxLat);
                    if (hit) break;
                }

                if (!hit) {
                    const {longitude, latitude} = map.pixelToGeo(x, y);
                    hit = this.pointInPolygon(longitude, latitude, coordinates) ||
                        this.linesIntersectBox(coordinates[0], minLon, maxLon, minLat, maxLat);
                    if (!hit) {
                        return false;
                    }
                }
            }

            dimensions = dimensions || [getMaxZoom(featureStyle, feature, zoomlevel, layerIndex)];
        } else {
            let baseType;
            let baseHit;

            if (geoType == 'MultiPolygon') {
                baseType = 'Polygon';
                dimensions = dimensions || [getMaxZoom(featureStyle, feature, zoomlevel, layerIndex)];
            } else if (geoType == 'MultiPoint') {
                baseType = 'Point';
                dimensions = dimensions || getPixelSize(featureStyle, feature, zoomlevel, dpr, layerIndex);
            } else if (geoType == 'MultiLineString') {
                baseType = 'LineString';
                dimensions = dimensions || getLineWidth(featureStyle, feature, zoomlevel, layerIndex);
            }

            if (baseType) {
                for (let p = 0, l = coordinates.length; p < l; p++) {
                    baseHit = this.geometry(
                        x, y, halfWidth, halfHeight, <Point[]>coordinates[p], baseType, featureStyle, layerIndex, feature, zoomlevel, dimensions
                    );

                    if (baseHit) {
                        hit = true;
                        break;
                    }
                }
            }
        }
        return hit && dimensions;
    };

    feature(
        x1: number,
        y1: number,
        halfWidth: number,
        halfHeight: number,
        feature: Feature,
        featureStyle: StyleGroup,
        layerIndex: number,
        zoomlevel: number
    ): number[] | false {
        return this.geometry(
            x1,
            y1,
            halfWidth,
            halfHeight,
            feature.geometry.coordinates,
            // feature.getProvider().decCoord(feature),
            feature.geometry.type,
            featureStyle,
            layerIndex,
            feature,
            zoomlevel
        );
    };
}


export default Hit;
