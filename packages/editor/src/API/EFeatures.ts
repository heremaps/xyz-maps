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

import SimpleContainer from '../features/Container';
import SObj from '../features/feature/Feature';

let UNDEF;


const isCoordinate = (c) => {
    return c.x != UNDEF && c.y != UNDEF || c.longitude != UNDEF && c.latitude != UNDEF;
};

export const eFeatures = (HERE_WIKI) => {
    const prepareCoordinates = (c, offset) => {
        if (isCoordinate(c)) {
            c = HERE_WIKI.map.getGeoCoord(c);
        }
        if (typeof c[0] == 'number') {
            c[0] += offset[0];
            c[1] += offset[1];
            return HERE_WIKI.map.clipGeoCoord(c);
        }
        const coordinates = [];

        for (let i = 0; i < c.length; i++) {
            coordinates[i] = prepareCoordinates(c[i], offset);
        }

        return coordinates;
    };

    const changes = {
        /**
         *  Add defined features to map.
         *
         *  @public
         *  @expose
         *
         *  @function
         *  @param {here.xyz.maps.editor.features.Feature|Array.<here.xyz.maps.editor.features.Feature>} feature
         *      the feature(s) to be added to map.
         *  @param {here.xyz.maps.layers.TileLayer=} layer
         *      layer the feature(s) should be added.
         *  @param {here.xyz.maps.editor.GeoCoordinate=} origin
         *      allows to translate features by origin offset.
         *  @return {here.xyz.maps.editor.features.Feature|here.xyz.maps.editor.features.Container}
         *      feature(s) that were successfully added to map
         *  @name here.xyz.maps.editor.Editor#addFeature
         *
         *  @also
         *  Add defined features to map.
         *
         *  @public
         *  @expose
         *
         *  @function
         *  @param {Object.<string|number,here.xyz.maps.editor.features.Feature|Array.<here.xyz.maps.editor.features.Feature>>} layermap
         *      layermap is an object with layerId, feature ([feature]) pairs.
         *  @param {here.xyz.maps.editor.GeoCoordinate=} origin
         *      allows to translate features by origin offset.
         *  @return {here.xyz.maps.editor.features.Feature|here.xyz.maps.editor.features.Container}
         *      feature(s) that were successfully added to map
         *  @name here.xyz.maps.editor.Editor#addFeature
         */

        // editor['addFeature'] = function( feature,[origin] ) {
        // editor['addFeature'] = function( {feature}, layer,[origin] ) {
        // editor['addFeature'] = function( feature, layer, [origin] ) {
        addFeature: function(feature, layer, origin) {
            const args = arguments;
            const added = [];
            const idmap = {};
            let layermap = {};
            let created;
            let offset;

            const addFeature = (f, layer) => {
                const layerid = layer && layer.id;
                const features = layermap[layerid] = layermap[layerid] || [];
                features.push(f);
            };

            if (feature instanceof SObj) {
                addFeature(feature, layer);
            } else if (feature instanceof Array) {
                feature.forEach((f) => addFeature(f, layer));
            } else {
                layermap = feature;
                for (var id in layermap) {
                    feature = layermap[id];
                    if (feature.type == 'Feature') {
                        layermap[id] = [feature];
                    }
                }
            }

            origin = args[args.length - 1];

            if (isCoordinate(origin)) {
                origin = HERE_WIKI.map.getGeoCoord(origin);

                const vb = HERE_WIKI.display.getViewBounds();

                offset = [
                    origin[0] - vb.minLon,
                    origin[1] - vb.maxLat
                ];
            } else {
                offset = [0, 0];
            }

            for (let layerId in layermap) {
                let features = layermap[layerId];

                features.forEach((f) => {
                    const geom = f.geometry;
                    geom.coordinates = prepareCoordinates(geom.coordinates, offset);

                    if (f = HERE_WIKI.objects.add(f, layerId == 'undefined' ? UNDEF : layerId, idmap)) {
                        created = true;
                        added.push(f);
                    }
                });
            }

            if (created) {
                HERE_WIKI.objects.history.saveChanges();
            }


            return added.length > 1 ? changes.createFeatureContainer.apply(changes, added) : added[0];
        },

        /**
         *  Get a feature.
         *
         *  @public
         *  @expose
         *  @function
         *  @param {String|Number} objId
         *      id of the object
         *  @param {String} layerId
         *      layerId of layer to which the object belongs
         *  @return {here.xyz.maps.editor.features.Feature|null }
         *      return the found object in map. If the object is not found in current viewport, null is returned.
         *  @name here.xyz.maps.editor.Editor#getFeature
         */
        getFeature: (objId, layerId) => {
            const obj = HERE_WIKI.objects.get(objId, layerId);
            return obj || null;
        },

        /**
         *  Create an empty object container.
         *
         *  @public
         *  @expose
         *
         *  @function
         *  @return {here.xyz.maps.editor.features.Container}
         *      object container
         *  @name here.xyz.maps.editor.Editor#createFeatureContainer
         */
        createFeatureContainer: function(...features) {
            const container = new SimpleContainer(HERE_WIKI);
            container.push(features);
            return container;
        },

        /**
         *  Clears current selected object.
         *
         *  @public
         *  @expose
         *
         *  @function
         *  @return {here.xyz.maps.editor.features.Feature|null}
         *      cleared object or null if none was selected.
         *  @name here.xyz.maps.editor.Editor#clearObjectSelection
         */
        clearObjectSelection: () => {
            const cleared = HERE_WIKI.objects.selection.clearSelected();

            return cleared || null;
        }
    };

    return changes;
};
