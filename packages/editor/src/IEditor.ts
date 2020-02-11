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

import {JSUtils} from '@here/xyz-maps-common';
import Transformer from './tools/transformer/Transformer';
import {layers, providers} from '@here/xyz-maps-core';
import {EditorOptions} from './API/EditorOptions';
import ObserverHandler from './handlers/ObserverHandler';
import EventHandler from './handlers/EventHandler';
import ObjectManager from './features/ObjectManager';
import DisplayListener from './DisplayListener';
import Hooks from './Hooks';
import Map from './map/Map';
import Display from '@here/xyz-maps-display';
import Feature from './features/feature/Feature';

type TileLayer = layers.TileLayer;
type EditableProvider = providers.EditableProvider;

const ERROR_EVENT = 'error';

let UNDEF;


export default class InternalEditor {
    _config: EditorOptions;

    display: Display;
    objects: ObjectManager;
    hooks: Hooks;
    listeners: EventHandler;
    observers: ObserverHandler;
    map: Map;
    transformer: Transformer;
    layers: TileLayer[];

    destroy: () => void;

    getStyle: (feature, layerDefaults?) => any[];
    setStyle: (feature, style?: any[], merge?: boolean) => any;

    getLayerForClass: (featureClass: string) => TileLayer;
    getProviderById: (providerId: string) => EditableProvider;
    getLayerById: (layerId: string) => TileLayer;
    getLayer: (providerId: string | Feature) => TileLayer;

    dump: (...args) => void;


    constructor(config: EditorOptions, display: Display) {
        this._config = config;

        const HERE_WIKI = this;

        HERE_WIKI.observers = new ObserverHandler();

        HERE_WIKI.listeners = new EventHandler();

        HERE_WIKI.objects = new ObjectManager(HERE_WIKI, display);

        HERE_WIKI.hooks = new Hooks(HERE_WIKI.objects.history);

        const displayListener = new DisplayListener(HERE_WIKI, display);

        displayListener.start();

        const editEngineOverlay = HERE_WIKI.objects.overlay.layer;
        const PROVIDER_ID_TO_LAYER = {};
        // add the overlay
        PROVIDER_ID_TO_LAYER[editEngineOverlay.getProvider().id] = editEngineOverlay;

        function providerErrorListener(errorMsg) {
            HERE_WIKI.listeners.trigger(ERROR_EVENT, errorMsg);
        }

        HERE_WIKI.listeners.bind('_layerAdd', (ev) => {
            const layer = ev.detail.layer; // ev.target;
            const provider = layer.getProvider();

            for (let prop of ['src', 'base', 'delta', 'id']) {
                const layerId = provider[prop];
                if (layerId) {
                    PROVIDER_ID_TO_LAYER[layerId] = layer;
                }
            }
            // make sure it's only listening once if layer gets read...
            layer.removeEventListener(ERROR_EVENT, providerErrorListener);
            layer.addEventListener(ERROR_EVENT, providerErrorListener);
        });

        HERE_WIKI.getLayerForClass = (featureClass) => {
            // fallback logic for Maphub Provider...
            // TODO: can be removed if Maphub/Pro-Provider is removed from public API
            let firstMultiTypeLayer;
            let providerClass;
            let found;
            let prov;

            // find the layer in which the object should be created
            for (let layer of HERE_WIKI.layers) {
                if (layer.getProvider) {
                    prov = layer.getProvider();
                }

                providerClass = prov.class;

                if (!providerClass) {
                    if (!firstMultiTypeLayer) {
                        firstMultiTypeLayer = layer;
                    }
                } else if (featureClass == providerClass) {
                    found = layer;
                }
            }

            return found || firstMultiTypeLayer;
        };

        // also supporting currently not active layers.
        HERE_WIKI.getProviderById = function(layerId) {
            return PROVIDER_ID_TO_LAYER[layerId].getProvider();
        };

        HERE_WIKI.getLayerById = (layerId) => {
            for (let layer of HERE_WIKI.layers) {
                if (layer.id == layerId) {
                    return layer;
                }
            }
        };

        HERE_WIKI.getLayer = function(providerId) {
            let layer;

            if (typeof providerId == 'object') {
                const provider = providerId.getProvider();

                // TODO: remove deprecated maphubprovider workaround
                // @ts-ignore
                providerId = provider.src || provider.delta || provider.base || provider.id;
            }

            if (providerId) {
                layer = PROVIDER_ID_TO_LAYER[<string>providerId];
            }

            return layer;
        };


        HERE_WIKI.getStyle = function(feature, layerDefaults) {
            const layer = this.getLayer(feature);
            const style = layer.getStyleGroup(feature, UNDEF, layerDefaults);

            return JSUtils.extend(true, [], style);
        };

        HERE_WIKI.setStyle = function(feature, style, merge) {
            this.getLayer(feature)
                .setStyleGroup(feature, style, merge);
        };

        HERE_WIKI.map = new Map(display);

        HERE_WIKI.transformer = new Transformer(HERE_WIKI);

        HERE_WIKI.display = display;

        HERE_WIKI.destroy = () => {
            displayListener.stop();
            // removes the overlay
            HERE_WIKI.objects.destroy();

            HERE_WIKI.listeners.destroy();
        };

        HERE_WIKI.dump = JSUtils.dump;
    }
};
