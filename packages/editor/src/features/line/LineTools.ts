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

// import EDITOR from '../../editor';
import Shape from './Shape';
import {getSegmentIndex, getPntAt} from '../../geometry';
import VirtualShape from './VirtualShape';

let UNDEF;

function getPrivate(feature, name?: string) {
    let prv = feature.__;

    if (!prv) {
        prv = feature.__ = {
            isEditable: true,
            highlight: true,
            moved: false,
            shps: [],
            vShps: []
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
    addCoord: (line, position, index, skip?: boolean) => {
        let coordinates = line.coord();

        if (index == UNDEF) {
            index = getSegmentIndex(coordinates, position);

            if (index === false) {
                return false;
            } else {
                index++;
            }
        }

        coordinates.splice(index, 0, position);
        tools._setCoords(line, coordinates);

        if (!skip) {
            // used by virtual shape.
            tools.displayShapes(line);
        }
        return index;
    },
    removeCoord: (line, index) => {
        let coordinates = line.coord();
        const length = coordinates.length;
        let removed;

        if (length > 2 && index >= 0 && index < length) {
            removed = coordinates.splice(index, 1);
            tools._setCoords(line, coordinates);
            tools.displayShapes(line);
        }
        return removed;
    },
    createShapes: (line, path, type, Shape) => {
        const shapes = getPrivate(line, type);
        const length = path.length;

        if (shapes.length) {
            tools.removeShapes(line, type);
        }

        for (let i = 0; i < length; i++) {
            shapes[i] = new Shape(line, [path[i][0], path[i][1]], i, tools);
            line._e().objects.overlay.addFeature(shapes[i]);
        }
    },

    createVShapes: (line) => {
        const path = line.geometry.coordinates;
        const vpath = [];
        for (let i = 1; i < path.length; i++) {
            vpath.push(getPntAt(path[i - 1], path[i], .5));
        }
        tools.createShapes(line, vpath, 'vShps', VirtualShape);
    },

    displayShapes: (line) => {
        if (getPrivate(line, 'isSelected')) {
            const path = line.geometry.coordinates;
            tools.createShapes(line, path, 'shps', Shape);
            tools.createVShapes(line);
        }
    },
    removeShapes: (line, type, ignore?) => {
        const shapes = getPrivate(line, type);
        shapes.forEach((shape) => {
            if (shape != ignore) {
                line._e().objects.overlay.remove(shape);
            }
        });
        shapes.length = 0;
    },


    // deHighlight: function( obj )
    deHighlight: function(obj) {
        if (getPrivate(obj, 'isSelected')) {
            triggerDisplayRefresh(obj, 'selected', false);
            tools.removeShapes(obj, 'shps');
            tools.removeShapes(obj, 'vShps');
        }
    },


    // _editable: function( obj, e )
    _editable: function(obj, e) {
        const prv = getPrivate(obj);

        if (e != UNDEF) {
            prv.isEditable = !!e;
        }

        tools.deHighlight(obj);

        return prv.isEditable;
    },

    // _select: function( obj ){
    _select: function(obj) {
        if (obj._e().objects.selection.select(obj)) {
            triggerDisplayRefresh(obj, 'selected', true);
            tools.displayShapes(obj);
        }
    },

    _setCoords: function(obj, coordinates) {
        obj._e().objects.history.origin(obj);
        obj.getProvider().setFeatureCoordinates(obj, coordinates);
    },

    markAsRemoved: function(obj) {
        obj._e().hooks.trigger('Feature.remove', {feature: obj}, obj.getProvider());
        obj.editState('removed', Date.now());

        tools.deHighlight(obj);

        obj.getProvider().removeFeature(obj);
    },

    markAsModified: function(obj, saveView?: boolean) {
        obj.editState('modified', Date.now());

        if (saveView == UNDEF || saveView) {
            obj._e().objects.history.saveChanges();
        }
        return obj;
    }
};

export default tools;
