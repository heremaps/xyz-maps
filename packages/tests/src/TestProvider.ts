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

import {providers} from '@here/xyz-maps-core';

type Feature = any;
type Navlink = any;
type Location = any;

type FeatureClass = 'LINE' | 'NAVLINK' | 'MARKER' | 'PLACE' | 'ADDRESS' | 'AREA';

type TurnNode = {
    link: Navlink,
    index: number
};

type Coordinate = [number, number, number?];

type SplitHookData = {
    link: Navlink,
    index: number,
    children: [Navlink, Navlink],
    relativePosition: number // 0.0 -> 1.0
};
type DisconnectHookData = {
    link: Navlink,
    index: number
};
type RemoveHookData = {
    feature: Feature
};

type SplitHook = (data: SplitHookData) => void;
type DisconnectHook = (data: DisconnectHookData) => void;
type RemoveHook = (data: RemoveHookData) => void;

type Hooks = {
    'Navlink.split'?: SplitHook | SplitHook[],
    'Navlink.disconnect'?: DisconnectHook | DisconnectHook[],
    'Feature.remove'?: RemoveHook | RemoveHook[]
};


class TestProvider extends providers.SpaceProvider {
    hooks: Hooks;

    constructor(props, preprocessor?: Function) {
        super(props, preprocessor);

        this.hooks = {
            'Navlink.split': function(data: SplitHookData) {
                let link = data.link;
                let children = data.children;
                link.prop('splittedInto', children.map((c) => c.id));
                link.prop('splitted', 'HOOK');
                children.forEach((child)=>{
                    child.prop('parentLink', link.id);
                    child.prop('originLink', link.prop('originLink') || link.id);
                });
            },
            'Feature.remove': function(data: RemoveHookData) {
                // mark removed link as removed
                data.feature.prop('removed', 'HOOK');
            },
            'Navlink.disconnect': function(data: DisconnectHookData) {
                // mark disconnected link as disconnected
                data.link.prop('disconnected', 'HOOK');
            }
        };
    }

    detectFeatureClass(feature: Feature): FeatureClass {
        return feature.properties.featureClass;
    }

    readRoutingPosition(feature: Location): Coordinate {
        return feature.prop('routingPoint');
    }

    readRoutingLink(feature: Location) {
        return feature.prop('routingLink');
    }

    writeRoutingPosition(feature: Location, position: Coordinate) {
        feature.prop('routingPoint', position);
    }

    writeRoutingLink(feature: Location, link: Navlink) {
        feature.prop('routingLink', link ? link.id : link);
    }

    readTurnRestriction(from: TurnNode, to: TurnNode): boolean {
        let turn = from.link.prop('turnRestriction') || {};
        let restrictions = turn[from.index ? 'end' : 'start'] || [];

        return restrictions.indexOf(to.link.id) >= 0;
    };

    writeTurnRestriction(restricted: boolean, from: TurnNode, to: TurnNode) {
        let turn = from.link.prop('turnRestriction') || {};
        let node = from.index ? 'end' : 'start';
        let restrictions = turn[node] = turn[node] || [];
        let index = restrictions.indexOf(to.link.id);

        if (restricted) {
            if (index == -1) {
                restrictions.push(to.link.id);
            }
        } else if (index >= 0) {
            restrictions.splice(index, 1);
        }

        from.link.prop('turnRestriction', turn);
    }

    readPedestrianOnly(feature: Navlink): boolean {
        return Boolean(feature.prop('pedestrianOnly'));
    }

    readDirection(feature: Navlink): 'BOTH' | 'START_TO_END' | 'END_TO_START' {
        return feature.prop('direction') || 'BOTH';
    }

    readRoutingProvider(location: Feature, providers ): string {
        for (let provider of providers) {
            if (provider.id.toLowerCase().indexOf('link') >= 0) {
                return provider.id;
            }
        }
    }

    isDroppable(feature: Feature) {
        const editStates = feature.editState();

        return !editStates || (
            !editStates.modified &&
            !editStates.removed &&
            !editStates.split
        );
    }

    writeEditState = function(feature: Feature, editState: string) {
        const {properties} = feature;
        if (properties.estate != 'SPLIT') {
            if (properties.estate != 'CREATED' || editState.toUpperCase() == 'REMOVED') {
                properties.estate = editState == 'modified' ? 'UPDATED' : editState.toUpperCase();
            }
        }
    }
}

export {TestProvider};
