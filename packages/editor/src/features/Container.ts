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

import oTools from './oTools';
import InternalEditor from '../IEditor';
import {TileLayer} from '@here/xyz-maps-core';
import {Feature} from './feature/Feature';

let UNDEF;

/**
 *  A FeatureContainer is a array-like collection of Features.
 *  It enables editing operations to be carried out for all features of the FeatureContainer at the same time.
 *  @deprecated
 */
export interface FeatureContainer {
    /**
     *  The type of the container is 'CONTAINER'
     */
    type: 'CONTAINER';

    /**
     *  The number of features in the container
     */
    length: number;

    /**
     *  Add the given feature(s) to the container.
     *
     *  @param feature - The feature(s) to add to the end of the container.
     *  @param layer - layer the feature(s) should be added.
     *
     *  @returns length of the containing features
     *
     */
    push(feature: Feature | Feature[], layer?: TileLayer): number;

    /**
     * Executes a provided function once per container feature
     *
     * @param fnc - function to be called for the objects in container
     */
    forEach(fnc: (feature: Feature, index: number) => void);

    /**
     * Receive all Features of the Container as a native Array
     */
    toArray(): Feature[];

    /**
     * Highlights all features in the container
     */
    highlight();

    /**
     * Removes all features of the container from the map.
     */
    remove();

    /**
     * Enable the Transform Utility to allow easy geometry transformations (move/scale/rotate) of all the feature of the container by mouse/touch interaction.
     */
    transform();

    /**
     * Unhighlight all features of the container
     */
    unhighlight()

    /**
     * Pops out the last feature that has been added to the container
     *
     * @returns the last added Feature
     */
    pop(): Feature;
}


export class Container implements FeatureContainer {
    private _e: InternalEditor;

    readonly 'type' = 'CONTAINER';

    length = 0;

    constructor(iEditor: InternalEditor) {
        this._e = iEditor;
    }

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

    forEach(f, c?) {
        for (let i = 0; i < this.length; i++) {
            f.call(c, this[i], i);
        }
    }

    toArray() {
        const a = [];

        for (let i = 0; i < this.length; i++) {
            a[a.length] = this[i];
        }

        return a;
    }

    highlight() {
        const container = this;
        let len = container.length;
        let obj;

        while (obj = container[--len]) {
            oTools.highlight(obj);
        }
    };

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

    transform() {
        // var features = new InternalContainer( container );

        const container = this;

        if (container.length) {
            container._e.transformer.show(container.toArray());
        }
    };

    unhighlight() {
        const container = this;
        let len = container.length;
        let obj;

        while (obj = container[--len]) {
            oTools.deHighlight(obj);
        }
    };

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
