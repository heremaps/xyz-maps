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

import {getMaxZoom, getPixelSize, getLineWidth, StyleGroup, getValue, getSizeInPixel} from '../displays/styleTools';
import {Map} from '../Map';
import {Feature} from '@here/xyz-maps-core';
import {intersectBBox, intersectLineLine} from '../geometry';

type Point = number[]; // [number, number, number?];
type Coordinates = Point | Point[] | Point[][] | Point[][][];

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

class Hit {
    private map: Map;
    private dpr: number;

    private screenX: number;
    private screenY: number;
    private worldX: number;
    private worldY: number;

    private sideOfLine: number; // right-> 1,left-> -1

    private pointToLineDistanceSq(x: number, y: number, x1: number, y1: number, x2: number, y2: number): number {
        const C = x2 - x1;
        const D = y2 - y1;
        const lenSq = C * C + D * D;
        let param = -1;
        let A;
        let B;
        let xx;
        let yy;

        if (lenSq != 0) { // in case of 0 length line
            A = x - x1;
            B = y - y1;
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

        this.sideOfLine = (C * B - A * D) < 0 ? -1 : 1;

        return dx * dx + dy * dy;
    };

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
                if (intersectLineLine(lines[i], lines[i + 1], box[j], box[j + 1], false)) {
                    return true;
                }
            }
        }
    }

    private getOffsetLineData(feature: Feature, styleGrp: StyleGroup, zoomlevel: number): { offset: number, width: number }[] {
        let offsets = [];
        let offset0;
        for (let style of styleGrp) {
            const offset = getValue('offset', style, feature, zoomlevel) || 0;
            if (offset && offsets.find((off) => off.offset == offset)) continue;
            offsets.push({
                offset,
                width: getSizeInPixel('strokeWidth', style, feature, zoomlevel, true) * .5
            });
        }
        // only check explicitly for no offset if required
        if (offsets.length && offset0) {
            offsets.push(offset0);
        }
        return offsets;
    }

    private geometry(
        halfWidth: number,
        halfHeight: number,
        coordinates: Coordinates,
        geoType: string,
        featureStyle: StyleGroup,
        layerIndex: number,
        feature: Feature,
        zoomlevel: number,
        dimensions?: number[],
        skip3d?: boolean
    ): number[] | false {
        let hit = false;
        const {dpr, map} = this;
        const isPointSearch = !halfWidth && !halfHeight;
        let x = this.screenX;
        let y = this.screenY;
        let scale = 1;

        if (geoType == 'Point') {
            dimensions = dimensions || getPixelSize(featureStyle, feature, zoomlevel, dpr, layerIndex, skip3d);

            if (dimensions) {
                // coordinates = feature.getProvider().decCoord( feature );
                let featureX = <number>coordinates[0];
                let featureY = <number>coordinates[1];
                const alignment = getValue('alignment', featureStyle[0], feature, zoomlevel);

                if (!alignment || alignment == 'viewport') {
                    // screen space
                    const pixel = map.geoToPixel(featureX, featureY);
                    featureX = pixel.x;
                    featureY = pixel.y;
                } else {
                    // world space
                    [featureX, featureY] = map._g2w(featureX, featureY);
                    x = this.worldX;
                    y = this.worldY;
                    scale = 1 / map._s;
                }

                const featureX1 = featureX + dimensions[0] * scale;
                const featureY1 = featureY + dimensions[1] * scale;
                const featureX2 = featureX + dimensions[2] * scale;
                const featureY2 = featureY + dimensions[3] * scale;

                hit = intersectBBox(x, x + halfWidth, y, y + halfHeight, featureX1, featureX2, featureY1, featureY2);
            }
        } else if (geoType == 'LineString') {
            dimensions = dimensions || getLineWidth(featureStyle, feature, zoomlevel, layerIndex, skip3d);
            let cLen = coordinates.length;
            let [lineWidth] = dimensions;
            if (lineWidth) {
                if (isPointSearch) {
                    let p1 = map.geoToPixel(coordinates[0][0], coordinates[0][1]);
                    let offsets = this.getOffsetLineData(feature, featureStyle, zoomlevel);
                    let halfWidthSq;
                    let p2;
                    let d;

                    if (!offsets.length) {
                        halfWidthSq = Math.pow(dimensions[0] * .5, 2);
                    }

                    for (let c = 1; c < cLen; c++) {
                        p2 = map.geoToPixel(coordinates[c][0], coordinates[c][1]);
                        d = this.pointToLineDistanceSq(x, y, p1.x, p1.y, p2.x, p2.y);
                        if (offsets.length) {
                            for (let o of offsets) {
                                const {offset, width} = o;
                                const innerEdge = Math.pow(offset - this.sideOfLine * width, 2);
                                if (!offset) {
                                    if (hit = d <= width * width) break;
                                } else if (d > innerEdge) {
                                    const outerEdge = Math.pow(offset + this.sideOfLine * width, 2);
                                    if (hit = d - outerEdge <= width * width) {
                                        break;
                                    }
                                }
                            }
                            if (hit) break;
                        } else if (hit = d <= halfWidthSq) break;
                        p1 = p2;
                    }
                } else {
                    const w = dimensions[0] * .5;
                    const topLeft = map.pixelToGeo(x - w, y - w);
                    const bottomRight = map.pixelToGeo(x + w, y + w);
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
            }
        } else if (geoType == 'Polygon') {
            let hasLineStyle = false;
            const hasPolygonStyle = featureStyle.find((style) => {
                const type = getValue('type', style, feature, zoomlevel);
                hasLineStyle = hasLineStyle || type == 'Line';
                return type == 'Polygon';
            });

            if (!hasPolygonStyle) {
                // do hit calculation on line geometry if there's a line-style but no polygon-style
                return hasLineStyle && this.geometry(
                    halfWidth, halfHeight, coordinates, 'MultiLineString', featureStyle, layerIndex, feature, zoomlevel, null, skip3d
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
                        halfWidth, halfHeight, <Point[]>coordinates[p], baseType, featureStyle, layerIndex, feature, zoomlevel, dimensions, skip3d
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

    init(screenX: number, screenY: number) {
        this.screenX = screenX;
        this.screenY = screenY;
        // [this.worldX, this.worldY] = this.map._display.unproject(screenX, screenY);
        [this.worldX, this.worldY] = this.map._unprj(screenX, screenY);
    }

    feature(
        halfWidth: number,
        halfHeight: number,
        feature: Feature,
        featureStyle: StyleGroup,
        layerIndex: number,
        zoomlevel: number,
        skip3d?: boolean
    ): number[] | false {
        return this.geometry(
            halfWidth,
            halfHeight,
            feature.geometry.coordinates,
            // feature.getProvider().decCoord(feature),
            feature.geometry.type,
            featureStyle,
            layerIndex,
            feature,
            zoomlevel,
            null,
            skip3d
        );
    };
}


export default Hit;
