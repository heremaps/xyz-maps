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

import RBush from 'rbush/rbush.min.js';
import {Feature} from './Feature';

class RTree extends RBush {
    constructor(d:number) {
        super(d);
    }

    toBBox(feature: Feature) {
        const {bbox} = feature;
        return {minX: bbox[0], minY: bbox[1], maxX: bbox[2], maxY: bbox[3]};
    }

    compareMinX(feature1: Feature, feature2: Feature): number {
        return feature1.bbox[0] - feature2.bbox[0];
    }

    compareMinY(feature1: Feature, feature2: Feature): number {
        return feature1.bbox[1] - feature2.bbox[1];
    }
}

export default RTree;
