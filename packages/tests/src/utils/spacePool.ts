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

const TOKEN = credentials.access_token;

const XYZHUBURL = environments.xyzhub + '/spaces';

function sendReq(method: string, url: string, header: object, payload: object, async?:boolean): Promise<{id}> {
    return new Promise(function(resolve, reject) {
        let request = new XMLHttpRequest();
        request.onreadystatechange = function() {
            if (request.readyState === 4) {
                try {
                    resolve(JSON.parse(request.response));
                } catch (e) {
                    resolve(request.response);
                }
            }
        };

        request.onerror = function(this: XMLHttpRequest, ev: ProgressEvent) {
            reject(ev);
        };

        request.open(method, url, true);

        for (let key in header) {
            request.setRequestHeader(key, header[key]);
        }

        request.send(JSON.stringify(payload));
    });
}

function deleteSpace(space) {
    let url = XYZHUBURL + '/' + space;
    let header = {
        'Authorization': 'Bearer ' + TOKEN
    };
    return sendReq('DELETE', url, header, {});
};

function createSpace(): Promise<{id}> {
    let url = XYZHUBURL;
    let header = {
        'Authorization': 'Bearer ' + TOKEN,
        'content-type': 'application/json'
    };
    let space = {
        'title': 'My Test Space',
        'description': 'Space for Maps API Test',
        'copyright': [{
            'label': 'HERE',
            'alt': 'HERE alt'
        }]
    };
    return sendReq('POST', url, header, space);
};

function removeFeatures(spaceId, tag) {
    let url = XYZHUBURL + '/' + spaceId + '/features?tags=' + tag;
    let header = {
        'Authorization': 'Bearer ' + TOKEN
    };
    return sendReq('DELETE', url, header, {});
};

function searchFeatures(spaceId, tag) {
    let url = XYZHUBURL + '/' + spaceId + '/search?tags=' + tag;
    let header = {
        'Authorization': 'Bearer ' + TOKEN
    };
    return sendReq('GET', url, header, {});
};

class SpaceLocalStorage {
    private key;

    constructor() {
        this.key = 'xyzmapstests';
    }

    get(ts): {id, available} {
        let spaceLocalStorage = JSON.parse(localStorage.getItem(this.key)) || {};
        for (let id in spaceLocalStorage) {
            let space = spaceLocalStorage[id];
            if (space.available != ts) {
                // retun this space because it's timeout
                let available = space.available;
                space.available = ts;
                localStorage.setItem(this.key, JSON.stringify(spaceLocalStorage));

                return {id, available};
            }
        }
    }

    put(id, available) {
        let spaceLocalStorage = JSON.parse(localStorage.getItem(this.key)) || {};

        spaceLocalStorage[id] = {
            available: available
        };
        localStorage.setItem(this.key, JSON.stringify(spaceLocalStorage));
    }

    clear(spaces) {
        let spaceLocalStorage = JSON.parse(localStorage.getItem(this.key));
        for (let id in spaces) {
            delete spaceLocalStorage[id];
        }
        localStorage.setItem(this.key, JSON.stringify(spaceLocalStorage));
    }

    getAll() {
        return JSON.parse(localStorage.getItem(this.key));
    }
}

export default class SpacePool {
    private spaceLocalStorage: SpaceLocalStorage;
    private featureTag = 'PREPAREDFEATURE';

    constructor(opt?) {
        if (opt && opt.tag) {
            this.featureTag = this.featureTag || opt.tag;
        }
        this.spaceLocalStorage = new SpaceLocalStorage();
    }

    async get(ts: string) {
        // try to search in local storage
        let space = this.spaceLocalStorage.get(ts);
        if (space) {
            let brokenSpace;
            // need to clean the space if it is not returned to pool properly
            if (space.available != 'available') {
                let r = await removeFeatures(space.id, this.featureTag);
                // remove broken space from local storage if there were anything wrong

                if (r && r['error']) {
                    brokenSpace = {};
                    brokenSpace[space.id] = space;
                    this.spaceLocalStorage.clear(brokenSpace);
                }
            }

            if (!brokenSpace) {
                return space.id;
            }
        }

        // Create space if none of space in pool is available
        let newspace = await createSpace();

        this.spaceLocalStorage.put(newspace.id, ts);

        // Do a search in Space, workaround for issue in multiple search after creating space
        await searchFeatures(newspace.id, this.featureTag);

        return newspace.id;
    }

    async giveBack(spaceId: string) {
        this.spaceLocalStorage.put(spaceId, 'available');

        await removeFeatures(spaceId, this.featureTag);
    }

    clear(cb) {
        let proms = [];
        let allSpaces = this.spaceLocalStorage.getAll();
        for (let id in allSpaces) {
            let space = {};
            space[id] = null;
            this.spaceLocalStorage.clear(space);
            proms.push(deleteSpace(id));
        }
        Promise.all(proms).then((v) => {
            cb && cb();
        });
    }

    getSpaces() {
        return Object.keys(this.spaceLocalStorage.getAll());
    }

    getTag() {
        return this.featureTag;
    }
}
