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
import {providers} from '@here/xyz-maps-core';
import History from './features/History';

type EditableProvider = providers.EditableProvider;

const hookTypes = [
    'Navlink.split',
    'Navlink.disconnect',
    'Feature.remove'
];

type Hook = (data: any) => void;

type Wrapper = (data: any, provider: EditableProvider, h: Hook) => void;


const createWrapper = (hook: Hook, hookProvider?: EditableProvider): Wrapper => {
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

    add(name: string, hook: Hook, provider?: EditableProvider) {
        const guid = getGuid(hook, provider);
        let wrapper = this.w.get(guid);
        if (!wrapper) {
            this.w.set(guid, wrapper = createWrapper(hook, provider));
        }
        return this.h.add(name, wrapper);
    }

    remove(name: string, hook: Hook, provider?: EditableProvider) {
        return this.h.remove(name, this.w.get(getGuid(hook, provider)));
    }

    get(name: string): Hook | Hook[] {
        return this.h.get(name).map((l) => (<any>l[0]).h);
    }

    trigger(name: string, data: object, provider: EditableProvider) {
        let history = this.history;
        let active = history.active();

        history.active(false);

        this.h.trigger(name, [data, provider]);

        history.active(active);
    }
}

export default Hooks;
