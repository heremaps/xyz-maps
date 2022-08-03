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

import MVTTileLoader from '../../loaders/MVT/MVTWorkerLoader';
import {Feature} from '../../features/Feature';
import {GeoJSONGeometryType} from '../../features/GeoJSON';

import mvtToGeoJSON from './toGeojson';
import {JSUtils, Queue} from '@here/xyz-maps-common';

import {MVTTile} from './MVTTile';
import {RemoteTileProvider} from '../RemoteTileProvider/RemoteTileProvider';
import {HTTPLoader} from '../../loaders/HTTPLoader'; // => no global tree (tile-tree)!
// import GeoJsonProvider from '../GeoJSONProvider'; // global tree!


class MvtFeature extends Feature {
    geometry: { type: GeoJSONGeometryType, coordinates: any[], __xyz: any };

    getMvtLayer() {
        return this.geometry.__xyz.l;
    }
}


export class MVTProvider extends RemoteTileProvider {
    private c = null; // cached copyright data

    clipped = true;
    tree = null;
    url: string | ((z: number, y: number, x: number, quadkey: string) => string);

    constructor(config) {
        super(JSUtils.extend({
            'loader': config.loader || new MVTTileLoader(config),
            'margin': 0,
            'Tile': MVTTile,
            'Feature': MvtFeature,
            'preProcessor': mvtToGeoJSON
        }, config));
    };

    decCoord(feature) {
        return feature.geometry._coordinates();
    }

    getCopyright(cb) {
        let prov = this;
        let url = prov.url;

        if (typeof url == 'function') {
            url = url(0, 0, 0, '');
        }

        let xyz = url?.match && url.match(/.*xyz+.*here\.com\/tiles\/[a-zA-Z]+[\.\d]*\//);
        let cdata = prov.c;

        if (cb) {
            if (cdata == null) {
                if (xyz) {
                    cdata = new Queue();
                    cdata.add(cb);
                    prov.c = cdata;
                    const httpLoader: HTTPLoader = prov.getLoader().src[0];

                    httpLoader.send({
                        url: xyz + 'copyright',
                        responseType: 'json',
                        success: (c) => {
                            prov.c = c;
                            cdata.done(c);
                        }
                    });
                } else {
                    cb(prov.c = []);
                }
            } else if (cdata instanceof Queue) {
                cdata.add(cb);
            } else {
                cb(cdata);
            }
        }
    }
}
