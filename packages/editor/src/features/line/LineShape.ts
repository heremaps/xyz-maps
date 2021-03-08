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

import {Feature} from '@here/xyz-maps-core';
import {Line} from './Line';
// const Feature = features.Feature;

let lineTools;
let UNDEF;

/**
 * The LineShape represents a shape-point / coordinate of a Line feature.
 * The LineShape is only existing if the corresponding Line feature is "selected" and user based geometry editing with touch/mouse interaction is activated.
 * @see {@link Line.select}
 */
class LineShape extends Feature {
    private _l: Line;

    /**
     * The feature class of a LineShape Feature is "LINE_SHAPE".
     */
    class: string;

    /** {@inheritdoc} */
    properties: {
        moved: boolean;
        index: number;
        x: number;
        y: number
    };

    /** {@inheritdoc} */
    geometry: {
        /** {@inheritdoc} */
        type: 'Point',
        /** {@inheritdoc} */
        coordinates: [number, number, number?]
    };

    // getProvider: () => any;

    constructor(line, coordinate, index, lTools) {
        lineTools = lTools;
        let style = line._e().getStyle(line);

        super({
            type: 'Feature',
            properties: {
                'index': index,
                'LINE': {
                    properties: line.prop(),
                    style: style
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
     * Get the Line feature to which the LineShape belongs.
     *
     * @returns the Line feature
     */
    getLine(): Line {
        return this._l;
    }

    /**
     *  Get the total number of coordinates of the line
     *
     *  @returns Number of coordinates
     */
    getLength() {
        return this._l.geometry.coordinates.length;
    }

    /**
     * Get the index of the shape point in the coordinates array of the respective Line feature.
     *
     * @returns The index of the shape point.
     */
    getIndex(): number {
        return this.properties.index;
    };

    /**
     * Removes the shape point from the geometry of the Line feature.
     */
    remove() {
        lineTools.removeCoord(this.getLine(), this.properties.index);
    }

    pointerdown(ev) {
        const shape = this;
        const properties = shape.properties;
        const coordinates = shape.geometry.coordinates;
        const display = ev.detail.display;

        properties.moved = false;

        const pixel = display.geoToPixel(...coordinates);

        properties.x = pixel.x;
        properties.y = pixel.y;

        lineTools.removeShapes(shape.getLine(), 'vShps', shape.class == 'LINE_VIRTUAL_SHAPE' && this);
    }

    pressmove(ev, dx, dy) {
        const shape = this;
        const display = ev.detail.display;
        const properties = this.properties;
        const geo = display.pixelToGeo(properties.x + dx, properties.y + dy);
        const lon = geo.longitude;
        const lat = geo.latitude;
        const line = shape.getLine();
        const lineCoordinates = line.coord();

        if (!properties.moved) {
            properties.moved = true;
            line._e().listeners.trigger(ev, this, 'dragStart');
        }

        shape.getProvider().setFeatureCoordinates(shape, [lon, lat]);

        lineCoordinates[properties.index][0] = lon;
        lineCoordinates[properties.index][1] = lat;

        lineTools._setCoords(line, lineCoordinates);
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
