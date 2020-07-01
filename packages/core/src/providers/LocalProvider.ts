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

import {EditableFeatureProvider} from './EditableFeatureProvider';
import LRUStorage from '../storage/LRUStorage';
import {Feature} from '../features/Feature';

type Navlink = Feature;
type Coordinate = [number, number, number?];


const METHOD_NOT_IMPLEMENTED = 'Method not implemented.';


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
 *  @type {string=}
 */

/**
 *  Allow or prevent editing by Editor component.
 *
 *  @public
 *  @expose
 *  @default false
 *  @name here.xyz.maps.providers.LocalProvider.Options#editable
 *  @type {boolean}
 */

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
export class LocalProvider extends EditableFeatureProvider {
    constructor(config) {
        super({
            'minLevel': 8,
            'maxLevel': 20,
            'storage': new LRUStorage(512),
            'editable': false,
            // suggest default tile-size for layersetup
            '_tsize': 512
        }, config);

        // TODO: remove tile marking on feature add in super provider
        delete (<any> this).level;

        if (!this.editable) {
            this.Feature = Feature;
            this.detectFeatureClass = () => null;
        }
    }

    cancel(quadkey: string) {
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

    _clearOnCommit = false;

    commit(features, onSuccess?, onError?) {
        // just fake commit. nothing is done here.
        if (typeof onSuccess == 'function') {
            setTimeout(() => onSuccess({}), 0);
        }
        return true;
    }


    readDirection(link: Feature): 'BOTH' | 'START_TO_END' | 'END_TO_START' {
        throw new Error(METHOD_NOT_IMPLEMENTED);
        // return 'BOTH';
    }

    readPedestrianOnly(link: Feature): boolean {
        throw new Error(METHOD_NOT_IMPLEMENTED);
    }

    writeTurnRestriction(restricted: boolean, turnFrom: { link: Feature; index: number; }, turnTo: { link: Feature; index: number; }) {
        throw new Error(METHOD_NOT_IMPLEMENTED);
    }

    readRoutingProvider(location: Feature, providers?: EditableFeatureProvider[]): string {
        return this.id;
    }

    readRoutingPosition(feature: any): [number, number, number?] {
        throw new Error(METHOD_NOT_IMPLEMENTED);
    }

    readRoutingLink(feature: any): string | number {
        throw new Error(METHOD_NOT_IMPLEMENTED);
    }

    writeRoutingPosition(feature: any, position: [number, number, number?]) {
        throw new Error(METHOD_NOT_IMPLEMENTED);
    }

    writeRoutingLink(location: any, link: Feature) {
        throw new Error(METHOD_NOT_IMPLEMENTED);
    }

    readTurnRestriction(turnFrom: { link: Feature; index: number; }, turnTo: { link: Feature; index: number; }): boolean {
        throw new Error(METHOD_NOT_IMPLEMENTED);
    }

    writeRoutingPoint(location, link: Navlink | null, position: Coordinate | null) {
        this.writeRoutingLink(location, link);
        this.writeRoutingPosition(location, position);
    };

    writeEditState(feature, editState: 'created' | 'modified' | 'removed' | 'split') {
    }
}
