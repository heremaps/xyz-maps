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

function mixin(to, from) {
    for (const f in from) {
        to[f] = from[f];
    }
    return to;
}

class WikiStyles {
    STATE_SELECTED = 'selected';
    STATE_HOVERED = 'hovered';
    STATE_MODIFIED = 'modified';
    STATE_REMOVED = 'removed';
    STATE_SPLIT = 'split';
    STATE_CREATED = 'created';

    mergeStyles(grp1, grp2) {
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
    };

    randomColor() {
        const letters = '0123456789ABCDEF'.split('');
        let color = '#';
        for (let i = 0; i < 6; i++) color += letters[Math.round(Math.random() * 15)];
        return color;
    };
}

export default WikiStyles;
