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

import {Feature} from '../features/Feature';
import {StyleGroup, StyleGroupMap} from '../styles/LayerStyle';

function mixin(to, from) {
    for (const f in from) {
        to[f] = from[f];
    }
    return to;
}

const EMPTY_STYLE = [];

let UNDEF;


class LayerStyleImpl {
    styleGroups = null;
    private _c: StyleGroupMap = null;

    constructor(styleCfg, customStyles?: StyleGroupMap) {
        const layerStyle = this;
        const deepCopy = (from, to?) => {
            if (typeof from !== 'object' || from === null) {
                return from;
            }
            to = to || (Array.isArray(from) ? [] : {});
            for (let key in from) {
                to[key] = deepCopy(from[key]);
            }
            return to;
        };
        for (let name in styleCfg) {
            this[name] = name == 'styleGroups'
                ? deepCopy(styleCfg.styleGroups, {})
                : styleCfg[name];
        }
        // custom styles
        layerStyle._c = customStyles || {};
        // layerStyle._l = layer;
    }

    // default: simple assignment based on geometryType.
    assign(feature: Feature, level?: number) {
        return feature.geometry.type;
    };

    // get : function( feature, level )
    // {
    //     return this.styleGroups[
    //         this.assign( feature, level )
    //     ];
    // },


    getStyleGroup(feature: Feature, level?: number, getDefault?: boolean) {
        let style = this._c[feature.id];
        if (style == UNDEF || getDefault) {
            (<{}>style) = this.assign(feature, level);

            if (typeof style != 'object') {
                style = this.styleGroups[style];
            }
        }
        return style;
    };

    setStyleGroup(feature: Feature, group: StyleGroup | false | null, merge?: boolean) {
        const id = feature.id;
        const custom = this._c;

        if (
            group && (merge /* || merge == UNDEF*/)
        ) {
            group = this.merge(this.getStyleGroup(feature), group);
        }

        if (group) {
            custom[id] = group;
        } else {
            if (group === null || group === false) {
                group = custom[id] = EMPTY_STYLE;
            } else if (custom[id]) {
                delete custom[id];
            }
        }

        return group;

        // if( layer = this._l )
        // {
        //     layer._l.trigger( 'style', [ feature, group, layer ], true );
        // }
    };

    merge(grp1: StyleGroup, grp2: StyleGroup | false) {
        if (grp2 === null || grp2 === false) {
            return null;
        }

        const mergedGroups = [];
        let group;

        for (let i = 0, len = grp1.length; i < len; i++) {
            group = mixin({}, grp1[i]);

            if (grp2[i]) {
                mixin(group, grp2[i]);
            }

            mergedGroups[i] = group;
        }

        return mergedGroups;
    }
}

export default LayerStyleImpl;
