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

import FeatureEditStates from './feature/EditorProperties';
import FeatureContainer from './Container';
import {geotools} from '@here/xyz-maps-common';
import {layers, providers} from '@here/xyz-maps-core';

let UNDEF;

type Point = [number, number, number?];

const createFeature = (type, coords, props?) => {
    return {
        geometry: {
            coordinates: coords,
            type: type
        },
        type: 'Feature',
        properties: props || {}
    };
};

const modifyOpacity = (styles, opacity) => {
    for (let i = 0; i < styles.length; i++) {
        if (styles[i].opacity != UNDEF) {
            styles[i]._opacity = styles[i]._opacity || styles[i].opacity;
        }
        styles[i].opacity = opacity;
    }
    return styles;
};

const restoreOpacity = (styles) => {
    for (let i = 0; i < styles.length; i++) {
        styles[i].opacity = styles[i]._opacity == UNDEF ? 1 : styles[i]._opacity;
        delete styles[i]._opacity;
    }
    return styles;
};

const prepareStyle = (style) => {
    style = style ? style instanceof Array ? style : [style] : UNDEF;
    return style;
};

const createRect = (minLon: number, minLat: number, maxLon: number, maxLat: number): Point[][] => {
    return [[
        [minLon, minLat],
        [minLon, maxLat],
        [maxLon, maxLat],
        [maxLon, minLat],
        [minLon, minLat]
    ]];
};

class Overlay {
    layer: layers.TileLayer;

    constructor(layer: layers.TileLayer) {
        this.layer = layer;
    }

    getProvider(): providers.FeatureProvider {
        return <providers.FeatureProvider> this.layer.getProvider();
    }

    hideFeature() {
        const overlay = this;
        const layer = overlay.layer;
        let feature;

        for (let f = 0; f < arguments.length; f++) {
            feature = arguments[f];

            if (feature instanceof FeatureContainer) {
                feature = feature.toArray();
            }

            if (feature instanceof Array) {
                overlay.hideFeature.apply(overlay, feature);
            } else {
                layer.setStyleGroup(feature,
                    modifyOpacity(layer.getStyleGroup(feature), 0)
                );
            }
        }
    };

    showFeature() {
        const overlay = this;
        const layer = overlay.layer;
        let feature;

        for (let f = 0; f < arguments.length; f++) {
            feature = arguments[f];

            if (feature instanceof FeatureContainer) {
                feature = feature.toArray();
            }

            if (feature instanceof Array) {
                overlay.showFeature.apply(overlay, feature);
            } else {
                layer.setStyleGroup(feature,
                    restoreOpacity(layer.getStyleGroup(feature))
                );
            }
        }
    };

    addFeature(feature, style?) {
        feature = this.layer.addFeature(feature, prepareStyle(style));

        feature.properties['@ns:com:here:editor'] =
            feature.properties['@ns:com:here:editor'] || new FeatureEditStates();

        return feature;
    };


    addCircle(center, style, props?) {
        // style = null -> invisible for display
        return this.addFeature(
            createFeature('Point', center, props),
            style
        );
    }
    ;

    remove(feature) {
        const layer = this.layer;

        if (feature instanceof FeatureContainer) {
            for (let f = 0; f < feature.length; f++) {
                layer.removeFeature(feature[f]);
            }
        } else if (feature) {
            layer.removeFeature(feature);
        }
    }


    setFeatureCoordinates(feature, coordinates) {
        feature._provider.setFeatureCoordinates(feature, coordinates);
        // displayOverlay.setFeatureCoordinates(feature,coordinates);
    }


    getStyles(obj) {
        return this.layer.getStyleGroup(obj);
    }


    modifyRect(feature, minLon, minLat, maxLon, maxLat) {
        this.setFeatureCoordinates(feature, createRect(minLon, minLat, maxLon, maxLat));
    }


    addRect(minLon, minLat, maxLon, maxLat, style) {
        return this.addFeature(
            createFeature('Polygon', createRect(minLon, minLat, maxLon, maxLat)),
            style
        );
    }


    addPolygon(geometry, style, props) {
        return this.addFeature(
            createFeature('Polygon', [geometry], props),
            style
        );
    }


    addSquare(center, dMeter, rotDeg, style, props) {
        const movePoint = geotools.movePoint;
        rotDeg = rotDeg ^ 0;
        return this.addPolygon([
            movePoint(center, dMeter, -45 + rotDeg),
            movePoint(center, dMeter, 45 + rotDeg),
            movePoint(center, dMeter, 135 + rotDeg),
            movePoint(center, dMeter, 225 + rotDeg),
            movePoint(center, dMeter, -45 + rotDeg)
        ],
        style,
        props
        );
    }


    addPath(coordinates, style, props) {
        return this.addFeature({
            geometry: {
                coordinates: coordinates,
                type: 'LineString'
            },
            type: 'Feature',
            properties: props || {}
        }, prepareStyle(style));
    }


    addPoint(coordinates, style, props?: {}) {
        if (style instanceof Array) {

        } else {
            props = style;
            style = UNDEF;
        }

        const feature = {
            geometry: {
                coordinates: coordinates,
                type: 'Point'
            },
            type: 'Feature',
            properties: props || {}
        };

        return this.addFeature(feature, prepareStyle(style));
    }

    addImage(coordinates, style, props) {
        return this.addFeature({
            geometry: {
                coordinates: coordinates,
                type: 'Point'
            },
            type: 'Feature',
            properties: props || {}

        }, prepareStyle(style));
    }
}

export default Overlay;
