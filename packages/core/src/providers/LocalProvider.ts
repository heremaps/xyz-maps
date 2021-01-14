/*
 * Copyright (C) 2019-2021 HERE Europe B.V.
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
import {TileStorage} from '../storage/TileStorage';
import {GeoJSONCoordinate} from '../features/GeoJSON';

type Navlink = Feature;


const METHOD_NOT_IMPLEMENTED = 'Method not implemented.';

/**
 *  Options to configure the Provider.
 */
export interface LocalProviderOptions {
    /**
     * Name of the provider.
     */
    name?: string;
    /**
     * Tile margin of the provider.
     */
    margin?: number;
    /**
     *  Allow or prevent editing by the {@link editor.Editor} module.
     *
     *  @default false
     */
    editable?: boolean;

    storage?: TileStorage;
};

/**
 *  Local feature tile provider.
 */
export class LocalProvider extends EditableFeatureProvider {
    /**
     * @param options - options to configure the provider
     */
    constructor(options: LocalProviderOptions) {
        super({
            minLevel: 8,
            maxLevel: 20,
            storage: new LRUStorage(512),
            editable: false,
            // suggest default tile-size for layersetup
            size: 512,
            ...options
        });

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

    // /**
    //  *  @param data
    //  */
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

    readRoutingPosition(feature: any): GeoJSONCoordinate {
        throw new Error(METHOD_NOT_IMPLEMENTED);
    }

    readRoutingLink(feature: any): string | number {
        throw new Error(METHOD_NOT_IMPLEMENTED);
    }

    writeRoutingPosition(feature: any, position: GeoJSONCoordinate) {
        throw new Error(METHOD_NOT_IMPLEMENTED);
    }

    writeRoutingLink(location: any, link: Feature) {
        throw new Error(METHOD_NOT_IMPLEMENTED);
    }

    readTurnRestriction(turnFrom: { link: Feature; index: number; }, turnTo: { link: Feature; index: number; }): boolean {
        throw new Error(METHOD_NOT_IMPLEMENTED);
    }

    writeRoutingPoint(location, link: Navlink | null, position: GeoJSONCoordinate | null) {
        this.writeRoutingLink(location, link);
        this.writeRoutingPosition(location, position);
    }

    readZLevels(link: Feature): number[] {
        throw new Error('Method not implemented.');
    }

    writeZLevels(link: Feature, zLevels: number[]) {
        throw new Error('Method not implemented.');
    }

    writeEditState(feature, editState: 'created' | 'modified' | 'removed' | 'split') {
    }
}
