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

import Navlink from '../../features/link/NavLink';

const DIRECTION_BOTH = 'BOTH';
const DIRECTION_FROM_RN = 'START_TO_END';
const DIRECTION_TO_RN = 'END_TO_START';


const isPedestrianOnly = (navlink) => {
    return navlink.getProvider().readPedestrianOnly(navlink);
};

const getDirection = (navlink) => {
    return navlink.getProvider().readDirection(navlink);
};

const isTurnAllowed = (fromLink, fromShape, toLink, toShape) => {
    const dir = getDirection(toLink);
    // check for if nodes are in the same zlevel
    const zMatch = toLink.getZLevels()[toShape] === fromLink.getZLevels()[fromShape];

    const allow = toShape == 0
        ? DIRECTION_FROM_RN
        : DIRECTION_TO_RN;

    return zMatch && (dir == DIRECTION_BOTH || allow == dir);
};

const getProperty = (fromLink: Navlink, fromShape: number, toLink: Navlink, toShape: number): boolean => {
    return fromLink.getProvider().readTurnRestriction({
        link: fromLink,
        index: fromShape
    }, {
        link: toLink,
        index: toShape
    });
};


const setProperty = (restricted: boolean, fromLink: Navlink, fromShape: number, toLink: Navlink, toShape: number) => {
    fromLink.getProvider().writeTurnRestriction(restricted, {
        index: fromShape,
        link: fromLink
    }, {
        index: toShape,
        link: toLink
    });
};

export {getDirection, isPedestrianOnly, isTurnAllowed, getProperty, setProperty};
