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

import {geotools, JSUtils} from '@here/xyz-maps-common';
import LoaderManager from '../../loaders/Manager';
import TileReceiver from './TileReceiver';
import {tileUtils} from '../../tile/TileUtils';
import {Tile} from '../../tile/Tile';
import {EditableRemoteTileProviderOptions} from './EditableRemoteTileProviderOptions';
import {EditableFeatureProvider} from '../EditableFeatureProvider';
import {Feature} from '../../features/Feature';
import {PostProcesserInput, createRemoteProcessor, isPostprocessor} from './processors';
import {GeoJSONCoordinate, GeoJSONBBox, GeoJSONFeature} from '../../features/GeoJSON';
import {GeoPoint} from '../../geo/GeoPoint';
import {GeoRect} from '../../geo/GeoRect';
import {FixedLevelTileLoadDelegator} from './FixedLevelTileLoadDelegator';

let UNDEF;

type Navlink = Feature;

type EditorFeature = { editState: (state?: string, value?) => any };

const METHOD_NOT_IMPLEMENTED = 'Method not implemented.';

class FeatureError extends Error {
    feature: any;

    constructor(message, feature) {
        super(message);
        this.name = 'FeatureError';
        this.feature = feature;
    }
}

/**
 *  EditableRemoteTileProvider is a remote tile provider that can be edited using the {@link Editor} module.
 */
export abstract class EditableRemoteTileProvider extends EditableFeatureProvider {
    sizeKB = 0;

    staticData: boolean;

    renderer: any;

    name: string;

    level: number;

    clipped: boolean;

    private preprocess: (data: any[], cb: (data: GeoJSONFeature[]) => void, tile?: Tile) => void;
    private postprocess: (data: PostProcesserInput, cb: (data: PostProcesserInput) => void) => void;
    protected remoteTileLoader: FixedLevelTileLoadDelegator;

    /**
     * @param options - options to configure the provider
     */
    protected constructor(options: EditableRemoteTileProviderOptions) {
        super({
            minLevel: 8,
            maxLevel: 20,
            staticData: false,
            ...options
        });

        const provider = this;

        let loader = options.loader;

        if (loader) {
            if (!(loader instanceof LoaderManager)) {
                loader = new LoaderManager(loader);
            }
        } else {
            throw (new Error('no tile loader defined.'));
        }

        const {preProcessor} = options;
        provider.preprocess = createRemoteProcessor(preProcessor || (<any>options).preprocessor);
        provider.postprocess = createRemoteProcessor((<any>options).postProcessor);

        this.remoteTileLoader = new FixedLevelTileLoadDelegator({
            provider,
            loader,
            level: provider.level,
            preProcessor,
            processTileResponse: (tile, data, onDone) => {
                if (tile.error) {
                    return onDone(tile.data);
                }
                this.loadTileData(tile, data, onDone);
            }
        });


        if (provider.commit) {
            provider.commit = ((commit) => function(features: PostProcesserInput, onSuccess?, onError?) {
                const {postProcessor} = this;
                const prepareFeatures = (features) => {
                    if (!Array.isArray(features)) {
                        features = [features];
                    }
                    let len = features.length;
                    let feature;
                    let props;

                    while (len--) {
                        feature = features[len] = Feature.prototype.toJSON.call(features[len]);
                        if (props = feature.properties) {
                            delete props['@ns:com:here:editor'];
                        }
                    }
                    return features;
                };

                if (typeof features == 'object') {
                    features.put = prepareFeatures(features.put || []);
                    features.remove = prepareFeatures(features.remove || []);

                    if (isPostprocessor(postProcessor)) {
                        let send;
                        provider.postprocess(features, (data) => {
                            send = commit.call(this, data, onSuccess, onError);
                        });
                        return send;
                    }
                }

                return commit.call(this, features, onSuccess, onError);
            })(provider.commit);
        }
    }


