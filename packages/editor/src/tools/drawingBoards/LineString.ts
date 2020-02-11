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

type Coordinate = [number, number, number?];

type Path = Coordinate[];

class LineString {
    type = 'LineString';
    overlay;
    properties;
    geojson;
    path: Path = [];

    constructor(overlay, position: Coordinate) {
        this.geojson = overlay.addFeature({
            type: 'feature',
            geometry: {
                type: 'LineString',
                coordinates: [position, [position[0] - 0.000001, position[1]]]
            },
            properties: {}
        });

        this.properties = this.geojson.properties;

        this.overlay = overlay;
    }

    update(idx?: number, geo?: Coordinate) {
        const path = this.path;

        if (geo) {
            path[idx] = geo;
        }

        if (path.length > 1) {
            this.overlay.setFeatureCoordinates(this.geojson, this.createGeo(path));
        }
    };

    removeAt(index: number) {
        this.path.splice(index, 1);
    };

    createGeo(geo: Coordinate[]): Coordinate[] {
        if (geo.length>1) {
            return geo.slice();
        }
    }

    isValid(path?: Path): boolean {
        return !!path || this.path.length > 1;
    }
}


export default LineString;
