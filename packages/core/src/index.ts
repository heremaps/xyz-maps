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
export type {DataSourceAttribution} from './layers/DataSourceAttribution';
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
export * from './styles/RuntimeLayerStyle';
// export * from './styles/XYZLayerStyle';
export * from './layers/MVTLayer';
export * from './layers/CustomLayer';
export * from './layers/Layer';
export * from './features/Feature';
export * from './tile/Tile';
export * from './service/GeoCoder';
export {tileUtils} from './tile/TileUtils';
export {triangulatePolygon} from './geometry/triangulatePolygon';
export * from './features/GeoJSON';

export {ImageProvider} from './providers/ImageProvider';
export type {ImageProviderOptions} from './providers/ImageProviderOptions';
export {GeoJSONProvider} from './providers/GeoJSONProvider';
export {default as TileProvider} from './providers/TileProvider/TileProvider';
export type {TileProviderOptions} from './providers/TileProvider/TileProviderOptions';
export {FeatureProvider} from './providers/FeatureProvider';
export {LocalProvider} from './providers/LocalProvider';
export type {LocalProviderOptions} from './providers/LocalProvider';
export {RemoteTileProvider} from './providers/RemoteTileProvider/RemoteTileProvider';
export type {
    RemoteTileProviderOptions,
    PreProcessorOptions,
    WorkerPreProcessorOptions,
    PreProcessorPipelineOptions,
    WorkerPreProcessorStageOptions,
    WorkerPreProcessorStage
} from './providers/RemoteTileProvider/RemoteTileProviderOptions';
export type {
    PreProcessor,
    WorkerPreProcessorFunction,
    WorkerPreProcessorInput,
    WorkerPreProcessorContext,
    WorkerPreProcessorUtils
} from './providers/RemoteTileProvider/processors';
export {EditableRemoteTileProvider} from './providers/RemoteTileProvider/EditableRemoteTileProvider';
export type {
    EditableRemoteTileProviderOptions
} from './providers/RemoteTileProvider/EditableRemoteTileProviderOptions';
export {HTTPProvider} from './providers/HTTPProvider/HTTPProvider';
export type {HTTPProviderOptions} from './providers/HTTPProvider/HTTPProviderOptions';
export {SpaceProvider} from './providers/GeoSpace/SpaceProvider';
export type {SpaceProviderOptions} from './providers/GeoSpace/SpaceOptions';
export {IMLProvider} from './providers/IMLProvider/IMLProvider';
export type {IMLProviderOptions} from './providers/IMLProvider/IMLProviderOptions';
export {MVTProvider} from './providers/MVTProvider/MVTProvider';
export {TerrainTileProvider} from './providers/TerrainProvider/TerrainTileProvider';
export {EditableFeatureProvider} from './providers/EditableFeatureProvider';
export type {LayerOptions} from './layers/LayerOptions';
export type {MVTLayerOptions} from './layers/MVTLayerOptions';
export type {TileLayerOptions, DataUnavailableFallback} from './layers/TileLayerOptions';
export {ClusterFeature} from './features/ClusterFeature';
export type {ClusterFeatureProperties} from './features/ClusterFeature';

import {ClusterTileLayer} from './layers/cluster/ClusterTileLayer';

export {ClusterTileLayer};
export type {ClusterTileLayerOptions} from './layers/cluster/ClusterTileLayerOptions';

import {TerrainTileFeature} from './features/TerrainFeature';

export {TerrainTileFeature};
import {TerrainTileLayer} from './layers/terrain/TerrainTileLayer';
import {TerrainTileLayerStyle} from './layers/terrain/TerrainStyle';

export {TerrainTileLayer, TerrainTileLayerStyle};
export type {TerrainTileLayerOptions} from './layers/terrain/TerrainTileLayerOptions';
export {RTINMeshBuilder} from './providers/TerrainProvider/RTINMeshBuilder';
export {ElevationQuadTree} from './providers/TerrainProvider/ElevationQuadTree';
export {TransferableCollector} from './loaders/webworker/TransferableCollector';

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
// import {ClusterTileLayer} from './layers/cluster/ClusterTileLayer';
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
import {TerrainTileProvider} from './providers/TerrainProvider/TerrainTileProvider';
import {EditableFeatureProvider} from './providers/EditableFeatureProvider';
import {HTTPLoader} from './loaders/HTTPLoader';
import TileLoaderManager from './loaders/TileLoaderManager';

