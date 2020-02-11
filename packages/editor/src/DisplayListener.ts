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

import {Set} from '@here/xyz-maps-common';
import InternalEditor from './IEditor';

export default class DisplayListener {
    // private layers = {};
    // private layers: layers.TileLayer[] = [];
    private display;

    private busy: Set = null;

    private observers: any;

    private iEdit;

    constructor(HERE_WIKI: InternalEditor, display) {
        this.display = display;

        this.iEdit = HERE_WIKI;

        this.observers = HERE_WIKI.observers;

        this.onStart = this.onStart.bind(this);
        this.onStop = this.onStop.bind(this);

        HERE_WIKI.listeners.bind('_layerAdd', (ev) => {
            // make sure ready observers are getting triggered in any case even if layer is ready already.
            this.observers.change('ready', false);
            this.display.setCenter(this.display.getCenter());

            ev.detail.layer.addEventListener('viewportReady', this.onStop);
        });

        HERE_WIKI.listeners.bind('_layerRemove', (ev) => {
            ev.detail.layer.removeEventListener('viewportReady', this.onStop);
        });
    }

    private onStart() {
        if (!this.busy) {
            const layers = this.iEdit.layers;
            this.busy = new Set(layers);
            if (layers.length) {
                this.observers.change('ready', false);
            }
        }
    }

    private onStop(ev) {
        const layer = ev.detail.layer;
        const unready = this.busy;
        if (unready) {
            unready.delete(layer);
            if (!unready.size) {
                this.observers.change('ready', true);
                this.busy = null;
            }
        }
    }

    start() {
        // this.listen(true);
        this.display.addEventListener('mapviewchangestart', this.onStart);
    };

    stop() {
        // this.listen(false);
        this.display.removeEventListener('mapviewchangestart', this.onStart);
    };

    // private onStart(ev) {
    //     const layer = ev.detail.layer;
    //     const unready = this.busy;
    //
    //     if (!unready.size) {
    //         this.observers.change('ready', false);
    //     }
    //
    //     unready.add(layer);
    // }

    // private onStop(ev) {
    //     const layer = ev.detail.layer;
    //     const unready = this.busy;
    //
    //     unready.delete(layer);
    //
    //     if (!unready.size) {
    //         this.observers.change('ready', true);
    //     }
    // }

    // private listen(listen: boolean) {
    //     const toggle = listen ? 'addEventListener' : 'removeEventListener';
    //
    //     for (let layer of this.layers) {
    //         // layer[toggle]('viewportChange', this.onStart);
    //         layer[toggle]('viewportReady', this.onStop);
    //     }
    // }
}
