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

import {getPntAt} from '../geometry';
import {geotools} from '@here/xyz-maps-common';
import Overlay from '../features/Overlay';
import NavLink from '../features/link/NavLink';
import Line from '../features/line/Line';
import Feature from '../features/feature/Feature';

const NAVLINK_DIRECTION_HINT = 'NAVLINK_DIRECTION_HINT_';
const NAVLINK_DIRECTION_HINT_A = NAVLINK_DIRECTION_HINT + 'A';
const NAVLINK_DIRECTION_HINT_B = NAVLINK_DIRECTION_HINT + 'B';
const NAVLINK_DIRECTION_HINT_1WAY = NAVLINK_DIRECTION_HINT + '1WAY';
const NAVLINK_DIRECTION_HINT_2WAY = NAVLINK_DIRECTION_HINT + '2WAY';
const NAVLINK_DIRECTION_HINT_BLOCKED = NAVLINK_DIRECTION_HINT + 'BLOCKED';

class LinkDirectionHint {
    private points: Feature[];
    private overlay: Overlay;

    constructor(overlay: Overlay, link: NavLink | Line, dir: string, hideShapes?: boolean) {
        const path = link.coord();
        const rotation = dir == 'END_TO_START' ? 180 : 0;
        const points = [];

        if (!hideShapes) {
            points.push(
                overlay.addPoint(path[0].slice(), {
                    type: NAVLINK_DIRECTION_HINT_A
                }),
                overlay.addPoint(path[path.length - 1].slice(), {
                    type: NAVLINK_DIRECTION_HINT_B
                })
            );
        }

        for (let i = 0; i < path.length - 1; i++) {
            const p1 = path[i];
            const p2 = path[i + 1];
            const props = {
                'type': dir == 'BLOCKED'
                    ? NAVLINK_DIRECTION_HINT_BLOCKED :
                    dir == 'BOTH'
                        ? NAVLINK_DIRECTION_HINT_2WAY
                        : NAVLINK_DIRECTION_HINT_1WAY
            };

            if (dir != 'BLOCKED') {
                props['bearing'] = rotation - geotools.calcBearing(p1, p2);
            }

            points.push(
                overlay.addPoint(
                    getPntAt(p1, p2, .5),
                    props
                )
            );
        }

        this.overlay = overlay;
        this.points = points;
    }

    destroy() {
        this.overlay.remove(this.points);
        this.points = null;
    }
}

export default LinkDirectionHint;
