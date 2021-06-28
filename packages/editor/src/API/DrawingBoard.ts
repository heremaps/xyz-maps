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

import ClickDraw from '../tools/drawingBoards/ClickDraw';
import InternalEditor from '../IEditor';
import {global} from '@here/xyz-maps-common';
import {Area} from '../features/area/Area';
import {Line} from '../features/line/Line';
import {Navlink} from '../features/link/Navlink';

import {GeoJSONCoordinate, GeoPoint, PixelPoint, Style, TileLayer} from '@here/xyz-maps-core';
import {EditorEvent} from './EditorEvent';
import {DrawingShape} from '../tools/drawingBoards/DrawingShape';

const AREA = 'Area';
const NAVLINK = 'Navlink';

// TODO: cleanup/remove
const GLOBAL_NAMESPACE = global.here.xyz.maps.editor; // HERE_WIKI.editorNS;

/**
 *  The DrawingBoard is a tool to easily enable the user to draw the geometry for a feature by user interaction with mouse/touch "taps" on the screen.
 *  A feature based on the drawn geometry and custom properties can be created when the drawing operation is done.
 */
class DrawingBoard {
    private _b: ClickDraw; // the used drawing board
    private _a: boolean; // isActive flag
    private _e: InternalEditor;

    constructor(iEditor: InternalEditor) {
        this._e = iEditor;
        this._b = new ClickDraw(iEditor.objects.overlay, iEditor, iEditor.display);
        this._a = false;
    }

    /**
     * Add a shape-point to the feature.
     *
     * @param position - the coordinate in pixels relative to the screen that should be added to the coordinates of the feature.
     * @param Navlink - pass this parameter in case of a Navlink feature is drawn that should start on the geometry of another Navlink, to split it's geometry automatically.
     */
    addShape(position: PixelPoint | GeoPoint, navlink?: Navlink): DrawingShape {
        if (this._a) {
            return this._b.addShape(this._e.map.getGeoCoord(position), navlink);
        }
    };

    /**
     * Remove a shape-point.
     * If no index is defined, the last added shape-point will be removed.
     *
     * @param index - the index of the shape-point to be removed.
     */
    removeShape(index?: number) {
        this._a && this._b.removeShape(index);
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
     * Cancel the current drawing operation.
     */
    cancel() {
        this._b.hide();
        this._a = false;
    };


    /**
     * Set properties of the feature.
     *
     * @param properties - properties the feature will be created with.
     */
    setProperties(properties) {
        this._a && this._b.setAttributes(properties);
    };

    /**
     * @deprecated - use setProperties instead.
     */
    setAttributes(p) {
        return this.setProperties(p);
    }


    /**
     * Finish current drawing operation and create the drawn feature.
     *
     * @param properties - properties the feature will be created with.
     *
     * @returns the create Feature including the drawn geometry/coordinates
     */
    create(properties?): Line | Navlink | Area {
        if (this._a) {
            let feature = this._b.create(properties);

            if (feature) {
                this._a = false;
            }
            return feature;
        }
    };

    /**
     * Start a new drawing operation to shape/draw the geometry a feature by user interaction with mouse/touch "taps" on the screen.
     *
     * @param options - options to configure the drawing operation
     */
    start(options?: {
        /**
         * the type of feature that should be drawn.
         */
        mode?: 'Area' | 'Line' | 'Navlink', // | Area | Navlink| Line
        /**
         * for custom draw styling.
         */
        styleGroup?: Style[],
        /**
         * defines the first coordinate /the starting position.
         */
        position?: PixelPoint | GeoPoint,
        /**
         * the Navlink feature to which the drawn Navlink should connect.
         */
        connectTo?: Navlink,
        /**
         * the layer where the feature should be created in.
         */
        layer?: TileLayer,
        /**
         * event listener that's called for each shape-point that's being added by user interaction. The target of the event is the drawn shape-point {@link DrawingShape}
         */
        onShapeAdd?: (event: EditorEvent) => void,
        /**
         * function that's called for each shape-point that's being removed by user interaction. The target of the event is the drawn shape-point {@link DrawingShape}
         */
        onShapeRemove?: (event: EditorEvent) => void,
    }) {
        options = options || {};
        // options conversation to support legacy api
        const connectTo = options['connectTo'];
        let mode = options['mode'] || NAVLINK;

        if (typeof mode != 'string') {
            mode = mode === GLOBAL_NAMESPACE['features']['Area']
                ? AREA
                : NAVLINK;
        } else {
            mode = <any>(mode.charAt(0).toUpperCase() + mode.slice(1).toLowerCase());
        }

        options.mode = mode;

        options['attributes'] = options['properties'] || options['attributes'] || {};

        // by default set generalization in TouchDraw to 20 and in ClickDraw to 1
        // opt['generalization'] = opt['generalization']||1;
        if (!this._a) {
            // this._b = opt['control'] == 'FREEHAND' ? touchDraw : clickDraw;

            options.layer = options.layer || this._e.getLayerForClass(mode.toUpperCase());

            if (mode != AREA || options.layer) {
                this._e.listeners.trigger('_clearOverlay');

                this._b.show(options);
                this._a = this._b.isActive();

                if (options['position']) {
                    this.addShape(options['position'], connectTo);
                }
            }
        }

        return this._a;
    };

    /**
     * Get the active state of the drawing board.
     *
     * @returns true when active, otherwise false
     */
    isActive(): boolean {
        return this._a;
    }

    /**
     * Get the geometry of the currently drawn feature.
     */
    getGeometry(): ({
        type: 'LineString' | 'MultiPolygon' | string,
        coordinates: GeoJSONCoordinate[] | GeoJSONCoordinate[][][]
    }) {
        return this._b.createGeom();
    }

    /**
     * Set the geometry of the currently drawn feature.
     *
     * If the geometry of an area (MultiPolygon) is specified, only the first exterior is processed.
     */
    setGeometry(geomtry: {
        type: 'LineString' | 'MultiPolygon' | string,
        coordinates: GeoJSONCoordinate[] | GeoJSONCoordinate[][][]
    }) {
        this._b.setGeom(geomtry.type, geomtry.coordinates);
    }
}

export {DrawingBoard};
