/*
 * Copyright (C) 2019-2022 HERE Europe B.V.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
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

import {Listener as Listeners} from '@here/xyz-maps-common';

const REMOVE_LAYER_EVENT = 'layerRemove';
const ADD_LAYER_EVENT = 'layerAdd';

let UNDEF;

/**
 * TileLayer
 */
export class Layer {
    /**
     * The name of the Layer
     */
    public name: string = '';

    protected _l: Listeners;

    protected __type = 'Layer';

    public tiled: boolean;

    /**
     * The identifier of the Layer.
     */
    public readonly id: string;

    /**
     * minimum zoom level at which data from the Layer is displayed.
     */
    public min: number;

    /**
     * maximum zoom level at which data from the Layer will be displayed.
     */
    public max: number;

    /**
     * @param options - options to configure the Layer
     */
    constructor(options) {
        const layer = this;

        for (const c in options) {
            layer[c] = options[c];
        }

        if (layer.id == UNDEF) {
            (<any>layer).id = 'L-' + (Math.random() * 1e8 ^ 0);
        }

        layer._l = new Listeners([
            ADD_LAYER_EVENT,
            REMOVE_LAYER_EVENT
        ]);
    };

    addEventListener(type: string, listener: (event: CustomEvent) => void, _c?) {
        const listeners = this._l;

        if (listeners.isDefined(type)) {
            return listeners.add(type, listener, _c);
        }
    };


    /**
     * Dispatch Layer event.
     *
     * @hidden
     * @internal
     *
     * @param type
     * @param detail
     */
    dispatchEvent(type: string, detail: { [name: string]: any, layer?: Layer }) {
        detail.layer = this;
        const event = new CustomEvent(type, {detail});
        this._l.trigger(type, event, true);
    }
}
