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

import {Set} from '@here/xyz-maps-common';
import InternalEditor from './IEditor';
import ObserverHandler from './handlers/ObserverHandler';
import {TerrainTileLayer} from '@here/xyz-maps-core';

export default class DisplayListener {
    // private layers = {};
    // private layers: layers.TileLayer[] = [];
    private display;

    private busy: Set = null;

    private observers: ObserverHandler;

    private iEdit: InternalEditor;

    constructor(iEdit: InternalEditor, display) {
        this.display = display;

        this.iEdit = iEdit;

        this.observers = iEdit.observers;

        this.onStart = this.onStart.bind(this);
        this.onStop = this.onStop.bind(this);

        this.onLayerChange = this.onLayerChange.bind(this);

        iEdit.listeners.add('_layerAdd', (ev) => {
            // make sure ready observers are getting triggered in any case even if layer is ready already.
            this.observers.change('ready', false);
            this.display.setCenter(this.display.getCenter());

            ev.detail.layer.addEventListener('viewportReady', this.onStop);
        });

        iEdit.listeners.add('_layerRemove', (ev) => {
            ev.detail.layer.removeEventListener('viewportReady', this.onStop);
            this.busy?.delete(ev.detail.layer);
            if (!this.busy?.size && !this.iEdit.layers.length) {
                this.observers.change('ready', true);
            }
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

    private onLayerChange(ev) {
        if (ev.detail.layer instanceof TerrainTileLayer) {
            this.iEdit.displayProvidesTerrain = ev.type === 'addLayer';
        }
    }

    start() {
        if (this.display.getLayers().some((layer)=>layer instanceof TerrainTileLayer)) {
            this.iEdit.displayProvidesTerrain = true;
        }
        this.display.addEventListener('mapviewchangestart', this.onStart);
        this.display.addEventListener('addLayer removeLayer', this.onLayerChange);
    };

    stop() {
        // this.listen(false);
        this.display.removeEventListener('mapviewchangestart', this.onStart);
        this.display.removeEventListener('layerAdd layerRemove', this.onLayerChange);
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
