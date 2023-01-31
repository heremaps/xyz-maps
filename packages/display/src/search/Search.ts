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

import Hit from './Hit';
import {CustomLayer, Feature, TileLayer} from '@here/xyz-maps-core';
import {Map} from '../Map';

const MAX_GRID_ZOOM = 20;
// increase to make sure points (no bbox) are in hitbox of spatial check.
// assumed default pointsize of 64x64 pixel
const DEFAULT_POINT_SEARCH_RADIUS_PIXEL = Array.from({length: 33}, (v, zoom) => {
    // 32 pixel up to zoomlevel MAX_GRID_ZOOM - 3 (zoom: 17)..
    // from then on the radius grows quadratically
    return 32 * Math.pow(2, Math.max(0, zoom - MAX_GRID_ZOOM + 3));
});


const isNumber = (o) => typeof o == 'number';

//* ******************************************************************************************

export class Search {
    private map: Map;
    private hit: Hit;

    constructor(map: Map, dpr: number) {
        this.map = map;
        this.hit = new Hit(map, dpr);
    }

    private getFeaturesInRect(
        x1: number,
        y1: number,
        x2: number,
        y2: number,
        layers: TileLayer | CustomLayer | (TileLayer | CustomLayer)[],
        skip3d: boolean
    ): {
        layer: TileLayer,
        features: Feature[]
    }[] {
        const {map, hit} = this;
        const zoomlevel = map.getZoomlevel();
        const buffer = DEFAULT_POINT_SEARCH_RADIUS_PIXEL[Math.ceil(zoomlevel)];
        const tileGridZoom = Math.min(MAX_GRID_ZOOM, zoomlevel) ^ 0;
        const results = {};
        const halfWidth = (x2 - x1) / 2;
        const halfHeight = (y2 - y1) / 2;
        let x = x1 + halfWidth;
        let y = y1 + halfHeight;
        let minLon = 180;
        let maxLon = -180;
        let minLat = 180;
        let maxLat = -180;

        // convert to worldspace
        [x1, y1] = map._unprj(x1, y1);
        [x2, y2] = map._unprj(x2, y2);

        let searchRect = [
            // map._w2g(x1 - buffer, y1 - buffer), // top-left
            // map._w2g(x2 + buffer, y2 + buffer), // bottom-right
            // map._w2g(x1 - buffer, y2 + buffer), // bottom-left
            // map._w2g(x2 + buffer, y1 - buffer) // top-right

            map._w2g(x1 - buffer, y1 - buffer), // top-left
            map._w2g(x2 + buffer, y1 - buffer), // top-right
            map._w2g(x2 + buffer, y2 + buffer), // bottom-right
            map._w2g(x1 - buffer, y2 + buffer) // bottom-left
        ];


        // window.showGeoBox&&window.showGeoBox(searchRect);

        let p = 4;
        let found = [];
        let viewbounds;
        let provider;
        let layer;
        let feature;
        let features;
        let length;
        let featureStyle;
        let dimensions;

        // take care of possible screen rotation..
        while (p--) {
            let lon = searchRect[p][0];
            let lat = searchRect[p][1];

            if (lon < minLon) {
                minLon = lon;
            }
            if (lon > maxLon) {
                maxLon = lon;
            }
            if (lat < minLat) {
                minLat = lat;
            }
            if (lat > maxLat) {
                maxLat = lat;
            }
        }

        viewbounds = [minLon, minLat, maxLon, maxLat];

        if (layers && !Array.isArray(layers)) {
            layers = [];
        }

        hit.init(x, y);


        let layerIndex = (<TileLayer[]>layers).length;

        while (layerIndex--) {
            layer = layers[layerIndex];
            provider = layer.getProvider?.(zoomlevel);
            let maxZ = 0;

            if (zoomlevel <= layer.max && zoomlevel >= layer.min && provider?.search) {
                features = provider.search(viewbounds);
                length = features.length;
                while (length--) {
                    feature = features[length];

                    if (featureStyle = layer.getStyleGroup(feature, tileGridZoom)) {
                        if (dimensions = hit.feature(halfWidth, halfHeight, feature, featureStyle, layerIndex, zoomlevel, skip3d)) {
                            let zIndex = dimensions[dimensions.length - 1];
                            let zOrdered = results[zIndex] = results[zIndex] || [];
                            let zOrderedLayer = zOrdered[layerIndex] = zOrdered[layerIndex] || [];

                            if (zIndex > maxZ) {
                                maxZ = zIndex;
                            }
                            zOrderedLayer.push(feature);
                        }
                    }
                }
            }
        }

        const prevResult = {layer: null, features: null};

        for (let z of Object.keys(results).sort((a, b) => Number(a) - Number(b))) {
            let zResults = results[z];
            for (let i = 0, zLayerResults; i < zResults.length; i++) {
                if (zLayerResults = zResults[i]) {
                    const layer = layers[i];
                    if (prevResult.layer == layer) {
                        prevResult.features = prevResult.features.concat(zLayerResults);
                    } else {
                        found.push({
                            layer: layer,
                            features: zLayerResults
                        });
                    }
                }
            }
        }

        return found;
    }

    search(
        x: number,
        y: number,
        x2: number,
        y2: number,
        layers: (TileLayer | CustomLayer)[],
        skip3d?: boolean
    ): { layer: TileLayer, features: Feature[] }[] {
        const {map} = this;
        const defaultLayers = map._layers;

        if (layers) {
            // layers need to be sorted correctly to make sure result is sorted by drawing hierarchy
            layers = layers.slice().sort((l1, l2) => {
                return Number(defaultLayers.indexOf(l1) > defaultLayers.indexOf(l2));
            });
        } else {
            layers = defaultLayers;
        }

        if (isNumber(x) && isNumber(y) && isNumber(x2) && isNumber(y2)) {
            return this.getFeaturesInRect(x, y, x2, y2, layers, skip3d);
        }
    };
}
