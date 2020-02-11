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

import {getMaxZLevel, getPixelSize, getStrokeWidth, StyleGroup} from '../displays/styleTools';


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

const pointToLineDistance = (x: number, y: number, x1: number, y1: number, x2: number, y2: number): number => {
    const A = x - x1;
    const B = y - y1;
    const C = x2 - x1;
    const D = y2 - y1;
    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;
    let xx;
    let yy;
    let dx;
    let dy;

    if (lenSq != 0) { // in case of 0 length line
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

    dx = x - xx;
    dy = y - yy;

    return Math.sqrt(dx * dx + dy * dy);
};


const pointInPolygon = (x: number, y: number, poly: Point[][]): boolean => {
    // ray-casting algorithm based on
    // http://www.ecse.rpi.edu/Homepages/wrf/Research/Short_Notes/pnpoly.html

    // var x = point[0],
    //     y = point[1];

    let inside = false;
    let xi;
    let xj;
    let yi;
    let yj;

    for (
        let i = 0,
            j = poly.length - 1;

        i < poly.length;

        j = i++
    ) {
        // var pi = map.geoToPixel( poly[i][0], poly[i][1] );
        // var pj = map.geoToPixel( poly[j][0], poly[j][1] );
        // xi = pi.x;
        // yi = pi.y;
        // xj = pj.x;
        // yj = pj.y;

        xi = poly[i][0];
        yi = poly[i][1];
        xj = poly[j][0];
        yj = poly[j][1];


        if (
            ((yi > y) != (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)
        ) {
            inside = !inside;
        }
    }
    return inside;
};

//* *********************************************************************************************************************


class Hit {
    private map: any;

    constructor(map) {
        this.map = map;
    }

    feature(x: number, y: number, feature, featureStyle: StyleGroup, zoomlevel: number) {
        return this.geometry(
            x,
            y,
            feature.getProvider().decCoord(feature),
            feature.geometry.type,
            featureStyle,
            feature,
            zoomlevel
        );
    };


    geometry(
        x: number,
        y: number,
        coordinates: Coordinates,
        geoType: string,
        featureStyle: StyleGroup,
        feature,
        zoomlevel: number,
        dimensions?: number[]
    ) {
        let hit = false;
        const map = this.map;

        if (geoType == 'Point') {
            dimensions = dimensions || getPixelSize(featureStyle, feature, zoomlevel);

            if (dimensions) {
                // coordinates = feature.getProvider().decCoord( feature );

                let pixel = map.geoToPixel(coordinates[0], coordinates[1]);
                let x1 = Math.round(pixel.x + dimensions[0]);
                let y1 = Math.round(pixel.y + dimensions[1]);
                let x2 = Math.round(pixel.x + dimensions[2]);
                let y2 = Math.round(pixel.y + dimensions[3]);

                hit = isPointInBox(
                    x, y,
                    x1, x2, y1, y2
                );

                // *** DBG ONLY BEGIN ***
                // var topLeft2    = map.pixelToGeo( x1, y1 ),
                //    bottomRight2 = map.pixelToGeo( x2, y2 );
                // therects[therects.length] = editor.getOverlay().addFeature({
                //    type:'Feature',
                //    geometry:{
                //        type:'LineString',
                //        coordinates:[
                //            [topLeft2.longitude,topLeft2.latitude],
                //            [bottomRight2.longitude,topLeft2.latitude],
                //            [bottomRight2.longitude,bottomRight2.latitude],
                //            [topLeft2.longitude,bottomRight2.latitude],
                //            [topLeft2.longitude,topLeft2.latitude]
                //        ]
                //    },
                //    properties:{}
                // },[[300,{stroke: hit ? '#FF0000':'#00FF00',"strokeWidth":4}]]);
                // *** DBG ONLY END ***
            }
        } else if (geoType == 'LineString') {
            dimensions = dimensions || getStrokeWidth(featureStyle, feature, zoomlevel);

            let width = dimensions[0];
            let cLen = coordinates.length;
            let minDistance = Infinity;
            let p1 = map.geoToPixel(coordinates[0][0], coordinates[0][1]);
            let p2;
            let d;

            for (let c = 1; c < cLen; c++) {
                p2 = map.geoToPixel(coordinates[c][0], coordinates[c][1]);

                d = pointToLineDistance(x, y, p1.x, p1.y, p2.x, p2.y);

                if (d < minDistance) {
                    minDistance = d;
                }

                p1 = p2;
            }

            hit = minDistance <= width / 2;
        } else if (geoType == 'Polygon') {
            let exterior = coordinates[0];
            let pointGeo = map.pixelToGeo(x, y);

            // console.time('pointInPolygon');
            // hit = pointInPolygon( x, y, exterior, map  );
            if (hit = pointInPolygon(pointGeo.longitude, pointGeo.latitude, <Point[][]>exterior)) {
                dimensions = dimensions || [getMaxZLevel(featureStyle, feature, zoomlevel)];
            }
            // console.timeEnd('pointInPolygon');
        } else {
            let baseType;
            let baseHit;

            if (geoType == 'MultiPolygon') {
                baseType = 'Polygon';
                dimensions = [getMaxZLevel(featureStyle, feature, zoomlevel)];
            } else if (geoType == 'MultiPoint') {
                baseType = 'Point';
                dimensions = getPixelSize(featureStyle, feature, zoomlevel);
            } else if (geoType == 'MultiLineString') {
                baseType = 'LineString';
                dimensions = getStrokeWidth(featureStyle, feature, zoomlevel);
            }

            if (baseType) {
                for (let p = 0, l = coordinates.length; p < l; p++) {
                    baseHit = this.geometry(
                        x, y, <Point[]>coordinates[p], baseType, featureStyle, feature, zoomlevel, dimensions
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
