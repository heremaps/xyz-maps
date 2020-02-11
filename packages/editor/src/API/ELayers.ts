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

import InternalEditor from '../IEditor';
import {EditableProvider} from '@here/xyz-maps-core/src/providers/EditableProvider';

const NAVLINK = 'NAVLINK';

const getIdentifier = (l) => {
    const featureClass = l.class;
    return featureClass == NAVLINK ? NAVLINK : String(featureClass) + (l['src'] || (l['base'] + l['delta']) || l['id']);
};


const toggleProviderHooks = (toggle: 'add' | 'remove', provider, HERE_WIKI) => {
    const provHooks = provider.hooks;

    if (provHooks) {
        for (let name in provHooks) {
            let hooks = provHooks[name];

            if (!(hooks instanceof Array)) {
                hooks = [hooks];
            }
            for (let hook of hooks) {
                HERE_WIKI.hooks[toggle](name, hook, provider);
            }
        }
    }
};


// /**
//  *  The interface to add, remove layers or get existing layers from editor.
//  *
//  *  @expose
//  *  @public
//  *  @constructor
//  *  @name here.xyz.maps.editor.Editor.layers
//  */
export const eLayers = (HERE_WIKI: InternalEditor, initLayers) => {
    const layerMap = {};
    const arrayLayers = HERE_WIKI.layers = [];

    const layers = {

        /**
         *  add the layer to enable editing.
         *
         *  @public
         *  @expose
         *
         *  @function
         *  @param {here.xyz.maps.layers.TileLayer} layer
         *      the layer to be added to map.
         *
         *  @name here.xyz.maps.editor.Editor#addLayer
         *  @return {boolean} true indicates layer is added successfully, otherwise false.
         */
        addLayer: (layer) => {
            if (layer) {
                const prov = <EditableProvider>layer.getProvider();

                if (prov.__type == 'FeatureProvider' && prov.isEditable && (
                    !layerMap[getIdentifier(prov)] ||
                    // @ts-ignore TODO: remove class property
                    prov.class == NAVLINK
                )) {
                    if (prov._e instanceof InternalEditor) {
                        if (prov._e === HERE_WIKI) {
                            return false;
                        }
                        throw (new Error('Provider already in use by another editor'));
                    }

                    prov._e = HERE_WIKI;
                    // @ts-ignore TODO: remove class property
                    layer.class = prov.class;

                    HERE_WIKI.listeners.trigger('_layerAdd', {
                        layer: layer
                    });

                    layerMap[getIdentifier(prov)] = layer;

                    arrayLayers.push(layer);

                    // add provider Hooks if defined.
                    toggleProviderHooks('add', prov, HERE_WIKI);

                    return true;
                }
            }
            return false;
        },

        /**
         *  Get all layers that are added to the editor.
         *
         *  @public
         *  @expose
         *
         *  @function
         *  @return {Array.<here.xyz.maps.layers.TileLayer>}
         *      all layers that are added to map in array
         *
         *  @name here.xyz.maps.editor.Editor#getLayers
         */
        getLayers: (index) => {
            return index ? arrayLayers[index] : arrayLayers.slice();
        },

        /**
         *  Remove a layer from the editor.
         *
         *  @public
         *  @expose
         *
         *  @function
         *  @param {here.xyz.maps.layers.TileLayer} layer
         *      the layer to be removed from map.
         *  @return {boolean} true indicates layer is removed successfully, otherwise false.
         *
         *  @name here.xyz.maps.editor.Editor#removeLayer
         */
        removeLayer: (layer) => {
            if (layer) {
                let prov = <EditableProvider>layer.getProvider();

                const lid = getIdentifier(prov);

                if (prov.__type == 'FeatureProvider' && prov.isEditable && layerMap[lid]) {
                    HERE_WIKI.listeners.trigger('_layerRemove', {
                        layer: layer
                    });

                    delete layerMap[lid];

                    arrayLayers.splice(arrayLayers.indexOf(layer), 1);

                    toggleProviderHooks('remove', prov, HERE_WIKI);

                    delete prov._e;
                    return true;
                }
            }
            return false;
        }

    };

    if (initLayers instanceof Array) {
        initLayers.forEach(layers.addLayer);
    }

    return layers;
};