    /**
     * Gets features from provider by id.
     *
     * @param ids - array of feature ids to search for.
     * @param options - search options
     *
     * @returns if just a single feature is found its getting returned otherwise an array of features or undefined if none is found.
     */
    getFeatures(ids: number[] | string[], options?: {
        /**
         * Force the provider to do remote search if no result is found in local cache.
         */
        remote?: boolean,
        /**
         * Callback function for "remote" search.
         * @param result - array of Features containing the search result.
         */
        onload?: (result: Feature[] | null) => void
    });
    /**
     * Gets features from provider by id.
     *
     * @param options - search options
     *
     * @returns if just a single feature is found its getting returned otherwise an array of features or undefined if none is found.
     */
    getFeatures(options: {
        /**
         * search for a single feature by id
         */
        id?: number | string,
        /**
         * array of ids to search for multiple features
         */
        ids?: number[] | string[],
        /**
         * Force the provider to do remote search if no result is found in local cache
         */
        remote?: boolean,
        /**
         * Callback function for "remote" search
         * @param result - Result array of features
         */
        onload?: (result: Feature[] | null) => void
    });
    getFeatures(ids, options?) {
        options = options || {};

        if (!(ids instanceof Array)) {
            if (typeof ids == 'object') {
                if (ids['remote']) {
                    options['remote'] = ids['remote'];
                }
                if (ids['onload']) {
                    options['onload'] = ids['onload'];
                }

                ids = ids['ids'] || ids['id'];
            }

            ids = [].concat(ids);
        }

        const prov = this;
        let cached = true;
        const onload = options['onload'];
        const remote = options['remote'];
        var result = super.getFeatures(ids);

        if (!(result instanceof Array)) {
            result = [result];
        }

        for (let r = 0; r < result.length; r++) {
            if (!result[r]) {
                result[r] = ids[r];
                cached = false;
            }
        }

        function createResult() {
            result = (<any[]>result).map((e) => typeof e == 'object' ? e : UNDEF);

            return result.length == 1
                ? result[0]
                : result;
        }


        if (!cached && remote) {
            ids = result.filter((a) => typeof a != 'object');
            const onerror = (e) => {
                const {onerror} = options;
                if (onerror) {
                    onerror(e);
                }
            };
            prov._requestFeatures(ids,
                (data) => {
                    // QND geometry validation...
                    for (let f of data) {
                        let {geometry} = f;
                        if (!geometry || !geometry.type || !geometry.coordinates) {
                            onerror(new FeatureError(`Invalid geometry`, f));
                            return;
                        }
                    }

                    this.preprocess(data, (data) => {
                        for (let f of data) {
                            result[(<any[]>result).indexOf(f.id)] = prov.addFeature(f);
                        }
                        if (onload) {
                            onload(createResult());
                        }
                    });
                },
                onerror,
                options
            );
        } else {
            var result = createResult();

            if (onload) {
                onload(result);
            }

            return result;
        }
    };

    /**
     * Cancel ongoing request(s) of a tile.
     * The tile will be dropped.
     *
     * @param quadkey - the quadkey of the tile that should be canceled and removed.
     */
    cancel(quadkey: string): void;
    /**
     * Cancel ongoing request(s) of a tile.
     * The tile will be dropped.
     *
     * @param tile - the tile that should be canceled and removed.
     */
    cancel(tile: Tile): void;

    cancel(quadkey: string | Tile, cb?: () => void) {
        this.remoteTileLoader.cancel(quadkey, cb);
    };

    /**
     * Search for feature(s) in the provider.
     *
     * @param options - configure the search
     *
     * @example
     * ```
     * // searching by ids:
     * provider.search({ids: [1058507462, 1058507464]})
     *
     * // searching by point and radius:
     * provider.search({
     * point: {longitude: 72.84205, latitude: 18.97172},
     * radius: 100
     * })
     *
     * // searching by Rect:
     * provider.search({
     *  rect:  {minLon: 72.83584, maxLat: 18.97299, maxLon: 72.84443, minLat: 18.96876}
     * })
     *
     * // remote search:
     * provider.search({
     *     rect:  {minLon: 72.83584, maxLat: 18.97299, maxLon: 72.84443, minLat: 18.96876},
     *     remote: true, // force provider to do remote search if feature/search area is not cached locally
     *     onload: (result) => {...}
     * })
     * ```
     * @returns array containing the searched features
     */
    search(options: {
        /**
         * Search features by Ids.
         */
        ids?: number[] | string[],
        /**
         * Geographical center point of the circle to search in. options.radius must be defined.
         */
        point?: GeoPoint | GeoJSONCoordinate,
        /**
         * Radius of the circle in meters, it is used in "point" search.
         */
        radius?: number,
        /**
         * Geographical Rectangle to search in. [minLon, minLat, maxLon, maxLat] | GeoRect.
         */
        rect?: GeoRect | GeoJSONBBox
        /**
         * Force the data provider(s) to do remote search if no result is found in local cache.
         */
        remote?: boolean,
        /**
         * Callback function for "remote" search.
         * @param result - Array of Features containing the search results.
         */
        onload?: (result: Feature[] | null) => void
        /**
         * Function to be called when a request of a "remote search" fails.
         */
        onerror?: (error: {
            /**
             * The name property represents a name for the type of error. The value is "NetworkError".
             */
            name: 'NetworkError',
            /**
             * The error message of the failing request.
             */
            message: string,
            /**
             * The responseText which contains the textual data received of the failing request.
             */
            responseText: string,
            /**
             * The numerical HTTP status code of the failing request.
             */
            status: number
        }) => void
    }): Feature[];

