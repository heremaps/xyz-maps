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
import {getProviderZoomOffset, TileLayer} from '../TileLayer';
import {Tile} from '../../tile/Tile';
import {ClusterTileLayerOptions} from './ClusterTileLayerOptions';
import {FeatureProvider} from '../../providers/FeatureProvider';
import {Feature} from '../../features/Feature';
import {GeoJSONBBox, GeoJSONCoordinate, GeoJSONFeature} from '../../features/GeoJSON';
import webMercator from '../../projection/webMercator';
import {ClusterFeature, updateBBox} from '../../features/ClusterFeature';
import {ClusterProvider, GeoJSONPointFeature} from '../../providers/ClusterProvider/ClusterProvider';

const pointInEllipse = (point: GeoJSONCoordinate, ellipse: number[], sqRadius: number[]): boolean => {
    const dx = point[0] - ellipse[0];
    const dy = point[1] - ellipse[1];
    return (dx * dx) / sqRadius[0] + (dy * dy) / sqRadius[1] <= 1;
};

enum CLUSTER_OPERATION {
    GROW, SHRINK
};

/**
 * The `ClusterTileLayer` class is a specialized TileLayer designed to efficiently handle clustering of GeoJSON data from various DataSources/DataProviders.
 *
 * This layer aggregates data points within map tiles to reduce visual clutter and improve performance, particularly when dealing with large datasets.
 * When features are being added or removed from the DataSources, the ClusterTileLayer automatically updates to reflect the changes.
 * Data will be clustered for each zoom level optimally from {@link ClusterTileLayerOptions.min | min} up to {@link ClusterTileLayerOptions.clusterMaxZoom | clusterMaxZoom}.
 * For zoom levels below {@link ClusterTileLayerOptions.clusterMaxZoom | clusterMaxZoom} and upto {@link ClusterTileLayerOptions.min | min}, the untouched source data features will be displayed.
 *
 * Additionally, the `ClusterTileLayer` supports cluster property aggregation, allowing developers to customize how properties are aggregated when features are added or removed from the cluster.
 * The following methods are available for property aggregation:
 *
 * - `createProperties(featureProperties: { [propertyName: string]: any }): { [propertyName: string]: any }`: Creates initial properties for a cluster based on the properties of a feature.
 *
 * - `addProperties(clusterProperties: { [propertyName: string]: any }, featureProperties: { [propertyName: string]: any }): void`: Updates cluster properties when a feature is added to the cluster.
 *
 * - `removeProperties(clusterProperties: { [propertyName: string]: any }, featureProperties: { [propertyName: string]: any }): void`: Updates cluster properties when a feature is removed from the cluster.
 *
 * This layer also utilizes the {@link ClusterFeature} class to represent clusters.
 *
 * @see ClusterFeature
 *
 * @example
 * ```
 * // Create a new ClusterTileLayer with specified options
 * const myLayer = new ClusterTileLayer({
 *     min: 2,        // Minimum zoom level to cluster and display the layer
 *     max: 20,       // Maximum zoom level the layer will be displayed
 *     clusterMaxZoom:13, // the maximum zoom level data will be clustered
 *     clusterRadius: 15, // Cluster radius in pixels
 *     provider: myDataProvider // The data provider that data should be clustered
 * });
 * ```
 */
export class ClusterTileLayer extends TileLayer {
    private _dataProvider: FeatureProvider;
    private clusterRadius: number;
    protected _p: ClusterProvider[];
    private clusterMaxZoom: number;
    private _globalClusterId: number = 0;

    private _pendingClusterJobs: Map<string, Map<string, () => void>> = new Map();
    private providerClearListener: (ev) => void;

    private _searchRadius: [number, number] = [0, 0];
    private _searchBBox: GeoJSONBBox = [0, 0, 0, 0];

