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

import {movePointOnPath} from '../../geometry';
import TurnRestriction from './TurnRestriction';
import {getDirection, isPedestrianOnly} from './utils';
import {geotools} from '@here/xyz-maps-common';
import Navlink from '../../features/link/NavLink';

const DIRECTION_BOTH = 'BOTH';
const DIRECTION_FROM_RN = 'START_TO_END';
const DIRECTION_TO_RN = 'END_TO_START';

class TurnRestrictionEditor {
    private car;
    private editor;
    private overlay;
    private trs;


    constructor(internalEditor) {
        this.editor = internalEditor;
        this.overlay = internalEditor.objects.overlay;
        this.trs = [];

        internalEditor.listeners.bind('_clearOverlay', () => this.hideRestrictions());
    }

    hideCar() {
        if (this.car) {
            this.overlay.remove(this.car);
        }
        this.car = null;
    }

    showCar(link: Navlink, index: number) {
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
        this.car = this.overlay.addFeature(feature);
    }

    showRestrictions(link: Navlink, index: number) {
        const direction = getDirection(link);
        const toDir = index == 0
            ? DIRECTION_FROM_RN
            : DIRECTION_TO_RN;

        if (direction != DIRECTION_BOTH && toDir == direction || isPedestrianOnly(link)) {
            return;
        }

        const cLinks = link.getConnectedLinks(index, true);

        if (cLinks.length) {
            this.showCar(link, index);
        }

        this.trs = cLinks.map((clink) => new TurnRestriction(
            this.editor, link, index, clink.link, clink.index, this.car.geometry.coordinates
        ));
    }

    hideRestrictions() {
        const restrictions = this.trs;

        for (const i in restrictions) {
            restrictions[i].hide();
            restrictions[i] = null;
        }
        restrictions.length = 0;

        this.hideCar();
    }

    isActive(): boolean {
        return this.trs.length > 0;
    }
}

export default TurnRestrictionEditor;
