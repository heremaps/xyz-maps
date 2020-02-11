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

import {JSUtils} from '@here/xyz-maps-common';
import {features} from '@here/xyz-maps-core';
import ClickDraw from './ClickDraw';
import InternalEditor from '../../IEditor';

type FeatureShapeClass = 'LINE_SHAPE' | 'NAVLINK_SHAPE' | 'AREA_SHAPE';

/**
 *  The interface represents the link shape point object in drawing manager.
 *
 *  @class
 *  @public
 *  @expose
 *
 *  @name here.xyz.maps.editor.Editor.drawingBoard.Shape
 */
class DrawingShape extends features.Feature {
    properties: { [name: string]: any };

    class: FeatureShapeClass;

    private _b: ClickDraw;
    private __: {};

    constructor(board: ClickDraw, iEdit: InternalEditor, index: number, pos: [number, number], featureClass: 'LINE' | 'NAVLINK' | 'AREA') {
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

        shp.properties[featureClass] = {
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

        /**
         *  the feature class of the drawing shape point, either LINE_SHAPE, NAVLINK_SHAPE or AREA_SHAPE
         *
         *  @tyoe {String}
         *  @readonly
         *  @public
         *  @expose
         *  @name here.xyz.maps.editor.Editor.drawingBoard.Shape#class
         */
        shp.class = <FeatureShapeClass>(featureClass + '_SHAPE');
    }

    /**
     *  Removes this shape point..
     *
     *  @public
     *  @expose
     *
     *  @function
     *  @name here.xyz.maps.editor.Editor.drawingBoard.Shape#remove
     */
    remove() {
        const shp = this;
        shp.__ = null;
        shp._b.removeShape(shp.properties.index);
    };

    /**
     *  Returns number of segments of this link, if this is an area shape, return the segments number of its boarder.
     *
     *  @public
     *  @expose
     *  @return {Number}
     *      the total segments of this Link or Area
     *
     *  @function
     *  @name here.xyz.maps.editor.Editor.drawingBoard.Shape#getLength
     */
    getLength() {
        return this._b.getLength();
    }

    /**
     *  Returns the index of the shape point( count from 0 to length )
     *
     *  @public
     *  @expose
     *  @return {Number}
     *      the index of the shape
     *
     *  @function
     *  @name here.xyz.maps.editor.Editor.drawingBoard.Shape#getIndex
     */
    getIndex() {
        return this.properties.index;
    };
}

export default DrawingShape;