    /**
     * Search for feature(s) in the provider.
     *
     * @param options - configure the search
     *
     * @example
     * ```
     * // searching by id:
     * provider.search({id: 1058507462})
     *
     * // remote search:
     * provider.search({
     *     id: 1058507462,
     *     remote: true, // force provider to do remote search if feature/search area is not cached locally
     *     onload: (result) => {...}
     * })
     * ```
     * @returns array containing the searched features
     */
    search(options: {
        /**
         * search feature by id.
         */
        id: number | string,
        /**
         * Force the data provider(s) to do remote search if no result is found in local cache.
         */
        remote?: boolean,
        /**
         * Callback function for "remote" search.
         * @param result - Array of Features containing the search results.
         */
        onload?: (result: Feature | null) => void
        /**
         * Function to be called when a request of a "remote search" fails.
         */
        onerror?: (error: {
            /**
             * The name property represents a name for the type of error. The value is "NetworkError".
             */
            name: 'NetworkError',
            /**
             * The error message of the failing request.
             */
            message: string,
            /**
             * The responseText which contains the textual data received of the failing request.
             */
            responseText: string,
            /**
             * The numerical HTTP status code of the failing request.
             */
            status: number
        }) => void
    }): Feature;

    /**
     * Point Search for feature(s) in provider.
     * @param point - Geographical center point of the point to search in. options.radius must be defined.
     * @param options - configure the search
     *
     * @example
     * ```
     * layer.search({longitude: 72.84205, latitude: 18.97172},{
     *  radius: 100
     * })
     * // or:
     * layer.search([72.84205, 18.97172], {
     *  radius: 100
     * })
     * ```
     */
    search(point: GeoPoint | GeoJSONCoordinate, options?: {
        /**
         * the radius of the circular area in meters to search in
         */
        radius: number,
        /**
         * Force the data provider(s) to do remote search if no result is found in local cache.
         */
        remote?: boolean,
        /**
         * Callback function for "remote" search.
         * @param result - Array of Features containing the search results.
         */
        onload?: (result: Feature[] | null) => void
        /**
         * Function to be called when a request of a "remote search" fails.
         */
        onerror?: (error: {
            /**
             * The name property represents a name for the type of error. The value is "NetworkError".
             */
            name: 'NetworkError',
            /**
             * The error message of the failing request.
             */
            message: string,
            /**
             * The responseText which contains the textual data received of the failing request.
             */
            responseText: string,
            /**
             * The numerical HTTP status code of the failing request.
             */
            status: number
        }) => void
    }): Feature[];

    /**
     * Rectangle Search for feature(s) in the provider.
     * @param rect - Geographical Rectangle to search in. [minLon, minLat, maxLon, maxLat] | GeoRect.
     * @param options - configure the search
     *
     * @example
     * ```
     * provider.search({minLon: 72.83584, maxLat: 18.97299, maxLon: 72.84443, minLat: 18.96876})
     * // or:
     * provider.search([72.83584, 18.96876, 72.84443,18.97299])
     *
     * // remote search:
     * provider.search({minLon: 72.83584, maxLat: 18.97299, maxLon: 72.84443, minLat: 18.96876}, {
     *     remote: true, // force provider to do remote search if search area is not cached locally
     *     onload: (result) => {...}
     * })
     * ```
     */
    search(rect: GeoRect | GeoJSONBBox, options?: {
        /**
         * Force the data provider(s) to do remote search if no result is found in local cache.
         */
        remote?: boolean,
        /**
         * Callback function for "remote" search.
         * @param result - Array of Features containing the search results.
         */
        onload?: (result: Feature[] | null) => void
        /**
         * Function to be called when a request of a "remote search" fails.
         */
        onerror?: (error: {
            /**
             * The name property represents a name for the type of error. The value is "NetworkError".
             */
            name: 'NetworkError',
            /**
             * The error message of the failing request.
             */
            message: string,
            /**
             * The responseText which contains the textual data received of the failing request.
             */
            responseText: string,
            /**
             * The numerical HTTP status code of the failing request.
             */
            status: number
        }) => void
    }): Feature[];