    /**
     * @param options - options to configure the ClusterTileLayer
     */
    constructor(options: ClusterTileLayerOptions) {
        const dataProvider = options.provider;
        const providers = [];
        const max = options.clusterMaxZoom || options.max || 13;
        const min = options.min || 2;
        let clusterRadius = options.clusterRadius || options['radius'] || 32;
        const zOffset = getProviderZoomOffset(options.tileSize || dataProvider.size || 512);

        for (var z = min - zOffset; z <= max - zOffset; z++) {
            providers.push({
                min: z, max: z,
                provider: new ClusterProvider({
                    id: `cluster-${z}-${dataProvider.id}`,
                    margin: clusterRadius
                })
            });
        }

        super({
            clusterRadius,
            tileSize: 512,
            ...options,
            providers
        });

        this.clusterMaxZoom = max - this.levelOffset;
        this._dataProvider = dataProvider;

        this.featureUpdateListener = this.featureUpdateListener.bind(this);

        this.providerClearListener = (ev) => this.clear(null, true);

        const toggleProviderListener = ({type}) => {
            this.listenForDataUpdates(type == 'layerAdd');
        };
        this.addEventListener('layerAdd', toggleProviderListener);
        this.addEventListener('layerRemove', toggleProviderListener);
    }

    listenForDataUpdates(active: boolean) {
        const toggleListener = `${active ? 'add' : 'remove'}EventListener`;

        ['featuresAdd', 'featuresRemove'/* , 'tileInitialized'*/, 'tileDestroyed'].forEach((e) => {
            this._dataProvider[toggleListener](e, this.featureUpdateListener);
        });

        this._dataProvider[toggleListener]('clear', this.providerClearListener);
    };

    private featureUpdateListener(e) {
        let {features, tiles} = e.detail;
        const preventDuplicates = e.type == 'tileInitialized';
        const operation = e.type == 'featuresAdd' ? CLUSTER_OPERATION.GROW : CLUSTER_OPERATION.SHRINK;
        const updatedTiles = this._updateClusters(features, operation, preventDuplicates);
        console.log('tileDestroyed', tiles);
        if (e.type == 'tileDestroyed') {
            for (let tile of tiles) {
                this._pendingClusterJobs.delete(tile.quadkey);
            }
        }
        this._triggerTileRefresh(Array.from(updatedTiles));
    };

    private createProperties(featureProperties: { [p: string]: any }): { [p: string]: any } {
        return {};
    }

    private aggregateProperties(clusterProperties: { [p: string]: any }, featureProperties: {
        [p: string]: any
    }, operation: 'add' | 'remove') {
    }

    private _createClusterTile(quadkey: string) {
        const clusterProvider = this.getClusterProvider(quadkey.length);
        return clusterProvider.createStorageTile(quadkey);
    }

    private _triggerTileRefresh(tiles: Tile[]) {
        if (tiles.length) {
            this.dispatchEvent('featuresAdd', {tiles, features: []}, false);
        }
    }

    private _setTileData(tile: Tile, data: GeoJSONFeature[]) {
        tile.data = data;
        tile.loadStopTs ??= Date.now();
    }

    private _updateCachedTiles(bounds: GeoJSONBBox, clusterIndex: ClusterProvider, updatedTiles?: Set<Tile>) {
        const tiles = clusterIndex.getCachedTiles(bounds);
        if (tiles) {
            for (let cachedTile of tiles) {
                updatedTiles?.add(cachedTile);
                const clusters = clusterIndex.search(cachedTile.getContentBounds());
                this._setTileData(cachedTile, clusters);
            }
        }
    }

    private _initSearch(coord, zoom: number): readonly [number, number] {
        // const groundResolution = webMercator.getGroundResolution(this.clusterMaxZoom);
        const worldSizePixel = webMercator.mapSizePixel(this.tileSize, zoom);
        const pixel = webMercator.geoToPixel(coord[0], coord[1], worldSizePixel);
        // const dZoom = this.clusterMaxZoom - zoom;
        // const scaledRadius = this.clusterRadius * Math.pow(2, dZoom);
        const scaledRadius = this.clusterRadius;
        const geoOffset = webMercator.pixelToGeo(pixel.x + scaledRadius, pixel.y - scaledRadius, worldSizePixel);
        const dLon = (geoOffset.longitude - coord[0]);
        const dLat = (geoOffset.latitude - coord[1]);

        this._searchRadius[0] = dLon;
        this._searchRadius[1] = dLat;
        return this._searchRadius;
    }


