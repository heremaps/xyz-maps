/*
 * Copyright (C) 2019-2022 HERE Europe B.V.
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

import {LineShape} from './LineShape';
import LineTools, {Coordinate} from './LineTools';

let lineTools: typeof LineTools;

class VirtualShape extends LineShape {
    constructor(line, coordinate, lineStringIndex: number, index: number, zLayer: number, lTools: typeof LineTools) {
        lineTools = lTools;
        super(line, coordinate, lineStringIndex, index, zLayer, lTools);
    }

    pointerdown(ev) {
        super.pointerdown(ev);
    }

    pressmove(ev, dx, dy) {
        const {properties} = this;
        const shape = this;
        const line = shape.getLine();

        if (!properties.moved) {
            properties.index++;
            lineTools.addCoord(
                line,
                <Coordinate>shape.geometry.coordinates.slice(),
                properties.index,
                properties.lineStringIndex
            );
            lineTools.removeShapes(line, 'vShps', shape);
        }

        super.pressmove(ev, dx, dy);
    }

    pointerup(ev) {
        this.getProvider().removeFeature(this);
        super.pointerup(ev);
    }
}

VirtualShape.prototype.class = 'LINE_VIRTUAL_SHAPE';

export default VirtualShape;
