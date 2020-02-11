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

// TODO: remove namespaces
import * as geo from './geo/geo';
import * as pixel from './pixel/pixel';
import * as layers from './layers/layers';
import * as tile from './tile/ns';
import * as providers from './providers/providers';
import * as features from './features/features';
import * as GeoJSON from './data/prepare/GeoJSON';
import * as common from '@here/xyz-maps-common';

import L2Storage from './storage/Level2Storage';
import LRUStorage from './storage/LRUStorage';
import webMercator from './projection/webMercator';
import {HTTPLoader} from './loaders/HTTPLoader';
import Manager from './loaders/Manager';
import GeoCoder from './service/GeoCoder';

// @ts-ignore
import buildInfo from 'buildInfo';


// WORKAROUND IF BUNDELED BY WEBPACK (UMD REMOVAL)
// make sure global ns is also available for webpack users.
const XYZMAPS = common.global.here.xyz.maps;
XYZMAPS.common = common;
XYZMAPS.geo = geo;
XYZMAPS.tile = tile;
XYZMAPS.layers = layers;
XYZMAPS.features = features;
XYZMAPS.providers = providers;


export {geo, pixel, tile, layers, features, providers};

export const storage = XYZMAPS.storage = {
    'Level2Storage': L2Storage,
    'LRUStorage': LRUStorage
};

export const projection = XYZMAPS.projection = {
    'webMercator': webMercator
};


export const loaders = XYZMAPS.loaders = {
    'HTTPLoader': HTTPLoader,
    'Manager': Manager
};


export const service = XYZMAPS.service || {
    'Geocoder': GeoCoder
};


export const data = XYZMAPS.data || {
    'prepare': {
        'GeoJSON': GeoJSON
    }
};


/**
 *    Contains build information {"name", "date", "revision", "version"}.
 *
 *    @public
 *    @expose
 *    @readonly
 *    @name here.xyz.maps.build
 *    @type Object
 */
export const build = XYZMAPS.build = {
    name: 'xyz-maps',
    ...buildInfo
};

export default {
    tile,
    layers,
    geo,
    pixel,
    features,
    storage,
    providers,
    projection,
    loaders,
    service,
    data,
    build,
    common
};

