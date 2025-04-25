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

// import EDITOR from '../../editor';
import {LineShape} from './LineShape';
import {getSegmentIndex, getPntAt, simplifyPath} from '../../geometry';
import VirtualShape from './VirtualShape';
import {Line} from './Line';
import {GeoJSONCoordinate, webMercator} from '@here/xyz-maps-core';
import FeatureTools from '../feature/FeatureTools';
import {Feature} from '../feature/Feature';

let UNDEF;

export type Coordinate = [number, number, number?];


function getPrivate(feature: Line, name?: string): any {
    let prv = feature.__;

    if (!prv) {
        prv = feature.__ = {
            isEditable: true,
            highlight: true,
            moved: false,
            shps: [],
            vShps: [],
            selectedShapes: [],
            isGeoMod: false
        };
    }

    return name ? prv[name] : prv;
}


//* ***************************************************** PRIVATE ******************************************************

const triggerDisplayRefresh = (line, state?: string, value: boolean = false) => {
    if (state) {
        line.editState(state, value);
    }

    line._e().setStyle(line, UNDEF); // tigger style refresh
};


//* ************************************************** EVENTLISTENERS **************************************************

function onHover(e) {
    if (getPrivate(this, 'isEditable')) {
        this._e().listeners.trigger(e, this);
    }
}


