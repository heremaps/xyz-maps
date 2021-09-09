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

type Point = [number, number, number?];
type Coordinates = Point | Point[] | Point[][] | Point[][][];

const isPointInBox = (ax: number, ay: number, bx: number, bx2: number, by: number, by2: number): boolean => {
    return (
        ax >= bx &&
        ax <= bx2 &&
        ay >= by &&
        ay <= by2
    );
};

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


class Hit {
    private map: Map;
    private dpr: number;

    constructor(map, dpr: number) {
        this.map = map;
        this.dpr = dpr;
    }

    feature(x: number, y: number, feature: Feature, featureStyle: StyleGroup, layerIndex: number, zoomlevel: number): number[] | false {
        return this.geometry(
            x,
            y,
            feature.geometry.coordinates,
            // feature.getProvider().decCoord(feature),
            feature.geometry.type,
            featureStyle,
            layerIndex,
            feature,
            zoomlevel
        );
    };


    private geometry(
        x: number,
        y: number,
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

        if (geoType == 'Point') {
            dimensions = dimensions || getPixelSize(featureStyle, feature, zoomlevel, dpr, layerIndex);

            if (dimensions) {
                // coordinates = feature.getProvider().decCoord( feature );
                let pixel = map.geoToPixel((<Point>coordinates)[0], (<Point>coordinates)[1]);
                let x1 = Math.round(pixel.x + dimensions[0]);
                let y1 = Math.round(pixel.y + dimensions[1]);
                let x2 = Math.round(pixel.x + dimensions[2]);
                let y2 = Math.round(pixel.y + dimensions[3]);

                hit = isPointInBox(x, y, x1, x2, y1, y2);
            }
        } else if (geoType == 'LineString') {
            dimensions = dimensions || getLineWidth(featureStyle, feature, zoomlevel, layerIndex);

            let width = dimensions[0];
            let cLen = coordinates.length;
            let minDistance = Infinity;
            let p1 = map.geoToPixel(coordinates[0][0], coordinates[0][1]);
            let p2;
            let d;

            for (let c = 1; c < cLen; c++) {
                p2 = map.geoToPixel(coordinates[c][0], coordinates[c][1]);

                d = pointToLineDistanceSq(x, y, p1.x, p1.y, p2.x, p2.y);

                if (d < minDistance) {
                    minDistance = d;
                }
                p1 = p2;
            }

            hit = minDistance <= width * width * .5;
        } else if
        (geoType == 'Polygon') {
            let hasLineStyle = false;
            const hasPolygonStyle = featureStyle.find((style) => {
                const type = getValue('type', style, feature, zoomlevel);
                hasLineStyle = hasLineStyle || type == 'Line';
                return type == 'Polygon';
            });

            if (!hasPolygonStyle) {
                // do hit calculation on line geometry if there a line-style but no polygon-style
                return hasLineStyle && this.geometry(x, y, coordinates, 'MultiLineString', featureStyle, layerIndex, feature, zoomlevel);
            }

            const {longitude, latitude} = map.pixelToGeo(x, y);

            for (let p = 0; p < coordinates.length; p++) {
                if (pointInPolygon(longitude, latitude, <Point[]>coordinates[p]) != !p) {
                    // point must be located inside exterior..
                    // ..and outside of all interiors
                    return false;
                }
            }
            hit = true;
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
                        x, y, <Point[]>coordinates[p], baseType, featureStyle, layerIndex, feature, zoomlevel, dimensions
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
}


export default Hit;