    private searchClusterNearby(provider: ClusterProvider, coordinate: GeoJSONCoordinate): ClusterFeature {
        const searchBBox = this._searchBBox;
        const [dLon, dLat] = this._searchRadius;
        const [longitude, latitude] = coordinate;
        searchBBox[0] = longitude - dLon;
        searchBBox[1] = latitude - dLat;
        searchBBox[2] = longitude + dLon;
        searchBBox[3] = latitude + dLat;
        const data = (provider.search(searchBBox) as ClusterFeature[]);
        const searchRadiusSq = [dLon * dLon, dLat * dLat];
        for (let cluster of data) {
            if (pointInEllipse(cluster.geometry.coordinates, coordinate, searchRadiusSq)) {
                return cluster;
            }
        }
    }

    private _shrinkCluster(zoom: number, features: any, clusterProvider: ClusterProvider): {
        bounds: GeoJSONBBox,
        clusters: Set<GeoJSONPointFeature>
    } {
        if (features[0]) {
            this._initSearch(features[0].geometry.coordinates, zoom);
        }
        const bounds: GeoJSONBBox = [Infinity, Infinity, -Infinity, -Infinity];
        const updatedClusters = new Set<GeoJSONPointFeature>();

        for (let feature of features) {
            let cluster: GeoJSONPointFeature = clusterProvider.getCluster(feature);
            if (cluster) {
                const {properties} = cluster;
                const clusteredFeatures = properties._clustered;
                if (!feature.properties.clusterSize) {
                    const index = clusteredFeatures.indexOf(feature);
                    clusterProvider.removeFromCluster(feature);
                    clusteredFeatures.splice(index, 1);
                }
                updateBBox(bounds, cluster.geometry.coordinates);

                if (--properties.clusterSize == 0) {
                    clusterProvider.removeCluster(cluster);
                } else {
                    this.aggregateProperties(properties, feature.properties, 'remove');
                }
                updatedClusters.add(cluster);
            }
        }
        return {bounds, clusters: updatedClusters};
    }

    private _updateClusterSize(cluster: GeoJSONPointFeature) {
        let clusterSize = 0;
        let sumLon = 0;
        let sumLat = 0;
        for (let subCluster of cluster.properties._clustered) {
            const subClusterSize = subCluster.properties.clusterSize || 1;
            sumLon += subCluster.geometry.coordinates[0] * subClusterSize;
            sumLat += subCluster.geometry.coordinates[1] * subClusterSize;
            clusterSize += subClusterSize;
        }
        cluster.geometry.coordinates[0] = sumLon / clusterSize;
        cluster.geometry.coordinates[1] = sumLat / clusterSize;
        cluster.properties.clusterSize = clusterSize;
    }

