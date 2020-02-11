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

import Navlink from '../features/link/NavLink';

type SplitHookData = { link: Navlink, children: Navlink[] };
type DisconnectHookData = { link: Navlink, index: number };
type RemoveHookData = { feature: Navlink };

const readTurnRestriction = (fromLink, fromIndex, toLink, toIndex) => {
    return fromLink.getProvider().readTurnRestriction({link: fromLink, index: fromIndex}, {
        link: toLink,
        index: toIndex
    });
};

const writeTurnRestriction = (restricted, fromLink, fromIndex, toLink, toIndex) => {
    const prov = fromLink.getProvider();
    prov.writeTurnRestriction(restricted, {
        link: fromLink,
        index: fromIndex
    }, {
        link: toLink,
        index: toIndex
    });
};


export default {

    'Navlink.split': [(data: SplitHookData) => {
        let parent = data.link;
        let children = data.children;
        let child1 = children[0];
        let child2 = children[1];

        const parentEndIndex = parent.coord().length - 1;
        const child1EndIndex = child1.coord().length - 1;
        const child2EndIndex = child2.coord().length - 1;


        for (let {link, index} of parent.getConnectedLinks(0, true)) {
            if (readTurnRestriction(parent, 0, link, index)) {
                writeTurnRestriction(true, child1, 0, link, index);
                writeTurnRestriction(false, child2, 0, link, index);
            }

            if (readTurnRestriction(link, index, parent, 0)) {
                writeTurnRestriction(true, link, index, child1, 0);
                writeTurnRestriction(false, link, index, child2, 0);
            }
        }

        for (let {link, index} of parent.getConnectedLinks(parentEndIndex, true)) {
            if (readTurnRestriction(parent, parentEndIndex, link, index)) {
                writeTurnRestriction(true, child2, child2EndIndex, link, index);
                writeTurnRestriction(false, child1, child1EndIndex, link, index);
            }
            if (readTurnRestriction(link, index, parent, parentEndIndex)) {
                writeTurnRestriction(true, link, index, child2, child2EndIndex);
                writeTurnRestriction(false, link, index, child1, child1EndIndex);
            }
        }
    }],

    // in case of linksplit it's called after Navlink.split
    'Feature.remove': (data: RemoveHookData) => {
        let navlink = data.feature;
        if (navlink.class == 'NAVLINK') {
            const startNodeIndex = 0;
            const endNodeIndex = navlink.coord().length - 1;

            for (let {link, index} of navlink.getConnectedLinks(startNodeIndex, true)) {
                writeTurnRestriction(false, navlink, startNodeIndex, link, index);
            }

            for (let {link, index} of navlink.getConnectedLinks(endNodeIndex, true)) {
                writeTurnRestriction(false, navlink, endNodeIndex, link, index);
            }
        }
    },

    'Navlink.disconnect': (data: DisconnectHookData) => {
        let line = data.link;
        const index = data.index;
        const details = true;

        // update/remove Turnrestriction of connected links if defined.
        line.getConnectedLinks(index, details).forEach((info) => {
            const cLink = info.link;
            const toIndex = info.index;

            writeTurnRestriction(false, line, index, cLink, toIndex);
            writeTurnRestriction(false, cLink, toIndex, line, index);
        });
    }
};
