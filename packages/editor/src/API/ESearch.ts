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
import {geo} from '@here/xyz-maps-core';
import EditFeature from '../features/feature/Feature';
import {TileLayer} from '@here/xyz-maps-core/src/layers/TileLayer';

export interface SearchOptions {
    id?: string | number;
    ids?: string[] | number[];
    point?: geo.Point;
    radius?: number;
    rect?: geo.Rect | [number, number, number, number];
    remote?: boolean;
    onload?: (features: EditFeature[]) => void;
    filter?: (feature: EditFeature) => boolean;
    layers?: TileLayer[];
}

export const eSearch = function(HERE_WIKI: InternalEditor) {
    return {
        /**
         *  Search for editable object(s).
         *
         *  @public
         *  @expose
         *  @function
         *  @name here.xyz.maps.editor.Editor#search
         *  @param {Object} options
         *  @param {String=} options.id Object id.
         *  @param {Array.<String>=} options.ids Array of object ids.
         *  @param {here.xyz.maps.geo.Point=} options.point Center point of the circle for search
         *  @param {number=} options.radius Search radius in meters, if "point" search is performed.
         *  @param {(here.xyz.maps.geo.Rect|Array.<number>)=} options.rect Rect object is either an array: [minLon, minLat, maxLon, maxLat] or Rect object defining rectangle to search in.
         *  @param {Boolean=} options.remote Force the provider to do remote search if objects are not found in cache.
         *  @param {Function=} options.onload Callback function of search if remote search is performed.
         *  @param {Function=} options.filter function for optional result filtering.
         *  @param {Array.<here.xyz.maps.layers.TileLayer>=} options.layers Layers to search in.
         *  @example
         * //searching by id:
         *editor.search({id: 1058507462})
         * //or:
         *editor.search({ids: [1058507462, 1058507464]})
         *@example
         * //searching by point and radius:
         *editor.search({
         *  point: {longitude: 72.84205, latitude: 18.97172},
         *  radius: 100
         *})
         *@example
         * //searching by Rect:
         *editor.search({
         *  rect:  {minLon: 72.83584, maxLat: 18.97299, maxLon: 72.84443, minLat: 18.96876}
         *})
         *@example
         * //remote search:
         *editor.search({
         *  rect:  {minLon: 72.83584, maxLat: 18.97299, maxLon: 72.84443, minLat: 18.96876},
         *  remote: true, // force provider to do remote search if feature/search area is not cached locally
         *  onload: function(e){
         *   // search result is only return in this callback function if no feature is not found in cache.
         *  }
         *})
         *  @return {Array.<here.xyz.maps.editor.features.Feature>} array of features
         */
        search: (options: SearchOptions): EditFeature[] => {
            const result = [];
            let feature;

            if (typeof options == 'object') {
                const filter = options['filter'];
                const searchLayers = options['layers'] || HERE_WIKI.layers;
                let l = searchLayers.length;


                while (l--) {
                    let layerResult = searchLayers[l].search(options);

                    if (!(layerResult instanceof Array)) {
                        layerResult = [layerResult];
                    }

                    let resultLength = layerResult.length;

                    while (feature = layerResult[--resultLength]) {
                        if (!filter || filter(feature)) {
                            result.push(feature);
                        }
                    }
                }
            }

            return result;
        }
    };
};
