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

import {global, JSUtils} from '@here/xyz-maps-common';
import InternalEditor from '../IEditor';

const COORDINATES = 'coordinates';
const DBG_LEVEL_INFO = 'info';

const getEditStates = (o) => o.properties['@ns:com:here:editor'];
const isFeatureNew = (o) => !!getEditStates(o).created;
const isFeatureDeleted = (o) => !!getEditStates(o).removed;


class FeatureTransmitter {
    private iEdit: InternalEditor;
    private pIds = {}; // permanent id map

    private reserveIds(provider, layer, onSuccess, onError) {
        const {pIds} = this;
        const providerId = provider.id;
        const created = [];

        for (const id in layer) {
            if (isFeatureNew(layer[id])) {
                if (!pIds[providerId][id]) {
                    created.push(layer[id]);
                }
            }
        }

        if (created.length > 0) {
            provider.reserveId(created, (ids) => {
                for (const id in layer) {
                    const obj = layer[id];
                    if (isFeatureNew(obj) && !pIds[providerId][id]) {
                        pIds[providerId][id] = ids.shift();
                    }
                }
                onSuccess(pIds[providerId], providerId);
            },
            onError
            );
        } else {
            global.setTimeout(() => {
                onSuccess(pIds[providerId], providerId);
            }, 0);
        }
    };

    private replaceIds(moddedObjects, onSuccess, onError) {
        const {pIds, iEdit} = this;
        const ID = 'id';
        let obj;
        let newObject;
        let moddedObjsJSON;
        let layerCounter = 0;

        // USE JSONSTRING FOR EASY REGEX BASED ID REPLACEMENT
        moddedObjsJSON = JSON.stringify(moddedObjects);

        for (const layerId in moddedObjects) {
            layerCounter++;

            newObject = false;

            for (const id in moddedObjects[layerId]) {
                if (isFeatureNew(moddedObjects[layerId][id])) {
                    newObject = true;
                    break;
                }
            }

            if (!pIds[layerId]) {
                pIds[layerId] = {};
            }

            if (newObject) {
                iEdit.dump('REQUESTING PERMANENT IDs..', DBG_LEVEL_INFO);

                this.reserveIds(iEdit.getProviderById(layerId), moddedObjects[layerId],
                    (pIDs, layerId) => {
                        const JSON_PROP_PLACEHOLDER = '#' + JSUtils.String.random() + '#';
                        let pID;
                        let oID;
                        for (const id in pIDs) {
                            if (obj = moddedObjects[layerId][id]) {
                                pID = pIDs[id];
                                oID = obj[ID].replace(/(?=[.\\+*?[^\]$(){}\|])/g, '\\');

                                moddedObjsJSON = moddedObjsJSON
                                    .replace('"' + oID + '":{', JSON_PROP_PLACEHOLDER)
                                    // link property of poi/addr is defined as String value!
                                    .replace(new RegExp('"link":"' + oID + '"', 'g'), '"link":"' + pID + '"')

                                    .replace(new RegExp('"' + oID + '"|' + oID, 'g'),
                                        typeof pID == 'number'
                                            ? pID
                                            : '"' + pID + '"'
                                    )
                                    .replace(JSON_PROP_PLACEHOLDER, '"' + pID + '":{');

                                iEdit.dump(obj[ID] + ' -> ' + pID, DBG_LEVEL_INFO);
                            }
                        }

                        if (!--layerCounter) {
                            onSuccess(JSON.parse(moddedObjsJSON));
                        }
                    },
                    // onError
                    onError
                );
            } else {
                layerCounter--;
            }
        }

        !layerCounter && onSuccess(moddedObjects);
    }

    private send(mapObjects, onSuccess, onError, transactionId) {
        const {pIds, iEdit} = this;
        let providers = 0;

        function allProvidersReady() {
            if (!--providers) {
                onSuccess(JSUtils.clone(pIds));
            }
        }

        for (const layerId in mapObjects) {
            providers++;

            const provider = iEdit.getProviderById(layerId);
            const objMap = mapObjects[layerId];
            const put = [];
            const remove = [];
            let feature;

            for (const id in objMap) {
                feature = objMap[id];
                (isFeatureDeleted(feature) ? remove : put).push(feature);
            }

            const layerIdChangeMap = pIds[layerId];
            const reverseIdMap = {};

            for (const pId in layerIdChangeMap) {
                reverseIdMap[layerIdChangeMap[pId]] = pId;
            }

            if (put.length | remove.length) {
                provider.commit({
                    put: put,
                    remove: remove
                },
                allProvidersReady,

                (msg) => {
                    if (onError) {
                        onError(msg);
                    }
                },
                transactionId
                );
            } else {
                allProvidersReady();
            }
        }
    }

    constructor(iEdit: InternalEditor) {
        this.iEdit = iEdit;
    }

    submit(mapObjects, onSuccess, onError, transactionId: string = JSUtils.String.random()) {
        const {iEdit} = this;
        const reverseGeocoder = iEdit._config['services']['reverseGeocoder']['getISOCC'];
        let isoCCRequests = 0;

        iEdit.dump('COMMIT', transactionId, DBG_LEVEL_INFO);

        // funtion gets called if ISOCCs are ready or immediately if no objects need to be created
        const updateRepo = () => {
            this.replaceIds(
                mapObjects,
                (replacedObjects) => {
                    this.send(replacedObjects, onSuccess, onError, transactionId);
                },
                onError
            );
        };

        function getFirstPosition(coords) {
            if (coords) {
                return typeof coords[0] == 'number'
                    ? coords
                    : getFirstPosition(coords[0]);
            }
        }

        for (const layerId in mapObjects) {
            for (const id in mapObjects[layerId]) {
                const obj = mapObjects[layerId][id];
                const provider = iEdit.getProviderById(layerId);

                // only handle isocc for modded objects
                if (!isFeatureDeleted(obj)) {
                    if (reverseGeocoder) {
                        // else get isocc via reverse geocode and insert
                        if (!provider.isoCC(obj)) {
                            isoCCRequests++;

                            iEdit.dump(
                                obj.id,
                                '[' + provider.detectFeatureClass(obj) + '] MISSING ISOCC -> REVERSE GEOCODING..',
                                DBG_LEVEL_INFO
                            );

                            (((obj, firstCoord) => {
                                reverseGeocoder(firstCoord[0], firstCoord[1], (cc) => {
                                    if (cc) {
                                        provider.isoCC(obj, cc);
                                    }
                                    if (!--isoCCRequests) {
                                        updateRepo();
                                    }
                                });
                            }))(obj, getFirstPosition(obj['geometry'][COORDINATES]));
                        }
                    }
                } else if (isFeatureNew(obj)) {
                    // filter out newly created and removed objects -> no commit needed
                    delete mapObjects[layerId][id];
                }
            }
        }

        if (!isoCCRequests) {
            updateRepo();
        }
    };
}

export default FeatureTransmitter;
