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

import {Listener} from '@here/xyz-maps-common';
import {EditableFeatureProvider, Feature, GeoJSONCoordinate} from '@here/xyz-maps-core';
import History from './features/History';
import {Navlink} from './features/link/Navlink';

const hookTypes = [
    'Navlink.split',
    'Navlink.disconnect',
    'Feature.remove',
    'Coordinates.update'
];

/**
 * The NavlinkSplitHook is called whenever a Navlink is devided into two new Navlinks. ('Navlink.split' operation).
 */
export type NavlinkSplitHook = (data: {
    /**
     * The Navlink that will be split.
     */
    link: Navlink,
    /**
     * The index of the coordinate in which the split takes place and the new navlinks are connected to one another.
     */
    index: number,
    /**
     * The two newly created Navlinks that are replacing the original Navlink.
     */
    children: [Navlink, Navlink],
    /**
     *
     */
    relativePosition: number // 0.0 -> 1.0
}) => void

/**
 * The NavlinkDisconnectHook is called whenever a Navlink is disconnected from an intersection ('Navlink.disconnect' operation).
 */
export type NavlinkDisconnectHook = (data: {
    /**
     * The Navlink that will be "disconnected" from the intersection
     */
    link: Navlink,
    /**
     * The index of the coordinate that will be offset to "disconnect" the Navlink from the intersection
     */
    index: number
}) => void

/**
 * The FeatureRemoveHook will be called when a feature is being removed ('Feature.remove' operation).
 */
export type FeatureRemoveHook = (data: {
    /**
     * the feature that is going to be removed
     */
    feature: Feature
}) => void;

/**
 * The CoordinatesUpdateHook will be called whenever the coordinates of a feature are added, updated or removed ('Coordinates.update' operation).
 */
export type CoordinatesUpdateHook = (data: {
    /**
     * the feature whose coordinates are updated
     */
    feature: Feature,
    /**
     * the previous coordinates before they are updated
     */
    previousCoordinates: GeoJSONCoordinate | GeoJSONCoordinate[] | GeoJSONCoordinate[][] | GeoJSONCoordinate[][][]
}) => void;


type Wrapper = (
    data: any,
    provider: EditableFeatureProvider, h: NavlinkSplitHook | NavlinkDisconnectHook | FeatureRemoveHook | CoordinatesUpdateHook
) => void;


const createWrapper = (
    hook: NavlinkSplitHook | NavlinkDisconnectHook | FeatureRemoveHook | CoordinatesUpdateHook,
    hookProvider?: EditableFeatureProvider
): Wrapper => {
    const wrapper = (data, provider) => {
        if (!hookProvider || provider == hookProvider) {
            hook(data);
        }
    };
    (<any>wrapper).h = hook;

    return wrapper;
};

const getGuid = (hook, provider) => {
    let guid = hook.__ = hook.__ || String(Math.random() * 1e9 ^ 0);
    if (provider) {
        guid += ';' + provider.id;
    }
    return guid;
};

class Hooks {
    private h: Listener;
    private history: History;
    private w: Map<String, Wrapper>;

    constructor(history: History) {
        this.h = new Listener(hookTypes);
        this.h.sync(true);
        this.history = history;
        this.w = new Map();
    }

    add(
        name: string,
        hook: NavlinkSplitHook | NavlinkDisconnectHook | FeatureRemoveHook | CoordinatesUpdateHook,
        provider?: EditableFeatureProvider
    ) {
        const guid = getGuid(hook, provider);
        let wrapper = this.w.get(guid);
        if (!wrapper) {
            this.w.set(guid, wrapper = createWrapper(hook, provider));
        }
        return this.h.add(name, wrapper);
    }

    remove(
        name: string,
        hook: NavlinkSplitHook | NavlinkDisconnectHook | FeatureRemoveHook | CoordinatesUpdateHook,
        provider?: EditableFeatureProvider
    ) {
        return this.h.remove(name, this.w.get(getGuid(hook, provider)));
    }

    get(name: string): (NavlinkSplitHook | NavlinkDisconnectHook | FeatureRemoveHook | CoordinatesUpdateHook)[] {
        return this.h.get(name).map((l) => (<any>l[0]).h);
    }

    trigger(name: string, data: object, provider: EditableFeatureProvider) {
        let history = this.history;
        let active = history.active();

        history.active(false);

        this.h.trigger(name, [data, provider]);

        history.active(active);
    }
}

export default Hooks;
