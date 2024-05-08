/*
 * Copyright (C) 2019-2024 HERE Europe B.V.
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
import {ClusterFeature} from '../../features/ClusterFeature';
import {LocalProvider, LocalProviderOptions} from '../LocalProvider';
import {Feature} from '../../features/Feature';
import {GeoJSONBBox, GeoJSONFeature} from '../../features/GeoJSON';

export type GeoJSONPointFeature = GeoJSONFeature<'Point'>;

export class ClusterProvider extends LocalProvider {
    private f2c: Map<GeoJSONPointFeature, ClusterFeature>;

    constructor(options: LocalProviderOptions) {
        super(options);
        this.Feature = ClusterFeature;
        this.f2c = new Map<GeoJSONPointFeature, ClusterFeature>();
    }

    all(): ClusterFeature[] {
        return this.tree.all() as ClusterFeature[];
    }

    getFeatureClass(feature) {
        return feature.properties.clusterSize ? ClusterFeature : Feature;
    }

    clear(bbox: GeoJSONBBox) {
        const tiles = super.clear(bbox);
        if (bbox) {
            for (let {data} of tiles) {
                for (let feature of data) {
                    this.f2c.delete(feature);
                }
            }
        } else {
            this.f2c.clear();
        }
    }

    setMargin(tileMargin: number = 0) {
        if (this.margin < tileMargin) {
            super.setMargin(tileMargin);
        }
    }

    addCluster(feature: ClusterFeature) {
        this.tree.insert(feature);
        return feature;
    }

    hasCluster(feature: GeoJSONPointFeature) {
        return this.f2c.has(feature);
    }

    getCluster(feature: GeoJSONPointFeature): ClusterFeature {
        return this.f2c.get(feature);
    }

    setCluster(feature: GeoJSONPointFeature, cluster: ClusterFeature) {
        return this.f2c.set(feature, cluster);
    }

    removeFromCluster(feature) {
        return this.f2c.delete(feature);
    }

    removeCluster(feature: GeoJSONPointFeature) {
        this.tree.remove(feature);
        return feature;
    }
};