    /**
     * Search for feature by id in the provider.
     *
     * @param id - id of the feature to search for
     * @param options - configure the search
     *
     * @example
     * ```
     * provider.search(1058507462)
     *
     * // remote search:
     * provider.search(1058507462,{
     *     remote: true, // force provider to do remote search if search area is not cached locally
     *     onload: (result) => {...}
     * })
     * ```
     */
    search(id: string | number, options?: {
        /**
         * Force the data provider(s) to do remote search if no result is found in local cache.
         */
        remote?: boolean,
        /**
         * Callback function for "remote" search.
         * @param result - Array of Features containing the search results.
         */
        onload?: (result: Feature) => void
        /**
         * Function to be called when a request of a "remote search" fails.
         */
        onerror?: (error: {
            /**
             * The name property represents a name for the type of error. The value is "NetworkError".
             */
            name: 'NetworkError',
            /**
             * The error message of the failing request.
             */
            message: string,
            /**
             * The responseText which contains the textual data received of the failing request.
             */
            responseText: string,
            /**
             * The numerical HTTP status code of the failing request.
             */
            status: number
        }) => void
    }): Feature;

    search(bbox, options?): Feature | Feature[] {
        // TODO: cleanup and split search and implement remote part here
        const provider = this;
        let geo;
        let searchBBox;

        if (typeof bbox == 'object') {
            if (!options) {
                options = bbox;
            } else {
                for (const opt in bbox) {
                    options[opt] = bbox[opt];
                }
            }
        }

        options = options || {};

        const onload = options['onload'];
        let radius = options['radius'];
        const remote = options['remote'];
        const onerror = options['onerror'];

        if (radius == UNDEF) {
            radius = 1;
        }

        if (bbox instanceof Array) {
            if (bbox.length == 4) { // it's just a point
                searchBBox = bbox; // [ bbox[1], bbox[2], bbox[3], bbox[0] ];
            } else {
                searchBBox = geotools.getPointBBox(<[number, number]>bbox, radius);
            }
        } else if (typeof bbox == 'number' || typeof bbox == 'string' || !bbox) { // search per ID
            return provider.getFeatures(bbox, options);
        } else if (bbox['longitude'] != UNDEF && bbox['latitude'] != UNDEF) {
            searchBBox = geotools.getPointBBox(
                [bbox['longitude'], bbox['latitude']],
                radius
            );
        } else if (
            bbox['minLon'] != UNDEF &&
            bbox['minLat'] != UNDEF &&
            bbox['maxLon'] != UNDEF &&
            bbox['maxLat'] != UNDEF
        ) {
            searchBBox = [bbox['minLon'], bbox['minLat'], bbox['maxLon'], bbox['maxLat']];
        } else if (geo = bbox['point'] || bbox['rect'] || bbox['viewport']) {
            return provider.search(geo, options);
        } else if (bbox['id'] || bbox['ids']) {
            return provider.getFeatures(
                bbox['id'] || bbox['ids'],
                options
            );
        }

        searchBBox = {
            minX: searchBBox[0],
            minY: searchBBox[1],
            maxX: searchBBox[2],
            maxY: searchBBox[3]
        };

        if (remote) {
            // var tiles = tileUtils.getTilesInRect.apply(
            //     tileUtils,
            //     searchBBox.concat( provider.level )
            // );
            const tiles = tileUtils.getTilesInRect(
                searchBBox.minX,
                searchBBox.minY,
                searchBBox.maxX,
                searchBBox.maxY,
                provider.level
            );

            let error;
            const tileReceiver = (tile: Tile) => {
                tiles.splice(tiles.indexOf(tile.quadkey), 1);

                error = error || tile.error;

                if (!tiles.length) {
                    // all tile are loaded -> callback is ready to be executed..
                    if (error) {
                        onerror(error);
                    } else if (onload) {
                        onload(provider._s(searchBBox));
                    }
                }
            };

            // filter out tiles that are already cached
            for (let t = 0; t < tiles.length; t++) {
                const qk = tiles[t];
                const cTile = provider.getCachedTile(qk);
                if (cTile && cTile.isLoaded()) {
                    if (cTile.error) {
                        if (onerror) {
                            onerror(cTile.error);
                        }
                        return;
                    }
                    tiles.splice(t--, 1);
                } else {
                    // tile needs to be loaded...
                    provider.getTile(qk, tileReceiver);
                }
            }

            // wait for all required tiles being loaded.
            if (tiles.length) {
                return;
            }
        }

        const result = provider._s(searchBBox);
        // var result =  provider.tree.search( searchBBox );

        if (onload) {
            onload(result);
        }

        return result;
    };


    // setUrl( url )
    // {
    //     this.loader.setUrl( url );
    // };

    getLoader() {
        return this.remoteTileLoader.loader;
    };

