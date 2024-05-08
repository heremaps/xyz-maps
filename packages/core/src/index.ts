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

export * from './pixel/PixelPoint';
export * from './pixel/PixelRect';
export * from './geo/GeoPoint';
export * from './geo/GeoRect';
export * from './layers/TileLayer';
export * from './styles/LayerStyle';
export * from './styles/BoxStyle';
export * from './styles/CircleStyle';
export * from './styles/ImageStyle';
export * from './styles/LineStyle';
export * from './styles/ModelStyle';
export * from './styles/PolygonStyle';
export * from './styles/RectStyle';
export * from './styles/SphereStyle';
export * from './styles/TextStyle';
export * from './styles/VerticalLineStyle';
export * from './styles/HeatmapStyle';
export * from './layers/MVTLayer';
export * from './layers/CustomLayer';
export * from './layers/Layer';
export * from './features/Feature';
export * from './tile/Tile';
export * from './service/GeoCoder';
export {tileUtils} from './tile/TileUtils';
export * from './features/GeoJSON';

export {ImageProvider} from './providers/ImageProvider';
export {GeoJSONProvider} from './providers/GeoJSONProvider';
export {FeatureProvider} from './providers/FeatureProvider';
export {LocalProvider, LocalProviderOptions} from './providers/LocalProvider';
export {RemoteTileProvider} from './providers/RemoteTileProvider/RemoteTileProvider';
export {RemoteTileProviderOptions} from './providers/RemoteTileProvider/RemoteTileProviderOptions';
export {EditableRemoteTileProvider} from './providers/RemoteTileProvider/EditableRemoteTileProvider';
export {EditableRemoteTileProviderOptions} from './providers/RemoteTileProvider/EditableRemoteTileProviderOptions';
export {HTTPProvider} from './providers/HTTPProvider/HTTPProvider';
export {HTTPProviderOptions} from './providers/HTTPProvider/HTTPProviderOptions';
export {SpaceProvider} from './providers/GeoSpace/SpaceProvider';
export {SpaceProviderOptions} from './providers/GeoSpace/SpaceOptions';
export {IMLProvider} from './providers/IMLProvider/IMLProvider';
export {IMLProviderOptions} from './providers/IMLProvider/IMLProviderOptions';
export {MVTProvider} from './providers/MVTProvider/MVTProvider';
export {EditableFeatureProvider} from './providers/EditableFeatureProvider';
export {MVTLayerOptions} from './layers/MVTLayerOptions';
export {TileLayerOptions} from './layers/TileLayerOptions';
export {ClusterTileLayer} from './layers/cluster/ClusterTileLayer';
export {ClusterTileLayerOptions} from './layers/cluster/ClusterTileLayerOptions';
export {ClusterFeature, ClusterFeatureProperties} from './features/ClusterFeature';

import webMercatorPrj from './projection/webMercator';

/**
 * WebMercator projection utilities.
 */
export const webMercator = webMercatorPrj;

// @ts-ignore
import buildInfo from 'buildInfo';


/**
 *  Detailed Information about the build.
 */
export const build: {
    /**
     * the name of the api
     */
    readonly name: string;
    /**
     * the date when the build was created
     */
    readonly date: number;

    /**
     * the git version used for the build.
     */
    readonly revision: string;
    /**
     * the version of the build.
     * uses: Semantic Versioning
     */
    readonly version: string;

} = {
    name: 'xyz-maps',
    ...buildInfo
};


import utils from './features/utils';
// private interface
export {utils};


// support for legacy deprecated namespace based API.
// TODO: remove namespaces / legacy API
import {GeoPoint} from './geo/GeoPoint';
import {GeoRect} from './geo/GeoRect';
import {PixelPoint} from './pixel/PixelPoint';
import {PixelRect} from './pixel/PixelRect';
import {TileLayer} from './layers/TileLayer';
import {MVTLayer} from './layers/MVTLayer';
import {CustomLayer} from './layers/CustomLayer';
import {ClusterTileLayer} from './layers/cluster/ClusterTileLayer';
import {Feature} from './features/Feature';
import {Tile} from './tile/Tile';
import {tileUtils} from './tile/TileUtils';
import {ImageProvider} from './providers/ImageProvider';
import {GeoJSONProvider} from './providers/GeoJSONProvider';
import {FeatureProvider} from './providers/FeatureProvider';
import {LocalProvider} from './providers/LocalProvider';
import {RemoteTileProvider} from './providers/RemoteTileProvider/RemoteTileProvider';
import {EditableRemoteTileProvider} from './providers/RemoteTileProvider/EditableRemoteTileProvider';
import {SpaceProvider} from './providers/GeoSpace/SpaceProvider';
import {IMLProvider} from './providers/IMLProvider/IMLProvider';
import {MVTProvider} from './providers/MVTProvider/MVTProvider';
import {EditableFeatureProvider} from './providers/EditableFeatureProvider';
import {HTTPLoader} from './loaders/HTTPLoader';
import Manager from './loaders/Manager';
import {GeoCoder} from './service/GeoCoder';
import * as common from '@here/xyz-maps-common';
// WORKAROUND IF BUNDELED BY WEBPACK (UMD REMOVAL)
// make sure global ns is also available for webpack users.
const XYZMAPS = common.global.here.xyz.maps;
XYZMAPS.common = common;

const geo = XYZMAPS.geo = {
    Point: GeoPoint,
    Rect: GeoRect
};
const pixel = XYZMAPS.pixel = {
    Point: PixelPoint,
    Rect: PixelRect
};

const layers = XYZMAPS.layers = {
    TileLayer,
    MVTLayer,
    CustomLayer,
    ClusterTileLayer
};

const features = XYZMAPS.features = {
    Feature: Feature
};

const tile = XYZMAPS.tile = {
    Tile: Tile,
    Utils: tileUtils
};

XYZMAPS.build = build;

const providers = XYZMAPS.providers = {
    ImageProvider,
    GeoJSONProvider,
    FeatureProvider,
    LocalProvider,
    RemoteTileProvider,
    EditableRemoteTileProvider,
    SpaceProvider,
    IMLProvider,
    MVTProvider,
    EditableFeatureProvider
};

export {pixel, tile, layers, features, providers};

export const projection = XYZMAPS.projection = {
    webMercator
};


export const loaders = XYZMAPS.loaders = {
    HTTPLoader,
    Manager
};

export const service = XYZMAPS.service || {
    Geocoder: GeoCoder
};

export default {
    tile,
    layers,
    geo,
    pixel,
    features,
    providers,
    projection,
    loaders,
    service,
    build,
    common
};

