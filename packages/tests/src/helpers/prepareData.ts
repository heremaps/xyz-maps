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
// @ts-ignore
import environments from 'environments';
// @ts-ignore
import credentials from 'credentials';
// // @ts-ignore
// import environment from 'environment';
import {providers, layers as mLayers} from '@here/xyz-maps-core';
import {TestProvider} from '../TestProvider';
import {spacePool} from '../runner';


const TOKEN = credentials.access_token;

const IMAGEURL = environments.image;
const GEOJSONURL = environments.xyzhub + '/spaces/{SPACEID}/tile/quadkey/{QUADKEY}?margin=20&clip=false&access_token=' + TOKEN;
const XYZHUBURL = environments.xyzhub + '/spaces';


const existingProviders = ['ProProvider', 'RemoteTileProvider', 'SpaceProvider', 'GeoJSONProvider', 'ImageProvider', 'MVTProvider', 'LocalProvider', 'FeatureProvider', 'EditableProvider'];


function spaceTypes(type: string) : boolean {
    return type == 'SpaceProvider' || type == 'GeoJSONProvider' || existingProviders.indexOf(type) < 0;
}

async function prepareProviderConfig(config, ts) {
    let providerConfig = Object.assign({}, config);
    let spaceId;

    if (config.type == 'ImageProvider') {
        providerConfig.url = providerConfig.url || function(z, x, y, quad) {
            return IMAGEURL.replace('{LOCALHOST}', location.protocol + '//' + location.host).replace('{QUADKEY}', quad.charAt(quad.length-1));
        };
    } else if (spaceTypes(config.type)) {
        spaceId = await spacePool.get(ts);
        if (config.type == 'GeoJSONProvider') {
            providerConfig.url = providerConfig.url || GEOJSONURL.replace('{SPACEID}', spaceId);
        } else {
            providerConfig.url = providerConfig.url || XYZHUBURL;
            providerConfig.credentials = providerConfig.credentials || {
                access_token: TOKEN
            };
            providerConfig.space = spaceId;
            if (providerConfig.url.indexOf('localhost') > 0) {
                providerConfig.https = false;
            }
        }
    }
    return {providerConfig, spaceId};
};


function updateRoutingPoint(dataset, submitted): Promise<{[key: string]: object[]}> {
    let xhrs = [];
    let layers = [];

    for (let layer in dataset) {
        let features = dataset[layer].data;
        let provider = dataset[layer].provider;

        xhrs.push(new Promise((resolve, reject)=>{
            provider.commit({'put': features}, (e)=>{
                resolve(e.inserted);
            }, reject);
        }));
        layers.push(layer);
    }
    return new Promise(async function(resolve) {
        let res = await Promise.all(xhrs);
        let response = {};
        for (let i in res) {
            response[layers[i]] = res[i];
        }
        resolve(response);
    });
}

function prepareFeatures(dataset): Promise<{[key: string]: object[]}> {
    let xhrs = [];
    let layers = [];

    for (let layer in dataset) {
        let features = dataset[layer].data;
        let provider = dataset[layer].provider;

        if (features.length) {
            xhrs.push(new Promise((resolve, reject)=>{
                provider.commit({'put': features}, (e)=>{
                    resolve(e.inserted);
                }, reject);
            }));
            layers.push(layer);
        }
    }
    return new Promise(async function(resolve) {
        let res = await Promise.all(xhrs);
        let response = {};
        for (let i in res) {
            response[layers[i]] = res[i];
        }
        resolve(response);
    });
};