    config(cfg) {
        return super.config(cfg);
    };

    clear(tile?) {
        if (arguments.length == 0) {// full wipe!
            // this.loader.clear();
            // this.dep = {};
            this.remoteTileLoader.clear();
        }
        // TODO: add support for partial loader clearance
        super.clear.apply(this, arguments);
    };

    /**
     * Get a tile by quadkey.
     * If the tile is not cached already, it will be created and stored automatically.
     * Data will be fetched from remote data-sources and attached to tile automatically
     *
     * @param quadkey - quadkey of the tile
     * @param callback - will be called as soon as tile is ready for consumption
     * @returns the Tile
     */
    getTile(quadkey: string, cb: (tile: Tile) => void) {
        return this.remoteTileLoader.getTile(quadkey, cb);
    }

    _removeTile(tile: Tile, triggerEvent) {
        this.remoteTileLoader.drop(tile);
        super._removeTile(tile, triggerEvent);
    };

    // request individual features from backend
    protected abstract _requestFeatures(ids, onSuccess, onError, opt?);

    /**
     *  Commit modified/removed features to the remote backend.
     *
     *  @param data - the data that should be commit to the remote.
     *  @param onSuccess - callback function that will be called when data has been commit successfully
     *  @param onError - callback function that will be called when an error occurs
     */
    abstract commit(data: {
        /**
         * features that should be created or updated
         */
        put?: GeoJSONFeature[],
        /**
         * features that should be removed
         */
        remove?: GeoJSONFeature[]
    }, onSuccess?, onError?, transactionId?: string);

    readDirection(link: Feature): 'BOTH' | 'START_TO_END' | 'END_TO_START' {
        throw new Error(METHOD_NOT_IMPLEMENTED);
        // return 'BOTH';
    }

    readPedestrianOnly(link: Feature): boolean {
        throw new Error(METHOD_NOT_IMPLEMENTED);
    }

    writeTurnRestriction(restricted: boolean, turnFrom: { link: Feature; index: number; }, turnTo: { link: Feature; index: number; }) {
        throw new Error(METHOD_NOT_IMPLEMENTED);
    }

    readRoutingProvider(location: Feature, providers?: EditableFeatureProvider[]): string {
        return this.id;
    }

    readRoutingPosition(feature: any): GeoJSONCoordinate {
        throw new Error(METHOD_NOT_IMPLEMENTED);
    }

    readRoutingLink(feature: any): string | number {
        throw new Error(METHOD_NOT_IMPLEMENTED);
    }

    writeRoutingPosition(feature: any, position: GeoJSONCoordinate) {
        throw new Error(METHOD_NOT_IMPLEMENTED);
    }

    writeRoutingLink(location: any, link: Feature) {
        throw new Error(METHOD_NOT_IMPLEMENTED);
    }

    readTurnRestriction(turnFrom: { link: Feature; index: number; }, turnTo: { link: Feature; index: number; }): boolean {
        throw new Error(METHOD_NOT_IMPLEMENTED);
    }

    writeRoutingPoint(location, link: Navlink | null, position: GeoJSONCoordinate | null) {
        this.writeRoutingLink(location, link);
        this.writeRoutingPosition(location, position);
    };

    /**
     * Attribute writer for storing the EditStates of a Feature.
     * The EditStates provide information about whether a feature has been created, modified, removed or split.
     *
     * By default EditStates aren't tracked/stored.
     *
     * @param feature - The Feature whose EditState should be written.
     * @param editState - the EditState to store
     */
    writeEditState(feature, editState: 'created' | 'modified' | 'removed' | 'split') {
    }

    readFeatureHeight(feature: Feature): number | null {
        return null;
    };

    writeFeatureHeight(feature: Feature, height: number) {
        throw new Error(METHOD_NOT_IMPLEMENTED);
    }

    reserveId(createdFeatures, cb: (ids: (string | number)[]) => void) {
        let len = createdFeatures.length;
        const ids = [];
        let id;

        while (len--) {
            id = createdFeatures[len].id;

            if (typeof id == 'string' && id.length > 15) {
                ids.push(createdFeatures[len].id);
            } else {
                ids.push(JSUtils.String.random(16));
            }
        }

        setTimeout(() => {
            cb(ids.reverse());
        }, 0);
    };

    _clearOnCommit = true;

    isDroppable(feature: Feature | EditorFeature) {
        const editStates = (<EditorFeature>feature).editState && (<EditorFeature>feature).editState();
        return !editStates || (
            !editStates.modified &&
            !editStates.removed &&
            !editStates.split
        );
    }
}

// RemoteTileProvider.prototype.staticData = false;
