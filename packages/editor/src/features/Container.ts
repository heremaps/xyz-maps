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

import oTools from './oTools';
import InternalEditor from '../IEditor';

let UNDEF;


/**
 *  The interface for an array-like object to keep and operate several features at once.
 *
 *  @class
 *  @public
 *  @expose
 *
 *  @name here.xyz.maps.editor.features.Container
 */
class Container {
    private _e: InternalEditor;

    /**
     *  The type of the container is 'CONTAINER'
     *
     *  @public
     *  @expose
     *  @type string
     *  @name here.xyz.maps.editor.features.Container#type
     */
    readonly 'type' = 'CONTAINER';


    /**
     *  The number of features in the container
     *
     *  @public
     *  @expose
     *  @type number
     *  @name here.xyz.maps.editor.features.Container#length
     */
    length = 0;

    constructor(iEDitor: InternalEditor) {
        this._e = iEDitor;
    }

    /**
     *  Add the given features to the container.
     *
     *  @public
     *  @expose
     *  @param {here.xyz.maps.editor.features.Feature|Array.<here.xyz.maps.editor.features.Feature>} feature.
     *      The feature(s) to add to the end of the container.
     *  @param {here.xyz.maps.layers.TileLayer=} layer
     *      layer the feature(s) should be added.
     *  @function
     *  @name here.xyz.maps.editor.features.Container#push
     *  @return {number}
     *      length of the containing features
     *
     */
    push(feature, layer?) {
        const container = this;
        const idMap = {};
        let created;
        let added;

        // fallback for deprecated multi feature parameters support..
        if (layer) {
            if (layer.type == 'Feature') {
                feature = arguments;
                layer = UNDEF;
            }
        }

        if (feature.length == UNDEF) {
            feature = [feature];
        }

        const iEdit = container._e;

        for (let feat of feature) {
            if (added = iEdit.objects.add(feat, layer, idMap)) {
                feat = added;
                created = true;
            }
            container[container.length++] = feat;
        }

        if (created) {
            iEdit.objects.history.saveChanges();
        }

        return container.length;
    }

    /**
     *  Executes a provided function once per container feature
     *
     *  @public
     *  @expose
     *  @param {Function} f funtion to be called for the objects in container
     *  @param {Object} c the context of the function
     *  @function
     *  @name here.xyz.maps.editor.features.Container#forEach
     */
    forEach(f, c) {
        for (let i = 0; i < this.length; i++) {
            f.call(c, this[i], i);
        }
    }

    /**
     *  Converts to native Array
     *
     *  @public
     *  @expose
     *  @function
     *  @name here.xyz.maps.editor.features.Container#toArray
     */
    toArray() {
        const a = [];

        for (let i = 0; i < this.length; i++) {
            a[a.length] = this[i];
        }

        return a;
    }

    /**
     *  Highlights all features in the container
     *
     *  @public
     *  @expose
     *  @deprecated
     *  @function
     *  @name here.xyz.maps.editor.features.Container#highlight
     */
    highlight() {
        const container = this;
        let len = container.length;
        let obj;

        while (obj = container[--len]) {
            oTools.highlight(obj);
        }
    };


    /**
     *  Removes all features in the container
     *
     *  @public
     *  @expose
     *
     *  @function
     *  @name here.xyz.maps.editor.features.Container#remove
     */
    remove() {
        const container = this;
        const objManager = container._e.objects;
        let changed = false;
        let len = container.length;

        while (len--) {
            changed = objManager.remove(container[len], {
                animation: false,
                save: false
            }) || changed;

            delete container[len];
        }

        if (changed) {
            container.length = 0;
            objManager.history.saveChanges();
        }
    };


    /**
     *  Transform features in container
     *
     *  @public
     *  @expose
     *
     *  @function
     *  @name here.xyz.maps.editor.features.Container#transform
     */
    transform() {
        // var features = new InternalContainer( container );

        const container = this;

        if (container.length) {
            container._e.transformer.show(container.toArray());
        }
    };

    /**
     *  Unhighlights all features in the container
     *
     *  @public
     *  @expose
     *
     *  @function
     *  @name here.xyz.maps.editor.features.Container#unhighlight
     */
    unhighlight() {
        const container = this;
        let len = container.length;
        let obj;

        while (obj = container[--len]) {
            oTools.deHighlight(obj);
        }
    };

    /**
     *  Pops out the last object in the container
     *
     *  @public
     *  @expose
     *  @function
     *  @return {here.xyz.maps.editor.features.Feature} object
     *      the last object in the container
     *  @name here.xyz.maps.editor.features.Container#pop
     */
    pop() {
        const container = this;

        if (container.length) {
            const obj = container[--container.length];

            delete container[container.length];

            return obj;
        }
    };

    getBBox() {
        const container = this;
        const containerBBox = [Infinity, Infinity, -Infinity, -Infinity];
        let featureBBox;


        for (let o = 0; o < container.length; o++) {
            featureBBox = container[o].getBBox
                ? container[o].getBBox()
                : container[o].bbox;


            if (featureBBox[0] < containerBBox[0]) {
                containerBBox[0] = featureBBox[0];
            }

            if (featureBBox[1] < containerBBox[1]) {
                containerBBox[1] = featureBBox[1];
            }

            if (featureBBox[2] > containerBBox[2]) {
                containerBBox[2] = featureBBox[2];
            }

            if (featureBBox[3] > containerBBox[3]) {
                containerBBox[3] = featureBBox[3];
            }
        }

        return container.length ? containerBBox : [0, 0, 0, 0];
    }
}

export default Container;
