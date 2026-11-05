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

import RBush from 'rbush';
import {GeoJSONFeature} from './GeoJSON';

type BBox = {
    minX: number,
    maxX: number,
    minY: number,
    maxY: number
};


interface FeatureIndex {
    clear();
}


class RTree {
    private _tree: RBush;

    constructor(d: number) {
        const tree = new RBush(d);
        tree.toBBox = (feature: GeoJSONFeature): BBox => {
            const bbox = feature.bbox;
            return {minX: bbox[0], minY: bbox[1], maxX: bbox[2], maxY: bbox[3]};
        };
        tree.compareMinX = (feature1: GeoJSONFeature, feature2: GeoJSONFeature): number => {
            return feature1.bbox[0] - feature2.bbox[0];
        };
        tree.compareMinY = (feature1: GeoJSONFeature, feature2: GeoJSONFeature): number => {
            return feature1.bbox[1] - feature2.bbox[1];
        };
        this._tree = tree;
    }

    import(data) {
        this._tree.fromJSON(data);
    }

    load(features: GeoJSONFeature[]): this {
        this._tree.load(features);
        return this;
    }

    insert(feature: GeoJSONFeature): this {
        this._tree.insert(feature);
        return this;
    }

    remove(feature: GeoJSONFeature, equals?: (a: GeoJSONFeature, b: GeoJSONFeature) => boolean): this {
        this._tree.remove(feature, equals);
        return this;
    }

    search(bbox: BBox): GeoJSONFeature[] {
        return this._tree.search(bbox);
    }

    collides(bbox: BBox): boolean {
        return this._tree.collides(bbox);
    }

    clear(): this {
        this._tree.clear();
        return this;
    }

    all(): GeoJSONFeature[] {
        return this._tree.all();
    }

    toJSON() {
        return this._tree.toJSON();
    }

    fromJSON(data): this {
        this._tree.fromJSON(data);
        return this;
    }
}

export default RTree;
