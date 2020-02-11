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

import MVTTileLoader from '../../loaders/MVT/MVTWorkerLoader';
// import MVTTileLoader from '../../loaders/MVTTileLoader';
import {Feature} from '../../features/Feature';
import {GeoJSONGeometryType} from '../../features/GeoJSON';

import mvtToGeoJSON from './toGeojson';
import {JSUtils, Queue} from '@here/xyz-maps-common';

import {Tile} from '../../tile/Tile';
import {RemoteTileProvider} from '../RemoteTileProvider/RemoteTileProvider'; // => no global tree (tile-tree)!
// import GeoJsonProvider from '../GeoJSONProvider'; // global tree!


class MvtFeature extends Feature {
    geometry: { type: GeoJSONGeometryType, coordinates: any[], __xyz: any };

    getMvtLayer() {
        return this.geometry.__xyz.l;
    }
}


class MVTTile extends Tile {
    private s: number;

    constructor(quadkey: string, type: string, expire: number) {
        super(quadkey, type, expire);

        this.s = (1 << this.z);
    }

    lon2x(x: number, width: number = 256) {
        // const size = 1 << this.z;
        // const tileX = this.x / size;
        // return (x-tileX) * 512 * size;
        return Math.round((x * this.s - this.x) * width);

        // if(x==0.25)console.log(x,'->',_x,this.x);
    }

    lat2y(y: number, height: number = 256) {
        // const size = 1 << this.z;
        // const tileY = this.y / size;
        // return (y - tileY) * 512 * size;
        return Math.round((y * this.s - this.y) * height);
    }

    isInside(point) {
        return true;
    }
}

export class MVTProvider extends RemoteTileProvider {
    private c = null; // cached copyright data

    clipped = true;
    tree = null;
    url: string;

    constructor(config) {
        super(JSUtils.extend({
            'loader': config.loader || new MVTTileLoader(config),
            'margin': 0,
            'Tile': MVTTile,
            'Feature': MvtFeature
        }, config),
        mvtToGeoJSON
        );
    };

    decCoord(feature) {
        return feature.geometry._coordinates();
    }

    getCopyright(cb) {
        let prov = this;
        let url = prov.url;
        let xyz = url.match(/.*xyz+.*here\.com\/tiles\/[a-zA-Z]+[\.\d]*\//);
        let cdata = prov.c;

        if (cb) {
            if (cdata == null) {
                if (xyz) {
                    cdata = new Queue();
                    cdata.add(cb);
                    prov.c = cdata;

                    prov.getLoader().src[0].send({
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
};
