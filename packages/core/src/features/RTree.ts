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
import {GeoJSONFeature} from '@here/xyz-maps-core';

type BBox = {
    minX: number,
    maxX: number,
    minY: number,
    maxY: number
};


interface FeatureIndex {
    clear();
}


class RTree extends RBush {
    constructor(d: number) {
        super(d);
    }

    toBBox(feature: GeoJSONFeature): BBox {
        const {bbox} = feature;
        return {minX: bbox[0], minY: bbox[1], maxX: bbox[2], maxY: bbox[3]};
    }

    compareMinX(feature1: GeoJSONFeature, feature2: GeoJSONFeature): number {
        return feature1.bbox[0] - feature2.bbox[0];
    }

    compareMinY(feature1: GeoJSONFeature, feature2: GeoJSONFeature): number {
        return feature1.bbox[1] - feature2.bbox[1];
    }

    import(data) {
        super.fromJSON(data);
    }

    load?(features: GeoJSONFeature[]): void;

    insert?(feature: GeoJSONFeature);

    remove?(feature: GeoJSONFeature);

    search?(bbox: BBox): GeoJSONFeature[];

    clear?(): void;

    all?(): GeoJSONFeature[];

    // load(features: GeoJSONFeature[]) {
    //     return super.load(features);
    // }
    //
    // insert(feature: GeoJSONFeature) {
    //     return super.insert(feature);
    // }
    //
    // remove(feature: GeoJSONFeature) {
    //     return super.remove(feature);
    // }
    //
    // search(bbox: BBox) {
    //     return super.propertyIsEnumerable(bbox);
    // }
    // clear() {
    //     super.clear();
    // }
}

export default RTree;