    private _createClusters(zoom: number, data: GeoJSONFeature<'Point'>[], clusterProvider: ClusterProvider, dropDuplicates: boolean = false): {
        bounds: GeoJSONBBox,
        clusters: Set<GeoJSONPointFeature>
    } {
        if (data[0]) {
            this._initSearch(data[0].geometry.coordinates, zoom);
        }

        const updatedClusters = new Set<Feature<'Point'>>();
        const bounds: GeoJSONBBox = [Infinity, Infinity, -Infinity, -Infinity];

        for (let feature of data) {
            let cluster: ClusterFeature = clusterProvider.getCluster(feature);
            let position: GeoJSONCoordinate;

            if (cluster) {
                if (dropDuplicates) {
                    continue;
                }
                position = cluster.bbox;
                // update cluster size only
                this._updateClusterSize(cluster);
            } else {
                const {properties} = feature;
                position = feature.bbox;
                // optimise here!!!
                cluster = this.searchClusterNearby(clusterProvider, feature.geometry.coordinates);
                if (cluster) {
                    const clusterSize = properties.clusterSize || 1;
                    const clusterProps = cluster.properties;
                    const neighborClusterSize = clusterProps.clusterSize;

                    clusterProps._clustered.push(feature);
                    const newClusterSize = (clusterProps.clusterSize as number) += clusterSize;

                    this.aggregateProperties(clusterProps, feature.properties, 'add');

                    const clusterGeometry = cluster.geometry;
                    clusterGeometry.coordinates[0] = (clusterGeometry.coordinates[0] * neighborClusterSize + position[0] * clusterSize) / newClusterSize;
                    clusterGeometry.coordinates[1] = (clusterGeometry.coordinates[1] * neighborClusterSize + position[1] * clusterSize) / newClusterSize;
                    position = cluster.geometry.coordinates;
                } else {
                    let clusterFeatures;
                    let clusterSize = 1;
                    if (properties.isCluster) {
                        position = feature.geometry.coordinates;
                        clusterSize = properties.clusterSize;
                    }
                    clusterFeatures = [feature];
                    cluster = this._createClusterFeature(position[0], position[1], this._globalClusterId++, zoom, clusterSize, clusterFeatures) as ClusterFeature;
                    // optimise here!!!
                    cluster = clusterProvider.addCluster(cluster);
                }
            }

            updatedClusters.add(cluster);
            clusterProvider.setCluster(feature, cluster);

            updateBBox(bounds, position);
        }
        return {bounds, clusters: updatedClusters};
    }


    /**
     * Retrieves the data provider associated with this ClusterTileLayer.
     *
     * The data provider is responsible for supplying the features that are
     * to be clustered and displayed within the ClusterTileLayer.
     *
     * @returns The `FeatureProvider` instance used by this layer.
     */
    getDataProvider(): FeatureProvider {
        return this._dataProvider;
    }

    /**
     * Clears the {@link ClusterTileLayerOptions.provider | source data provider} and all associated clusters, optionally within a specified bounding box.
     *
     * If no bounding box is provided, all features in the source dataProvider and all clusters will be cleared.
     *
     * @param {GeoJSONBBox} [bbox] - Optional. The bounding box defining the area to clear.
     */
    clear(bbox?: GeoJSONBBox);

    clear(bbox?: GeoJSONBBox, clearDataProvider?: boolean);
    clear(bbox?: GeoJSONBBox, clearDataProvider: boolean = true) {
        if (clearDataProvider) {
            this._dataProvider.clear();
        }
        this._pendingClusterJobs.clear();
        for (let z = this.clusterMaxZoom; z >= this.min; z--) {
            this.getClusterProvider(z).clear(bbox, false);
        }
        this.dispatchEvent('clear', {tiles: null});
    }

    private _getCoveringTile(quadkey: string): string {
        for (let [qk, jobs] of Array.from(this._pendingClusterJobs)) {
            if (quadkey.indexOf(qk) == 0/* && jobs.size == 0*/) {
                return qk;
            }
        }
    }

    private _updateClusters(features: GeoJSONPointFeature[], op: CLUSTER_OPERATION = CLUSTER_OPERATION.GROW, dropDuplicates: boolean = false) {
        const baseClusterZoom = this.clusterMaxZoom;
        const minZoom = this.min;
        const updatedTiles = new Set<Tile>();

        for (let zoom = baseClusterZoom; zoom >= minZoom; zoom--) {
            const clusterIndex = this.getClusterProvider(zoom);
            const {bounds, clusters} = op == CLUSTER_OPERATION.GROW
                ? this._createClusters(zoom, features, clusterIndex, dropDuplicates)
                : this._shrinkCluster(zoom, features, clusterIndex);

            this._updateCachedTiles(bounds, clusterIndex, updatedTiles);

            features = Array.from(clusters);

            dropDuplicates = false;
        }
        return updatedTiles;
    }

