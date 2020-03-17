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
import {Feature} from '../features/Feature';
import {EditableProvider} from './EditableProvider';

type FeatureClass = 'LINE' | 'NAVLINK' | 'MARKER' | 'PLACE' | 'ADDRESS' | 'AREA';

const METHOD_NOT_IMPLEMENTED = 'Method not implemented.';


export class EditableFeatureProvider extends FeatureTileProvider {
    isEditable = true;

    detectFeatureClass(feature): FeatureClass {
        switch (feature.geometry.type) {
        case 'Point':
            return 'MARKER';
        case 'LineString':
            return 'LINE';
        case 'Polygon':
            return 'AREA';
        case 'MultiPolygon':
            return 'AREA';
        }
    }

    getFeatureProperties(feature) {
        return feature.properties;
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

    readRoutingProvider(location: Feature, providers?: EditableProvider[]): string {
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

    writeEditState(feature, editState: 'created' | 'modified' | 'removed' | 'split') {
    }

    private blocked = {};

    blockFeature(feature, block) {
        const id = feature.id || feature;
        const type = typeof id;

        if (type == 'string' || type == 'number') {
            if (block) {
                this.blocked[id] = true;
            } else {
                delete this.blocked[id];
            }
        }
    };
}