const tools = {

    private: getPrivate,

    _evl: {

        pointerenter: onHover,

        pointerleave: onHover,

        pointerup: function(ev) {
            const line = this;
            const prv = getPrivate(line);

            if (prv.isEditable) {
                if (!prv.isSelected && line._e()._config['featureSelectionByDefault']) {
                    tools._select(line);
                }
                line._e().listeners.trigger(ev, line);
            }
        }
    },


    //* ************************************************** Internal only **************************************************
    addCoord: (line: Line, position: Coordinate, index: number, lineStringIndex: number): number | false => {
        let coordinates = <Coordinate[]>tools.getCoordinates(line, lineStringIndex);

        if (index == UNDEF) {
            const i = getSegmentIndex(coordinates, position);
            if (i === false) {
                return i;
            }
            index = i + 1;
        }

        coordinates.splice(index, 0, position);
        tools._setCoords(line, coordinates, lineStringIndex);
        getPrivate(line, 'selectedShapes')[lineStringIndex]?.splice(index, 0, UNDEF);

        return index;
    },
    removeCoord: (line: Line, index: number, lineStringIndex: number) => {
        let coordinates = <Coordinate[]>tools.getCoordinates(line, lineStringIndex);
        const length = coordinates.length;
        let removed;

        if (length > 2 && index >= 0 && index < length) {
            removed = coordinates.splice(index, 1);
            getPrivate(line, 'selectedShapes')[lineStringIndex]?.splice(index, 1);
            tools._setCoords(line, coordinates, lineStringIndex);
            tools.displayShapes(line);
        }
        return removed;
    },

    createShapes: (line: Line, lineStringIndex: number, path, type: string, Shape: typeof LineShape) => {
        const lineStrings = getPrivate(line, type);
        const shapes = lineStrings[lineStringIndex] = lineStrings[lineStringIndex] || [];
        const _editor = line._e();
        const zLayer = _editor.getMaxZLayer(line) - 1;
        const altitude = _editor.getStyleProperty(line, 'altitude');


        for (let i = 0; i < path.length; i++) {
            let coordinate = path[i].slice();
            if (typeof altitude == 'number') {
                coordinate[2] = altitude;
            }
            shapes[i] = new Shape(line, coordinate, lineStringIndex, i, zLayer, tools);
            _editor.objects.overlay.addFeature(shapes[i]);
        }
    },

    createVShapes: (line: Line, lineStringIndex: number = 0, lineString: GeoJSONCoordinate[]) => {
        const shapes = [];
        for (let i = 1; i < lineString.length; i++) {
            shapes.push(getPntAt(lineString[i - 1], lineString[i], .5));
        }
        tools.createShapes(line, lineStringIndex, shapes, 'vShps', VirtualShape);
    },

    displayShapes: (line: Line) => {
        if (getPrivate(line, 'isSelected')) {
            const {geometry} = line;
            let coordinates;

            if (geometry.type == 'LineString') {
                coordinates = [geometry.coordinates];
            } else {
                coordinates = geometry.coordinates;
            }

            tools.removeShapes(line, 'shps');
            tools.removeShapes(line, 'vShps');

            for (let i = 0; i < coordinates.length; i++) {
                tools.createShapes(line, i, coordinates[i], 'shps', LineShape);
                tools.createVShapes(line, i, coordinates[i]);
            }
        }
    },
    removeShapes: (line: Line, type: string, ignore?: LineShape) => {
        const shapes = getPrivate(line, type);
        shapes.forEach((shape) => {
            if (shape != ignore) {
                line._e().objects.overlay.remove(shape);
            }
        });
        shapes.length = 0;
    },

    deHighlight: function(line: Line) {
        if (getPrivate(line, 'isSelected')) {
            triggerDisplayRefresh(line, 'selected', false);
            tools.removeShapes(line, 'shps');
            tools.removeShapes(line, 'vShps');
        }
    },

    _editable: function(line: Line, editable: boolean) {
        const prv = getPrivate(line);

        if (editable != UNDEF) {
            prv.isEditable = !!editable;
        }

        tools.deHighlight(line);

        return prv.isEditable;
    },

    simplifyGeometry(line: Feature, tolerance: number | string) {
        if (typeof tolerance == 'string') {
            const isMeters = tolerance.endsWith('m');
            tolerance = parseFloat(tolerance);
            if (isMeters) {
                const [minLon, minLat, maxLon, maxLat] = line.getBBox();
                const centerLat = minLat - (maxLat - minLat) / 2;
                const pixelToMeter = webMercator.earthCircumference(centerLat) / webMercator.mapSizePixel(256, line._e().display.getZoomlevel());
                tolerance *= pixelToMeter;
            }
        }

        const {type} = line.geometry;
        const isLineString = type == 'LineString';
        const coordinates = line.coord();
        const multiLineString: (GeoJSONCoordinate)[][] = isLineString
            ? [coordinates as GeoJSONCoordinate[]]
            : coordinates as GeoJSONCoordinate[][];

        for (let i = 0; i < multiLineString.length; i++) {
            multiLineString[i] = simplifyPath(multiLineString[i] as GeoJSONCoordinate[], tolerance);
        }

        line.coord(isLineString
            ? multiLineString[0] as [number, number, number?][]
            : multiLineString as [number, number, number?][][]
        );
    },

    _select: function(line: Line) {
        if (line._e().objects.selection.select(line)) {
            getPrivate(line, 'selectedShapes').length = 0;
            triggerDisplayRefresh(line, 'selected', true);
            tools.displayShapes(line);
        }
    },

    isMultiLineString(line: Line): boolean {
        return line.geometry.type == 'MultiLineString';
    },

    getCoordinates(line: Line, index?: number): Coordinate[] | Coordinate[][] {
        let coordinates = <Coordinate[][]>line.coord();
        if (!tools.isMultiLineString(line)) {
            coordinates = [<any>coordinates];
        }
        return index >= 0 ? coordinates[index] : coordinates;
    },

    _setCoords: function(line: Line, lineString: Coordinate[] | Coordinate[][], lineStringIndex?: number) {
        line._e().objects.history.origin(line);

        getPrivate(line).isGeoMod = true;

        let coordinates: Coordinate[] | Coordinate[][] = lineString;

        if (tools.isMultiLineString(line)) {
            if (lineStringIndex >= 0) {
                coordinates = line.coord();
                coordinates[lineStringIndex] = <Coordinate[]>lineString;
            }
        } else {
            if (typeof coordinates[0][0] != 'number') {
                coordinates = <Coordinate[]>coordinates[0];
            }
        }
        line.getProvider().setFeatureCoordinates(line, coordinates);
    },

    markAsRemoved: function(line: Line) {
        line._e().hooks.trigger('Feature.remove', {feature: line}, line.getProvider());
        line.editState('removed', Date.now());

        tools.deHighlight(line);

        line.getProvider().removeFeature(line);
    },

    markAsModified: function(line: Line, saveView?: boolean) {
        return FeatureTools.markAsModified(line, getPrivate(line), saveView);
    }
};

export default tools;
