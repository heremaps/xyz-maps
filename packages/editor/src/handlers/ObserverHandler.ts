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

import {Listener} from '@here/xyz-maps-common';

const supportedObservers = [
    'ready',
    // 'zoomLevel',
    'active',
    // 'currentChangeStep',
    'history.current',
    // 'totalSteps',
    'history.length',
    'changes.length'
];
const WILDCARD = '*';
const defaultValues = {
    'ready': undefined,
    'active': null
};
let UNDEF;

type Value = number | boolean | string | null;
type Observer = (key: string, value: Value, prevValue?: Value) => void;


class ObserverHandler {
    private listeners: Listener = new Listener(supportedObservers).sync(true);
    private val = {};

    constructor() {
        const val = this.val;

        let s = supportedObservers.length;
        let observable;
        let defVal;

        while (observable = supportedObservers[--s]) {
            defVal = defaultValues[observable];

            val[observable] = defVal !== UNDEF
                ? defVal
                : false;
        }
    }

    addObserver(key: string, observer: Observer, context?) {
        const that = this;
        const val = that.val;

        if (key == WILDCARD) {
            for (const p in val) {
                that.addObserver(p, observer, context);
            }
        } else {
            that.listeners.add(key, observer, context);
        }
    };

    removeObserver(key: string, observer: Observer, context?) {
        const that = this;
        const val = that.val;

        if (key == WILDCARD) {
            for (const p in val) {
                that.removeObserver(p, observer, context);
            }
        } else {
            that.listeners.remove(key, observer, context);
        }
    };

    get(key: string): Value {
        return this.val[key];
    }

    change(key: string, newValue: Value, force?: boolean) {
        const that = this;
        const curVal = that.val[key];

        if (force || (
            curVal != newValue && that.get('active'))
        ) {
            that.val[key] = newValue;
            that.listeners.trigger(key, [key, newValue, curVal]);
        }
    };
}

export default ObserverHandler;