    private _createClusterFeature(longitude, latitude, id: number, zoom: number, clusterSize: number, clusterFeatures: ClusterFeature[]) {
        const clusterProvider = this.getClusterProvider(zoom);
        const properties = this.createProperties(clusterFeatures[0].properties);
        properties.isCluster = true;
        properties.zoom = zoom;
        properties.clusterSize = clusterSize;
        properties._clustered = clusterFeatures;

        return clusterProvider.createFeature({
            id,
            bbox: [longitude, latitude, longitude, latitude],
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: [longitude, latitude]
            },
            properties
        }, clusterProvider.Feature);
    }

    getProvider(zoom = this.clusterMaxZoom): ClusterProvider {
        return super.getProvider(zoom) as ClusterProvider;
    }

    getClusterProvider(zoom: number): ClusterProvider {
        return this._p[zoom];
    }

    getTile(quadkey: string, callback: (tile: Tile) => void): Tile | undefined {
        const zoom = quadkey.length;
        if (zoom > this.clusterMaxZoom) {
            return this._dataProvider.getTile(quadkey, callback);
        }

        const tile = this._createClusterTile(quadkey);
        const isTileReady = !!tile.loadStopTs;

        if (isTileReady) {
            callback?.(tile);
            return tile;
        }

        const createTileResult = () => {
            const zoom = quadkey.length;
            const tileBounds = tile.getContentBounds();
            const data = this.getClusterProvider(zoom).search(tileBounds);
            this._setTileData(tile, data);
            return tile;
        };

        const baseClusterQuadkey = this._getCoveringTile(quadkey) || quadkey;
        let pendingBaseTileJobs = this._pendingClusterJobs.get(baseClusterQuadkey);

        const isBaseClusterTileReady = pendingBaseTileJobs?.size === 0;
        if (isBaseClusterTileReady) {
            callback?.(createTileResult());
            return tile;
        }

        let tileJob;
        if (!pendingBaseTileJobs) {
            this._pendingClusterJobs.set(baseClusterQuadkey, pendingBaseTileJobs = new Map());

            tileJob = (dataTile) => {
                pendingBaseTileJobs.delete(baseClusterQuadkey);
                const preventDuplicates = true;
                const updatedTiles = this._updateClusters(dataTile.data, CLUSTER_OPERATION.GROW, preventDuplicates);
                this._triggerTileRefresh(Array.from(updatedTiles));
                callback?.(tile);
            };
        } else {
            tileJob = pendingBaseTileJobs.get(quadkey) || (() => {
                pendingBaseTileJobs.delete(quadkey);
                callback?.(createTileResult());
            });
        }
        pendingBaseTileJobs.set(quadkey, tileJob);
        this._dataProvider.getTile(baseClusterQuadkey, tileJob);

        return tile;
    }

    /**
     * Retrieves the cluster to which the specified feature belongs at the given zoom level.
     * @param feature The feature for which to retrieve the cluster.
     * @param zoom The zoom level. If not specified, the current map zoom level will be used.
     * @returns The cluster feature to which the specified feature belongs, or `undefined` if no cluster exists.
     */
    getCluster(feature: Feature<'Point'>, zoom: number = this.clusterMaxZoom) {
        return this.getClusterProvider(zoom).getCluster(feature);
    }

    /**
     * Retrieves all clusters to which the specified feature belongs across all zoom levels.
     * The returned array is ordered by zoom level in descending order, starting from the {@link ClusterTileLayerOptions.clusterMaxZoom}.
     *
     * @param feature The feature for which to retrieve all clusters.
     * @returns An array of cluster features to which the specified feature belongs, ordered by zoom level.
     */
    getClusters(feature: Feature<'Point'>) {
        const clusters = [];
        for (let zoom = this.clusterMaxZoom; zoom >= this.min; zoom--) {
            feature = this.getClusterProvider(zoom).getCluster(feature);
            if (!feature) break;
            clusters.push(feature);
        }
        return clusters;
    }

    totalFeaturesClustered(zoom: number = this.clusterMaxZoom) {
        let total = 0;
        for (let cluster of this.getClusterProvider(zoom).all()) {
            total += cluster.properties.clusterSize || 1;
        }
        return total;
    }
}