export async function prepare(dataset) {
    let preparedData = new PreparedData();

    let featuresToCommit= {};
    let featuresToUpdateRP= {};
    let linkLayerId;

    if (dataset && dataset.layers) {
        let ts = (new Date()).getTime().toString();
        for (let l of dataset.layers) {
            const providerType = l.provider.type;
            const layerId = l.id;

            let preparedConfig = await prepareProviderConfig(l.provider, ts);
            let provider = TestProvider.name == providerType ? new TestProvider(preparedConfig.providerConfig) : new providers[providerType](preparedConfig.providerConfig);

            let layerConfig = Object.assign({}, l);
            layerConfig['provider'] = provider;
            delete layerConfig['data'];
            delete layerConfig['clear'];

            let layer = new mLayers.TileLayer(layerConfig);

            preparedData.addLayer(layer);

            preparedData.setProvider(layerId, provider, preparedConfig.spaceId);

            if (l.data && l.data.remote) {
                // data to commit
                featuresToCommit[layerId] = {
                    'data': l.data.remote,
                    'provider': provider
                };
                featuresToUpdateRP[layerId] = {
                    'data': [],
                    'provider': provider
                };

                featuresToCommit[layerId]['data'].forEach((feature, idx) => {
                    let prop = feature.properties;
                    let NSXYZ = '@ns:com:here:xyz';

                    if (!prop[NSXYZ]) prop[NSXYZ] = {};

                    if (!Array.isArray(prop[NSXYZ].tags)) prop[NSXYZ].tags = [];

                    prop[NSXYZ].tags.push(spacePool.getTag());

                    // find out which is the link layer
                    if (prop.featureClass == 'NAVLINK') {
                        linkLayerId = layerId;
                    }
                    // if the id type is string, take it as temperary id
                    // in SpaceProvider and all its decendant providers all ids are temperary
                    if (typeof feature.id == 'string' || (feature.id && spaceTypes(providerType))) {
                        preparedData.addIdMap(layerId, feature.id, idx);
                        delete feature.id;
                    }
                    // identify which Point need to update its link id for routing point
                    if ((prop.featureClass == 'ADDRESS' || prop.featureClass == 'PLACE') && prop.routingLink) {
                        let clone = JSON.parse(JSON.stringify(feature));
                        // save idx as feature.id, which will be replace by real feature id
                        clone.id = idx;
                        featuresToUpdateRP[layerId].data.push(clone);
                    }
                });
            }

            if (providerType != 'ImageProvider' && l.data && l.data.local) {
                let features = {};
                features[layerId] = provider.addFeature(l.data.local);
                preparedData.addFeature(features, 'local');
            }
        }
    }

    // commit feature
    let features = await prepareFeatures(featuresToCommit);

    preparedData.addFeature(features, 'remote');

    // check and submit if there is point features(Address, Place) connects to link
    for (let layerId in featuresToUpdateRP) {
        let data = featuresToUpdateRP[layerId].data;
        let index = data.length - 1;
        while (index >=0) {
            let feature = data[index];
            let linkId = preparedData.getId(linkLayerId, feature.properties.routingLink);

            // link to which the point connects is also created
            if ( linkId != feature.properties.routingLink ) {
                feature.properties.routingLink = linkId;
                // feature.id is the idx of the feature
                feature.id = features[layerId][feature.id];
            } else {
                data.splice(index, 1);
            }
            index--;
        }
    }

    // update features for routing point
    await prepareFeatures(featuresToUpdateRP);

    return preparedData;
}


class PreparedData {
    private layers: mLayers.TileLayer[] = [];
    // {
    //     "layerId1": {
    //         "remote": [
    //             {feature1: {}},
    //             {feature2: {}}
    //         ],
    //         "local": [

    //         ]
    //     },
    //     "layerId2": {
    //         "remote": [],
    //         "local": []
    //     }
    // }
    private features: {[key: string]: {}} = {};

    private _provider: {[key: string]: {provider: {type: string}, spaceId: string}} = {};

    private _idMap: {[key: string]: {}} = {};

    addIdMap(layerId, tempId, idx) {
        if (!this._idMap[layerId]) {
            this._idMap[layerId] = {};
        }

        this._idMap[layerId][tempId] = idx;
    }


    // provider has all information to revert features clearFeatures.
    setProvider(layerId, provider, spaceId) {
        this._provider[layerId] = {provider, spaceId};
    }

    addLayer(layer: mLayers.TileLayer) {
        this.layers.push(layer);
    };

    addFeature(features: {[key: string]: object[]}, location: string): void {
        for (let layer in features) {
            this.features[layer] = {};
            this.features[layer][location] = features[layer];
        }
    };

    getLayers(id?: string): mLayers.TileLayer|mLayers.TileLayer[] {
        if (id) {
            let layer;
            this.layers.forEach((l)=>{
                if (id == l.id) {
                    layer = l;
                    return;
                }
            });
            return layer;
        }
        return this.layers;
    };

    getId(layerId: string, id: string): string {
        if (this._idMap[layerId] && this._idMap[layerId].hasOwnProperty(id)) {
            let idx = this._idMap[layerId][id];
            id = this.features[layerId]['remote'][idx];
        }

        return id;
    }

    getFeature(layerId: string, id: string) {
        let layer = this.getLayers(layerId);

        id = this.getId(layerId, id);

        if (!Array.isArray(layer)) {
            let provider = layer.getProvider();
            if ( provider instanceof providers.FeatureProvider) {
                return provider.getFeatures(id);
            }
        }
    };

    getFeatures(layerId?: string, location?: string) {
        if (layerId || location) {
            // search for features comitted by default
            location = location || 'remote';

            let features = {};
            if (location == 'remote' || location == 'local') {
                for (let l in this.features) {
                    features[l] = this.features[l][location];
                }
            } else {
                features = this.features;
            }

            if (layerId) {
                return features[layerId];
            } else {
                return features;
            }
        }

        return this.features;
    };

    async clear() {
        // Give space back to spacePool
        for (let layerId in this._provider) {
            if (spaceTypes(this._provider[layerId].provider.type)) {
                await spacePool.giveBack(this._provider[layerId].spaceId);
            }
        }
    };
}