export {HTTPLoader, TileLoaderManager};
import {GeoCoder} from './service/GeoCoder';
import * as common from '@here/xyz-maps-common';
// WORKAROUND IF BUNDELED BY WEBPACK (UMD REMOVAL)
// make sure global ns is also available for webpack users.
const XYZMAPS = common.global.here.xyz.maps;
XYZMAPS.common = common;

/**
 * @hidden
 * @public
 * @deprecated Use direct named exports from `@here/xyz-maps-core` instead of the geo namespace.
 */
const geo = XYZMAPS.geo = {
    Point: GeoPoint,
    Rect: GeoRect
};
/**
 * @hidden
 * @public
 * @deprecated Use direct named exports from `@here/xyz-maps-core` instead of the pixel namespace.
 */
const pixel = XYZMAPS.pixel = {
    Point: PixelPoint,
    Rect: PixelRect
};

/**
 * @hidden
 * @public
 * @deprecated Use direct named exports from `@here/xyz-maps-core` instead of the layers namespace.
 */
const layers = XYZMAPS.layers = {
    TileLayer,
    MVTLayer,
    CustomLayer,
    ClusterTileLayer,
    TerrainTileLayer
};

/**
 * @hidden
 * @public
 * @deprecated Use direct named exports from `@here/xyz-maps-core` instead of the styles namespace.
 */
const styles = XYZMAPS.styles = {
    TerrainTileLayerStyle
};

/**
 * @hidden
 * @public
 * @deprecated Use direct named exports from `@here/xyz-maps-core` instead of the features namespace.
 */
const features = XYZMAPS.features = {
    Feature,
    TerrainTileFeature
};

/**
 * @hidden
 * @public
 * @deprecated Use direct named exports from `@here/xyz-maps-core` instead of the tile namespace.
 */
const tile = XYZMAPS.tile = {
    Tile: Tile,
    Utils: tileUtils
};

XYZMAPS.build = build;

/**
 * @hidden
 * @public
 * @deprecated Use direct named exports from `@here/xyz-maps-core` instead of the providers namespace.
 */
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
    TINProvider: TerrainTileProvider,
    EditableFeatureProvider
};

export {pixel, tile, layers, styles, features, providers};

/**
 * @hidden
 * @public
 * @deprecated Use direct named exports from `@here/xyz-maps-core` instead of the projection namespace.
 */
export const projection = XYZMAPS.projection = {
    webMercator
};


/**
 * @hidden
 * @public
 * @deprecated Use direct named exports from `@here/xyz-maps-core` instead of the loaders namespace.
 */
export const loaders = XYZMAPS.loaders = {
    HTTPLoader,
    Manager: TileLoaderManager
};

/**
 * @hidden
 * @public
 * @deprecated Use direct named exports from `@here/xyz-maps-core` instead of the service namespace.
 */
export const service = XYZMAPS.service || {
    Geocoder: GeoCoder
};

/**
 * @hidden
 * @public
 * @deprecated Use direct named exports from `@here/xyz-maps-core` instead of the default legacy namespace.
 */
export default {
    tile,
    layers,
    styles,
    /**
     * @hidden
     * @public
     * @deprecated Use direct named exports from `@here/xyz-maps-core` instead of the geo namespace.
     */
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

declare global {
    /**
     * @public
     * @hidden
     */
    namespace XYZMaps {
        /**
         * @public
         * @hidden
         */
        type CoreExports = Omit<typeof import('@here/xyz-maps-core'),
            'default' | 'geo' | 'pixel' | 'layers' | 'styles' | 'features' | 'tile' |
            'providers' | 'projection' | 'loaders' | 'service'>;

        /**
         * @public
         * @hidden
         */
        interface Maps extends CoreExports {
        }
    }
}
