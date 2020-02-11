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

import polygonTools from '../../features/area/PolygonTools';

type Coordinate = [number, number, number?];

class Polygon {
    path: Coordinate[] = [];
    type = 'MultiPolygon';
    geojson;
    properties;
    overlay;

    constructor(overlay, position: Coordinate) {
        this.geojson = overlay.addFeature({
            type: 'feature',
            geometry: {
                type: 'MultiPolygon',
                coordinates: [[[
                    position,
                    [position[0] - .000001, position[1]],
                    [position[0] - .000001, position[1] - .000001],
                    position
                ]]]
            },
            properties: {}
        });

        // add dummy for being used in style classes
        // this.geojson.editState = () => ({});

        this.properties = this.geojson.properties;
        this.overlay = overlay;
    }


    update(idx?: number, geo?: Coordinate) {
        const path = this.path;
        if (geo) {
            path[idx] = geo;
        }

        if (path.length > 2) {
            const coordinates = this.createGeo(path);
            if (coordinates) {
                this.overlay.setFeatureCoordinates(this.geojson, coordinates);
            }
        }
    }

    createGeo(geo: Coordinate[]): Coordinate[][][] {
        if (geo.length > 2) {
            return [[geo.concat([geo[0]])]];
        }
    }

    removeAt(index: number) {
        this.path.splice(index, 1);
    }

    isValid(path?: Coordinate[]): boolean {
        if (path) {
            const newCoord = path[path.length - 1];
            // close LineString
            path.push(<any>path[0].slice());
            return !polygonTools.willSelfIntersect(path, newCoord, path.length - 2);
        }

        return this.path.length > 2;
    }
}


export default Polygon;
