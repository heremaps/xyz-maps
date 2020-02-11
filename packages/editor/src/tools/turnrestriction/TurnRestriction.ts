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

import {JSUtils, geotools} from '@here/xyz-maps-common';
import {movePointOnPath} from '../../geometry';
import linkTools from '../../features/link/NavLinkTools';
import {isTurnAllowed, isPedestrianOnly, getProperty, setProperty} from './utils';
import Overlay from '../../features/Overlay';
import NavLink from '../../features/link/NavLink';

const DISTANCE_METER = 8 * 1e-5;

const TURN_RESTRICTION = 'TURN_RESTRICTION_';


const getCurSign = (fromLink, fromShape, toLink, toShape) => {
    const restricted = getProperty(fromLink, fromShape, toLink, toShape);

    return isTurnAllowed(fromLink, fromShape, toLink, toShape)
        ? restricted
            ? 'FORBIDDEN'
            : isPedestrianOnly(toLink)
                ? 'PEDESTRIAN'
                : 'ALLOWED'
        : 'ONEWAY';
};

class TurnRestriction {
    overlay: Overlay;
    sign;
    line;

    from: NavLink;
    to: NavLink;

    constructor(HERE_WIKI, fromLink, fromShape, toLink, toShape, carPosition) {
        const overlay = HERE_WIKI.objects.overlay;
        const nextShape = toShape == 0 ? 1 : toLink.coord().length - 2;
        const path = toLink.coord();
        const p1 = path[toShape].slice();
        const p2 = path[nextShape].slice();
        const rotPnt = movePointOnPath(p1, p2, DISTANCE_METER);

        let curSign = getCurSign(fromLink, fromShape, toLink, toShape);

        const line = overlay.addPath([rotPnt, p1, carPosition], null, {
            type: TURN_RESTRICTION + 'LINE',
            sign: TURN_RESTRICTION + curSign
        });
        const sign = overlay.addImage(rotPnt, null, {
            'type': TURN_RESTRICTION + curSign,
            'rotation': -geotools.calcBearing(p1, rotPnt)
        });

        this.sign = sign;
        this.line = line;

        this.overlay = overlay;
        this.to = toLink;
        this.from = fromLink;

        linkTools.showDirection(toLink);

        overlay.remove(line);

        sign.pointerenter = () => {
            overlay.addFeature(line);
        };

        sign.pointerleave = () => {
            overlay.remove(line);
        };

        sign.pointerup = () => {
            if (isTurnAllowed(fromLink, fromShape, toLink, toShape) && !isPedestrianOnly(toLink)) {
                HERE_WIKI.objects.history.ignore(() => {
                    setProperty(curSign == 'ALLOWED', fromLink, fromShape, toLink, toShape);
                });

                curSign = curSign == 'ALLOWED' ? 'FORBIDDEN' : 'ALLOWED';

                if (HERE_WIKI.objects.history.saveChanges()) {
                    sign.properties.type = TURN_RESTRICTION + curSign;
                    line.properties.sign = sign.properties.type;

                    // update styles of icon and direction line
                    HERE_WIKI.setStyle(sign);
                    HERE_WIKI.setStyle(line);
                }
            }
        };
    }

    hide() {
        linkTools.hideDirection(this.to);

        this.overlay.remove(this.sign);
        this.overlay.remove(this.line);

        this.sign = null;
        this.line = null;
    };
}

export default TurnRestriction;
