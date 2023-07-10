/*
 * Copyright (C) 2019-2023 HERE Europe B.V.
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

import {FlexAttribute} from './TemplateBuffer';
import {FlexArray} from './FlexArray';
import {PointBuffer} from './PointBuffer';
import {addPoint} from '../addPoint';
import {LinearGradient} from '@here/xyz-maps-core';

export const DEFAULT_HEATMAP_GRADIENT: LinearGradient = {
    type: 'LinearGradient',
    stops: {
        1.0: 'white',
        0.9: '#FCFBAE',
        0.8: '#FAD932',
        0.7: '#F26C19',
        0.5: '#C41D6F',
        0.3: '#70009C',
        0.0: 'rgba(30,0,115,0)'
    }
};


export class HeatmapBuffer extends PointBuffer {
    flexAttributes: {
        'a_position': FlexAttribute,
        'a_weight': FlexAttribute,
    };

    constructor(flat?: boolean) {
        super(true);
        this.flexAttributes.a_weight = {
            data: new FlexArray(Float32Array),
            size: 1
        };
    }

    addPoint(x: number, y: number, weight: number = 1.0) {
        const {flexAttributes} = this;

        addPoint(x, y, undefined, flexAttributes.a_position.data);
        // 2 triangles, 3 points each
        flexAttributes.a_weight.data.push(weight, weight, weight, weight, weight, weight);
    }
}
