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

import {FeatureProvider as FeatureTileProvider} from './FeatureProvider';
import LRUStorage from '../storage/LRUStorage';

let UNDEF;

/**
 *  Configuration of local provider.
 *
 *  @public
 *  @expose
 *  @interface
 *  @class here.xyz.maps.providers.LocalProvider.Options
 */
/**
 *  Name of the provider
 *
 *  @public
 *  @expose
 *  @name here.xyz.maps.providers.LocalProvider.Options#name
 *  @type {string}
 */

// name: null

/**
 *  Local provider
 *
 *  @public
 *  @class
 *  @expose
 *  @constructor
 *  @extends here.xyz.maps.providers.FeatureProvider
 *  @param {here.xyz.maps.providers.LocalProvider.Options} config configuration of the provider
 *  @name here.xyz.maps.providers.LocalProvider
 */
export class LocalProvider extends FeatureTileProvider {
    constructor(config) {
        super({
            'minLevel': 8,
            'maxLevel': 20,
            'storage': new LRUStorage(512)
        }, config);

        // TODO: remove tile marking on feature add in super provider
        delete (<any> this).level;
    }

    cancel(quadkey) {
        //     console.log('cancel');
    };

    delete(feature) {
        this.tree.remove(feature);
    };

    /**
     *  @public
     *  @expose
     *  @param
     *  @name here.xyz.maps.providers.LocalProvider#import
     *  @type {string}
     */
    import(data) {
        const provider = this;

        provider.tree.fromJSON(data);

        data = provider.tree.all();

        let length = data.length;

        while (length--) {
            provider._insert(data[length]);
        }
    }

    initStorage(storage) {
        // local provider does not drop data if tilestorage is full.
        // creator of provider is responsable for clearance.
        // storage.onDrop(storage.remove.bind(storage), this);
    };
}
