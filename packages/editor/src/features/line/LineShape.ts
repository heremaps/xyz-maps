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

import {Feature} from '@here/xyz-maps-core';
import {Line} from './Line';
import LineTools, {Coordinate} from './LineTools';
import {dragFeatureCoordinate} from '../oTools';
import oTools from '../area/PolygonTools';
import {Navlink} from '@here/xyz-maps-editor';


let lineTools: typeof LineTools;
let UNDEF;

type DefaultBehavior = {
    dragAxis?: [number, number, number] | 'Z'
    dragPlane?: [number, number, number] | 'XY'
}

export const defaultBehavior: DefaultBehavior = {
    dragPlane: 'XY'
};

/**
 * The LineShape represents a shape-point / coordinate of a Line feature.
 * The LineShape is only existing if the corresponding Line feature is "selected" and user based geometry editing with touch/mouse interaction is activated.
 * @see {@link Line.select}
 */
class LineShape extends Feature {
    private _l: Line;

    /**
     * private data storage for internal api
     * @hidden
     * @internal
     */
    private __: {
        b?: { [behavior: string]: any };
        [privateProperty: string]: any
    };

    /**
     * The feature class of a LineShape Feature is "LINE_SHAPE".
     */
    class: string;

    /** {@inheritdoc} */
    properties: {
        lineStringIndex: number;
        moved: boolean;
        index: number;
        x: number;
        y: number;
        z: number;
        button: number;
    };

    /** {@inheritdoc} */
    geometry: {
        /** {@inheritdoc} */
        type: 'Point',
        /** {@inheritdoc} */
        coordinates: [number, number, number?]
    };

    // getProvider: () => any;

    constructor(line: Line, coordinate: number[], lineStringIndex: number, index: number, zLayer: number, lTools: typeof LineTools) {
        lineTools = lTools;
        const _editor = line._e();
        const style = _editor.getStyle(line);

        super({
            type: 'Feature',
            properties: {
                lineStringIndex,
                index,
                'LINE': {
                    properties: line.prop(),
                    style,
                    zLayer
                }
            },
            geometry: {
                type: 'Point',
                coordinates: coordinate
            }
        });

        this._l = line;
    }

    /**
     * Set the behavior options.
     * @experimental
     */
    behavior(options: {
        /**
         * The drag axis across which the LineShape is dragged upon user interaction.
         * Once "dragAxis" is set, "dragPlane" has no effect.
         * In case "dragAxis" and "dragPlane" are set, "dragPlane" is preferred.
         * In case "dragPlane" and "dragAxis" are both set, "dragPlane" is preferred.
         */
        dragAxis?: 'X' | 'Y' | 'Z' | [number, number, number]
        /**
         * The normal of the plane over which the LineShape is dragged upon user interaction.
         * Once "dragPlane" is set, "dragAxis" has no effect.
         */
        dragPlane?: 'XY' | 'XZ' | 'YZ' | [number, number, number]
    }): void;
    /**
     * Set the value of a specific behavior option.
     * @experimental
     */
    behavior(name: string, value: boolean | string | [number, number, number]): void;
    /**
     * Get the value of a specific behavior option.
     * @experimental
     */
    behavior(option: string): any;
    /**
     * Get the behavior options.
     * @experimental
     */
    behavior(): {
        /**
         * The drag axis across which the marker is dragged upon user interaction.
         */
        dragAxis?: [number, number, number] | 'X' | 'Y' | 'Z' | null
        /**
         * The normal of the plane over which the marker is dragged upon user interaction.
         */
        dragPlane?: [number, number, number] | 'XY' | 'XZ' | 'YZ' | null
    };

    behavior(options?: any, value?: boolean) {
        let behavior = oTools.private(this, 'b') || {...defaultBehavior};

        switch (arguments.length) {
        case 0:
            return behavior;
        case 1:
            if (typeof options == 'string') {
                // getter
                return behavior[options];
            }
            break;
        case 2:
            const opt = {};
            opt[options] = value;
            options = opt;
        }
        // setter
        behavior = {...behavior, ...options};

        if (options.dragPlane) {
            delete behavior.dragAxis;
        } else if (options.dragAxis) {
            delete behavior.dragPlane;
        }

        this.__.b = behavior;
    }

    /**
     * Get the Line feature to which the LineShape belongs.
     *
     * @returns the Line feature
     */
    getLine(): Line {
        return this._l;
    }

    /**
     *  Get the total number of coordinates of the LineString geometry.
     *
     *  @returns Number of coordinates
     */
    getLength() {
        return this._l.geometry.coordinates.length;
    }

    /**
     * Get the index of the shape point in the coordinates array of the respective LineString geometry.
     *
     * @returns The index of the shape point.
     */
    getIndex(): number {
        return this.properties.index;
    };

    /**
     *  Get the index of the coordinate array in the MultiLineString array of LineString coordinate arrays.
     *  For Line features with a geometry of type "LineString" the lineStringIndex is 0.
     *
     *  @returns the index of the coordinate array in the MultiLineString array of LineString coordinate arrays.
     */
    getLineStringIndex(): number {
        return this.properties.lineStringIndex;
    }

    /**
     * Removes the shape point from the geometry of the Line feature.
     */
    remove() {
        const line = this.getLine();
        lineTools.removeCoord(line, this.properties.index, this.properties.lineStringIndex);
        lineTools.markAsModified(line);
    }

    pointerdown(ev) {
        const shape = this;
        const properties = shape.properties;
        const coordinates = shape.geometry.coordinates;
        const display = ev.detail.display;
        const line = shape.getLine();

        properties.moved = false;

        const pixel = display.geoToPixel(...coordinates);

        properties.x = pixel.x;
        properties.y = pixel.y;

        properties.button = ev.button;
        properties.z = coordinates[2] || 0;

        lineTools.removeShapes(line, 'vShps', shape.class == 'LINE_VIRTUAL_SHAPE' && this);

        line._e().listeners.trigger(ev, this, 'pointerdown');
    }

    pressmove(ev, dx, dy) {
        const shape = this;
        const properties = this.properties;
        const {lineStringIndex} = properties;
        const line = shape.getLine();
        const editor = line._e();
        const coordinates = <Coordinate[]>lineTools.getCoordinates(line, lineStringIndex);
        const ignoreZ = !editor.getStyleProperty(line, 'altitude');
        const orgCoord: number[] = coordinates[properties.index];
        let coord = ignoreZ ? orgCoord.slice(0, 2) : orgCoord;

        if (!properties.moved) {
            properties.moved = true;
            editor.listeners.trigger(ev, this, 'dragStart');
        }
        coord = coordinates[properties.index] = <Coordinate>dragFeatureCoordinate(ev.mapX, ev.mapY, shape, coord, editor);

        if (ignoreZ && typeof orgCoord[2] == 'number') {
            // restore original altitude if 2d edit mode is forced.
            coord[2] = orgCoord[2];
        }
        shape.getProvider().setFeatureCoordinates(shape, coord.slice());

        lineTools._setCoords(line, coordinates, lineStringIndex);
    }

    pointerup(ev) {
        const line = this.getLine();
        const moved = this.properties.moved;

        if (moved) {
            lineTools.markAsModified(line);
        }
        lineTools.displayShapes(line);

        line._e().listeners.trigger(ev, this, moved ? 'dragStop' : UNDEF);
    }
}

LineShape.prototype.class = 'LINE_SHAPE';

export {LineShape};
