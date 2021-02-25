/*
 * Copyright (C) 2019-2021 HERE Europe B.V.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
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

import {JSUtils} from '@here/xyz-maps-common';
import {Feature} from '@here/xyz-maps-core';
import ClickDraw from './ClickDraw';
import InternalEditor from '../../IEditor';

type FeatureShapeClass = 'LINE_SHAPE' | 'NAVLINK_SHAPE' | 'AREA_SHAPE';

/**
 * The DrawingShape represents a coordinate (shape-point) of the geometry that's drawn in the current drawing operation of the DrawingBoard utility.
 * {@link editor.DrawingBoard}
 */
class DrawingShape extends Feature {
    properties: { [name: string]: any };

    /**
     * the feature class of the drawing shape point, either LINE_SHAPE, NAVLINK_SHAPE or AREA_SHAPE
     */
    readonly class: FeatureShapeClass;

    private _b: ClickDraw;
    private __: {};

    constructor(board: ClickDraw, iEdit: InternalEditor, index: number, pos: [number, number], featureClass: 'Line' | 'Navlink' | 'Area') {
        super({
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: pos
            },
            properties: {
                '@ns:com:here:editor': {},
                'index': index,
                'isMoved': false
            }
        }, board.overlay.getProvider());

        const feature = board.getFeature().geojson;
        const shp = this;

        let _featureClass = featureClass.toUpperCase();

        shp.properties[_featureClass] = {
            'properties': JSUtils.extend(true, {}, feature.properties),
            'style': iEdit.getStyle(feature)
        };

        shp._b = board;

        shp.__ = {

            pointerdown: function() {
                this.properties.isMoved = false;

                this.properties.p = iEdit.display.geoToPixel.apply(
                    iEdit.display, this.geometry.coordinates
                );
            },

            pressmove: function(ev, dx, dy, ax, ay) {
                const shp = this;
                const start = this.properties.p;
                const geo = iEdit.map.getGeoCoord(start.x + dx, start.y + dy);

                board.getFeature().update(this.properties.index, geo);

                shp._provider.setFeatureCoordinates(shp, geo.slice());

                shp.isMoved = true;
            },

            pointerup: function(ev) {
                if (!this.properties.isMoved) {
                    iEdit.listeners.trigger(ev, this);
                }
            }
        };

        this.class = <FeatureShapeClass>(_featureClass + '_SHAPE');
    }

    /**
     * Removes the shape point from the geometry of the current drawing operation.
     */
    remove() {
        const shp = this;
        shp.__ = null;
        shp._b.removeShape(shp.properties.index);
    };

    /**
     * Get the total number of coordinates / shape-points of the currently drawn feature.
     *
     * @returns Number of coordinates
     */
    getLength(): number {
        return this._b.getLength();
    }

    /**
     * Returns the index of the shape point in the coordinate array of the currently drawn feature.
     *
     * @returns the index position in the coordinate array.
     */
    getIndex() {
        return this.properties.index;
    };
}

export {DrawingShape};
