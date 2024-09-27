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

import {JSUtils} from '@here/xyz-maps-common';
import Transformer from './tools/transformer/Transformer';
import {TileLayer, EditableRemoteTileProvider, StyleGroup, Feature} from '@here/xyz-maps-core';
import {EditorOptions} from './API/EditorOptions';
import ObserverHandler from './handlers/ObserverHandler';
import EventHandler from './handlers/EventHandler';
import ObjectManager from './features/ObjectManager';
import DisplayListener from './DisplayListener';
import Hooks from './Hooks';
import Map from './map/Map';
import {Map as Display, styleTools} from '@here/xyz-maps-display';
import {RangeSelector} from './API/ERangeSelector';
import {DrawingBoard} from './API/DrawingBoard';

const ERROR_EVENT = 'error';

let UNDEF;


export default class InternalEditor {
    _config: EditorOptions;

    isCommitInProcess: boolean = false;
    _rngSel: RangeSelector;
    _db: DrawingBoard;
    private _dListener: DisplayListener;

    private prvIdLayerMap: { [providerId: string]: TileLayer };

    display: Display;
    objects: ObjectManager;
    hooks: Hooks;
    listeners: EventHandler;
    observers: ObserverHandler;
    map: Map;
    transformer: Transformer;
    layers: TileLayer[];
    layerMap: { [id: string]: TileLayer };
    dump: (...args) => void;


    constructor(config: EditorOptions, display: Display) {
        this._config = config;

        const iEditor = this;

        iEditor.layers = [];
        iEditor.layerMap = {};

        iEditor.observers = new ObserverHandler();

        iEditor.listeners = new EventHandler();

        iEditor.objects = new ObjectManager(iEditor, display);

        iEditor.hooks = new Hooks(iEditor.objects.history);

        this._dListener = new DisplayListener(iEditor, display);
        this._dListener.start();

        const editEngineOverlay = iEditor.objects.overlay.layer;
        const prvIdLayerMap = this.prvIdLayerMap = {};
        // add the overlay
        prvIdLayerMap[editEngineOverlay.getProvider().id] = editEngineOverlay;

        function providerErrorListener(errorMsg) {
            iEditor.listeners.trigger(ERROR_EVENT, errorMsg);
        }

        iEditor.listeners.add('_layerAdd', (ev) => {
            const layer = ev.detail.layer; // ev.target;
            const provider = layer.getProvider();

            for (let prop of ['src', 'base', 'delta', 'id']) {
                const layerId = provider[prop];
                if (layerId) {
                    prvIdLayerMap[layerId] = layer;
                }
            }
            // make sure it's only listening once if layer gets read...
            layer.removeEventListener(ERROR_EVENT, providerErrorListener);
            layer.addEventListener(ERROR_EVENT, providerErrorListener);
        });

        iEditor.map = new Map(display);

        iEditor.transformer = new Transformer(iEditor);

        iEditor.display = display;

        iEditor.dump = JSUtils.dump;
    }

    getLayerForClass(featureClass: string): TileLayer {
        // fallback logic for Maphub Provider...
        // TODO: can be removed if Maphub/Pro-Provider is removed from public API
        let firstMultiTypeLayer;
        let providerClass;
        let found;
        let prov;

        // find the layer in which the object should be created
        for (let layer of this.layers) {
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
    getProviderById(layerId: string): EditableRemoteTileProvider {
        const layer = this.prvIdLayerMap[layerId];
        if (layer) {
            return <EditableRemoteTileProvider>layer.getProvider();
        }
    };

    getLayerById(layerId: string): TileLayer {
        for (let layer of this.layers) {
            if (layer.id == layerId) {
                return layer;
            }
        }
    };

    getLayer(providerId: string | Feature): TileLayer {
        let layer;

        if (typeof providerId == 'object') {
            const provider = providerId.getProvider();

            // TODO: remove deprecated maphubprovider workaround
            // @ts-ignore
            providerId = provider.src || provider.delta || provider.base || provider.id;
        }

        if (providerId) {
            layer = this.prvIdLayerMap[<string>providerId];
        }

        return layer;
    };

    destroy() {
        this._dListener.stop();
        // removes the overlay
        this.objects.destroy();

        this.listeners.destroy();
    };

    getStyle(feature: Feature, layerDefaults?: boolean): StyleGroup {
        const layer = this.getLayer(feature);
        const style = layer.getStyleGroup(feature, this.display.getZoomlevel() ^ 0, layerDefaults);
        return JSUtils.extend(true, [], style);
    };

    getStyleProperty(feature: Feature, property: string) {
        const styleGroup = this.getStyle(feature);
        for (let style of styleGroup) {
            if (style[property] != UNDEF) {
                return styleTools.getValue(property, style, feature, this.display.getZoomlevel() ^ 0);
            }
        }
    }

    getZLayer(layer: TileLayer): number {
        const zLayer = layer.getStyle().zLayer;
        return zLayer ?? 1 + this.display.getLayers().indexOf(layer);
    }

    getMaxZLayer(feature: Feature): number {
        const layer = this.getLayer(feature);
        const styleGrp = layer.getStyleGroup(feature);
        let maxZLayer = -1;
        if (styleGrp) {
            let zoom = this.display.getZoomlevel() ^ 0;
            for (let style of styleGrp) {
                let zLayer = styleTools.getValue('zLayer', style, feature, zoom);
                if (zLayer>maxZLayer) maxZLayer = zLayer;
            }
        }
        return maxZLayer > -1 ? maxZLayer : this.getZLayer(layer);
    }

    setStyle(feature: Feature, style?: StyleGroup | 'default', merge?: boolean) {
        const layer = this.getLayer(feature);

        if (style == UNDEF) {
            // in case of a custom style has been set (default layer style is overwritten)
            // the style won't be reset with the default layer style, but the custom style will be kept
            // and a refresh for possible style update of styleAttributeFunctions is triggered.
            style = layer._getCustomStyleGroup(feature);
        } else if (style == 'default') {
            style = UNDEF;
        }

        // @ts-ignore: merge attribute is "internal"
        layer.setStyleGroup(feature, style, merge);
    };
};
