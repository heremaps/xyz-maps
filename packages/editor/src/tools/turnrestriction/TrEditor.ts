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


import {Navlink} from '../../features/link/Navlink';
import {movePointOnPath} from '../../geometry';
import {geotools} from '@here/xyz-maps-common';
import {getDirection, isPedestrianOnly} from './utils';
import TurnRestriction from './TurnRestriction';
import Overlay from '../../features/Overlay';
import {Feature} from '@here/xyz-maps-core';


enum DIRECTION {
    BOTH = 'BOTH',
    FROM_RN = 'START_TO_END',
    TO_RN = 'END_TO_START'
}

/**
 * The TurnRestrictionEditor allows to visualize and edit all TurnRestrictions of an intersection.
 */
export interface TurnRestrictionEditor {
    // /**
    //  * Get all related Navlink features of the intersection.
    //  */
    // getLinks(): Navlink[];

    /**
     *  Show all turn restrictions of the road intersection.
     */
    show();

    /**
     *  Hide all turn restrictions of the road intersection.
     */
    hide();

    /**
     *  Indicates if TurnRestrictionEditor are displayed and editing by user interaction is enabled.
     */
    isActive(): boolean;
}


class TrEditor implements TurnRestrictionEditor {
    private _l: Navlink;
    private _i: number;
    private _origin: Feature;
    private _overlay: Overlay;
    private _trs;

    constructor(navlink: Navlink, index: number) {
        const iEditor = navlink._e();

        this._overlay = iEditor.objects.overlay;
        this._trs = [];

        const hideOnOverlayClear = () => {
            this.hide();
            iEditor.listeners.remove('_clearOverlay', hideOnOverlayClear);
        };

        iEditor.listeners.bind('_clearOverlay', hideOnOverlayClear);

        this._l = navlink;
        this._i = index;

        this.show();
    }

    private _hideOrigin() {
        if (this._origin) {
            this._overlay.remove(this._origin);
        }
        this._origin = null;
    }

    private _showOrigin(link: Navlink, index: number) {
        const path = link.coord();
        const ii = index == 0 ? 1 : path.length - 2;
        const position = movePointOnPath(path[index], path[ii], .0001 /* 40*/);
        const feature = {
            geometry: {
                coordinates: position,
                type: 'Point'
            },
            type: 'Feature',
            properties: {
                type: 'TURN_RESTRICTION_START',
                rotation: -geotools.calcBearing(path[index], path[ii])
            }
        };
        this._origin = this._overlay.addFeature(feature);
    }

    show() {
        const link = this._l;
        const index = this._i;
        const direction = getDirection(link);
        const toDir = index == 0
            ? DIRECTION.FROM_RN
            : DIRECTION.TO_RN;

        if (direction != DIRECTION.BOTH && toDir == direction || isPedestrianOnly(link)) {
            return;
        }

        const cLinks = link.getConnectedLinks(index, true);

        if (cLinks.length) {
            this._showOrigin(link, index);
        }

        this._trs = cLinks.map((clink) => new TurnRestriction(
            link._e(), link, index, clink.link, clink.index, this._origin.geometry.coordinates
        ));
    }

    hide() {
        const restrictions = this._trs;

        for (const i in restrictions) {
            restrictions[i].hide();
            restrictions[i] = null;
        }
        restrictions.length = 0;

        this._hideOrigin();
    }

    isActive(): boolean {
        return this._trs.length > 0;
    }
}

export {TrEditor};
