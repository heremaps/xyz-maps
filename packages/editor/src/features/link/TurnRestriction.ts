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

import TurnRestrictionEditor from '../../tools/turnrestriction/Editor';
import {Navlink} from '@here/xyz-maps-editor';

/**
 * The TurnRestrictions represents all turn-restrictions of a road intersection.
 * It provides editing capabilities by user-interaction and offers a basic interface.
 */
export interface TurnRestrictions {
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
     *  Indicates if TurnRestrictions are displayed and editing by user interaction is enabled.
     */
    isActive(): boolean;
}

class TurnRestriction implements TurnRestrictions {
    private _e: TurnRestrictionEditor;
    private _l: Navlink;
    private _i: number;

    constructor(internal: TurnRestrictionEditor, navlink: Navlink, index: number) {
        this._e = internal;
        this._l = navlink;
        this._i = index;
    }

    show() {
        this._e.showRestrictions(this._l, this._i);
    }

    // getLinks() {
    //     return this._l.getConnectedLinks(this._i);
    // }

    hide() {
        return this._e.hideRestrictions();
    }

    isActive(): boolean {
        return this._e.isActive();
    }
}

export {TurnRestriction};
