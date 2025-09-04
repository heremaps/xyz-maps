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

import {Feature} from '../features/Feature';
import Provider from './TileProvider/TileProvider';
import {AStar, geometry, geotools} from '@here/xyz-maps-common';
import {Tile} from '../tile/Tile';
import {calcBBox} from '../features/utils';
import RTree from '../features/RTree';
import {
    GeoJSONFeature,
    GeoJSONFeatureCollection,
    GeoJSONBBox,
    GeoJSONCoordinate
} from '../features/GeoJSON';
import {TileProviderOptions} from './TileProvider/TileProviderOptions';
import {GeoPoint} from '../geo/GeoPoint';
import {GeoRect} from '../geo/GeoRect';
import {PathFinder} from '../route/Route';
import {FeatureRegistry, FeatureRegistryInfo} from './FeatureRegistry';


const REMOVE_FEATURE_EVENT = 'featureRemove';
const ADD_FEATURE_EVENT = 'featureAdd';
const MODIFY_FEATURE_COORDINATES_EVENT = 'featureCoordinatesChange';

let UNDEF;

/**
 *  Feature provider.
 *
 */
export class FeatureProvider extends Provider {
    private fReg: FeatureRegistry; // Map<string | number, FeatureStorageInfo> = new Map();

    Feature: any;

    dataType = 'json';

    tree: RTree;

    private filter: (feature) => boolean;

    // protected isDroppable: any = null;

    protected isDroppable(feature) {
        return true;
    }

    /**
     *  @param options - options to configure the provider
     */
    constructor(options: TileProviderOptions) {
        super(options);

        this.tree = new RTree(9);
        this.fReg = new FeatureRegistry();
        this.Feature = this.Feature || Feature;

        [
            ADD_FEATURE_EVENT,
            'featuresAdd',
            REMOVE_FEATURE_EVENT,
            'featuresRemove',
            MODIFY_FEATURE_COORDINATES_EVENT
        ].forEach((type) => this.listeners.addEvent(type));
    }

    protected insertTileData(tile: Tile, data: GeoJSONFeature[], onDone: (data: any) => void, triggerEvent: boolean = true) {
        const provider = this;
        let unique = [];

        for (let feature of data) {
            const prepared = provider.prepareFeature(feature);
            if (prepared !== false) {
                // filter out the duplicates
                const inserted = provider._insert(prepared);
                if (inserted) {
                    unique[unique.length] = inserted;
                } else if (/* provider.indexed &&*/ !provider.tree) { // NEEDED FOR MULTI TREE!
                    unique[unique.length] = provider.getFeature(prepared.id);
                }
            } else {
                // unknown feature
                console.warn('Invalid feature skipped:', feature);
            }
        }

        if (provider.tree) {
            // if( provider.indexed ){
            provider.tree.load(unique);
            // }
            unique = provider.clipped
                ? unique
                : provider.search(tile.getContentBounds());
        }

        for (let feature of unique) {
            provider._mark(feature, tile);
        }

        if (triggerEvent) {
            provider.dispatchEvent('tileInitialized', {features: unique, tiles: [tile]});
        }

        onDone(unique);
        // if (provider.margin) {
        //     // additional mark in dep tiles is required because actual data of tile is bigger
        //     // than received data..It may also contain data of neighbour tiles
        //     for (var d = 0, l = tile.data.length; d < l; d++) {
        //         provider._mark(tile.data[d], tile);
        //     }
        // }
        // provider.execTile(tile);
    }


    /**
     * Add a feature to the provider.
     *
     * @param feature - the feature to be added to the provider
     *
     * @example
     * ```
     * // add a feature to the provider.
     * provider.addFeature({
     *    type: "Feature"
     *    geometry: {
     *        coordinates: [[-122.49373, 37.78202], [-122.49263, 37.78602]],
     *        type: "LineString"
     *    }
     * });
     * ```
     */
    addFeature(feature: GeoJSONFeature | Feature): Feature;

    /**
     * Add multiple features to the provider.
     *
     * @param feature - the features to be added to the provider
     *
     * @example
     * ```
     * // add multiple features to the provider.
     * provider.addFeature([{
     *    type: "Feature"
     *    geometry: {
     *        coordinates: [[-122.49373, 37.78202], [-122.49263, 37.78602]],
     *        type: "LineString"
     *    }
     * },{
     *    type: "Feature"
     *    geometry: {
     *        coordinates: [[-122.49375, 37.78203], [-122.49265, 37.78604]],
     *        type: "LineString"
     *    }
     * }]);
     * ```
     */
    addFeature(feature: GeoJSONFeatureCollection | GeoJSONFeature[]): Feature[];

    addFeature(feature: GeoJSONFeature | Feature | GeoJSONFeatureCollection | GeoJSONFeature[], updateTileSet?: Set<Tile>);
    addFeature(feature: GeoJSONFeature | Feature | GeoJSONFeatureCollection | GeoJSONFeature[], updateTileSet?: Set<Tile>): Feature | Feature[] {
        const provider = this;
        let prepared;
        let inserted;

        if (typeof feature != 'object') return;

        if ((<GeoJSONFeatureCollection>feature).type == 'FeatureCollection') {
            feature = (<GeoJSONFeatureCollection>feature).features || [];
        }

        if (Array.isArray(feature)) {
            const result: Feature[] = [];

            if (!provider.ignore) {
                updateTileSet = new Set<Tile>();
            }
            for (let f = 0, len = feature.length; f < len; f++) {
                result[f] = provider.addFeature(feature[f], updateTileSet);
            }

            if (updateTileSet) {
                provider.dispatchEvent('featuresAdd', {features: result, tiles: Array.from(updateTileSet)});
            }
            return result;
        }

        if (provider.isFeatureInstance(feature, Feature)) {
            const prov = (<Feature>feature).getProvider();
            if (prov && prov != provider) {
                feature = (<Feature>feature).toJSON();
            }
        }

        prepared = provider.prepareFeature(<Feature>feature);

        if (prepared !== false) {
            inserted = provider._insert(prepared);

            if (inserted != UNDEF) {
                feature = inserted;

                const tiles = provider.getCachedTiles(provider.decBBox(feature));

                for (let tile of tiles) {
                    tile.add(<Feature>feature);

                    updateTileSet?.add(tile);

                    if (tile.z == provider.level) {
                        this._mark(feature, tile);
                    }
                }

                provider.tree?.insert(feature as GeoJSONFeature);

                if (!provider.ignore && !updateTileSet) {
                    provider.dispatchEvent('featuresAdd', {features: [feature], tiles});
                }
            }
        } else {
            //  unkown feature
            console.warn('Invalid feature skipped:', feature);

            feature = null;
        }

        return <Feature>feature;
    };

    /**
     * Add an EventListener to the provider.
     * Valid events: "featureAdd", "featureRemove", "featureCoordinatesChange", "clear" and "error"
     *
     * The detail property of the Event gives additional information about the event.
     * detail.provider is a reference to the provider onto which the event was dispatched and is set for all events.
     *
     * @param type - A string representing the event type to listen for
     * @param listener - the listener function that will be called when an event of the specific type occurs
     */
    addEventListener(type: string, listener: (e: CustomEvent) => void, _c?) {
        // @ts-ignore
        return super.addEventListener(type, listener, _c);
    }

    /**
     * Remove an EventListener from the provider.
     * Valid events: "featureAdd", "featureRemove", "featureCoordinatesChange", "clear" and "error"
     *
     * @param type - A string which specifies the type of event for which to remove an event listener.
     * @param listener - The listener function of the event handler to remove from the provider.
     */
    removeEventListener(type: string, listener: (event: CustomEvent) => void, _c?) {
        // @ts-ignore
        return super.removeEventListener(type, listener, _c);
    };

    /**
     * Get all the features that are currently present in the provider.
     */
    all(): Feature[] {
        return this.fReg.toArray();
    };

    /**
     *  Gets a feature from the provider by id.
     *
     *  @param id - the id of the feature
     *
     *  @returns the found feature or undefined if feature is not present.
     */
    getFeature(id: string | number): Feature | undefined {
        return this.fReg.get(id)?.feature;
    };

    /**
     *  Gets features from provider by id.
     *
     *  @param ids - array of feature ids to search for.
     *  @returns if just a single feature is found its getting returned otherwise an array of features or undefined if none is found.
     */
    getFeatures(ids: string[] | number[]): Feature[] | Feature | undefined {
        if (!(ids instanceof Array)) {
            ids = [ids];
        }

        const result = [];

        for (let i = 0; i < ids.length; i++) {
            result[i] = this.getFeature(ids[i]);
        }

        return result.length == 1
            ? result[0]
            : result;
    };


    createStorageTile(quadkey: string) {
        const {storage} = this;
        let tile = storage.get(quadkey);

        if (tile === UNDEF) {
            storage.set(
                tile = this.createTile(quadkey)
            );
            tile.loadStartTs = Date.now();
        }
        return tile;
    }

    /**
     * Get a tile by quadkey.
     * If the tile is not cached already, it will be created and stored automatically.
     *
     * @param quadkey - quadkey of the tile
     * @param callback - the callback function
     * @returns the Tile
     */
    getTile(quadkey: string, callback?: (tile: Tile) => void): Tile | undefined {
        const provider = this;
        const tile = provider.createStorageTile(quadkey);

        if (!tile.loadStopTs) {
            tile.data = provider.search(tile.getContentBounds());
            tile.loadStopTs = Date.now();
        }
        callback?.(tile);

        return tile;
    };

    // /**
    //  *  Set provider filter.
    //  *
    //  *  @public
    //  *  @expose
    //  *  @function
    //  *  @name here.xyz.maps.providers.FeatureProvider#setFilter
    //  *  @param {function} filter
    //  */
    setFilter(filter) {
        this.filter = typeof filter == 'function'
            ? filter
            : UNDEF; // clear filter
    };

    getFeatureClass(o) {
        return this.Feature;
    };

    isFeatureInstance(o, Feature) {
        return o instanceof Feature;
    }

    createFeature(o, Feature) {
        const feature = new Feature(o, this);
        return feature;
    };

    /**
     * Search for feature(s) in the provider.
     *
     * @param options - configure the search
     *
     * @example
     * ```typescript
     * // searching by id:
     * layer.search({id: 1058507462})
     * // or:
     * layer.search({ids: [1058507462, 1058507464]})
     *
     * // searching by point and radius:
     * layer.search({
     *  point: { longitude: 72.84205, latitude: 18.97172 },
     *  radius: 100
     * })
     *
     * // searching by Rect:
     * layer.search({
     *  rect:  { minLon: 72.83584, maxLat: 18.97299, maxLon: 72.84443, minLat: 18.96876 }
     * })
     * ```
     * @returns array of features
     */
    search(options: {
        /**
         * search feature by id.
         */
        id?: number | string,
        /**
         * Array of feature ids to search.
         */
        ids?: number[] | string[],
        /**
         * Geographical center point of the point to search in. options.radius must be defined.
         */
        point?: GeoPoint,
        /**
         * Radius of the point in meters, it is used in "point" search.
         */
        radius?: number,
        /**
         * Geographical Rectangle to search in. [minLon, minLat, maxLon, maxLat] | GeoRect.
         */
        rect?: GeoRect | GeoJSONBBox
    }): Feature | Feature[];

    /**
     * Point Search for feature(s) in provider.
     * @param point - Geographical center point of the point to search in. options.radius must be defined.
     * @param options - configure the search
     *
     * @example
     * ```typescript
     * layer.search({longitude: 72.84205, latitude: 18.97172},{
     *  radius: 100
     * })
     * // or:
     * layer.search([72.84205, 18.97172], {
     *  radius: 100
     * })
     * ```
     */
    search(point: GeoPoint, options?: {
        /**
         * The radius of the circular area in meters to search in.
         */
        radius: number
    }): Feature[];

    /**
     * Rectangle Search for feature(s) in provider.
     * @param rect - Geographical Rectangle to search in. [minLon, minLat, maxLon, maxLat] | GeoRect.
     *
     * @example
     * ```
     * layer.search({minLon: 72.83584, maxLat: 18.97299, maxLon: 72.84443, minLat: 18.96876})
     * // or:
     * layer.search([72.83584, 18.96876, 72.84443,18.97299])
     * ```
     */
    search(rect: GeoRect | GeoJSONBBox): Feature[];

    /**
     * Search for feature by id in the provider.
     *
     * @param id - id of the feature to search for
     *
     * @example
     * ```
     * layer.search(1058507462)
     * ```
     */
    search(id: string | number): Feature;

    search(bbox, options?): Feature | Feature[] {
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
        // const onload = options['onload'];
        let radius = options && options['radius'] || 1;


        if (bbox instanceof Array) {
            if (bbox.length == 4) { // it's just a point
                searchBBox = bbox; // [ bbox[1], bbox[2], bbox[3], bbox[0] ];
            } else {
                searchBBox = geotools.getPointBBox(<GeoJSONCoordinate>bbox, radius);
            }
        } else if (typeof bbox == 'number' || typeof bbox == 'string' || !bbox) { // search per ID
            return provider.getFeatures(bbox);
        } else if (bbox['longitude'] != UNDEF && bbox['latitude'] != UNDEF) {
            searchBBox = geotools.getPointBBox(
                [bbox['longitude'], bbox['latitude']],
                radius
            );
        } else if (
            bbox['minLon'] != UNDEF && bbox['minLat'] != UNDEF && bbox['maxLon'] != UNDEF && bbox['maxLat'] != UNDEF
        ) {
            searchBBox = [bbox['minLon'], bbox['minLat'], bbox['maxLon'], bbox['maxLat']];
        } else if (geo = bbox['point'] || bbox['rect'] || bbox['viewport']) {
            return provider.search(geo, options);
        } else if (bbox['id'] || bbox['ids']) {
            return provider.getFeatures(
                bbox['id'] || bbox['ids']
            );
        }

        searchBBox = {
            minX: searchBBox[0],
            minY: searchBBox[1],
            maxX: searchBBox[2],
            maxY: searchBBox[3]
        };

        const result = provider._s(searchBBox);

        // if ( onload ) {
        //     onload( result );
        // }

        return result;
    };


    /**
     *  Validate if a feature is stored in the local provider cache.
     *
     *  @param feature - Object literal containing "id" property.
     *  @returns the {@link Feature} if it is found, otherwise undefined
     */
    exists(feature: { id: number | string }): { feature?: Feature } {
        return this.fReg.get(feature.id); // ?.feature;
    };


    /**
     * Modify coordinates of a feature in the provider.
     *
     * @param feature - the Feature whose coordinates should be modified/updated
     * @param coordinates - the modified coordinates to set. The coordinates must match features geometry type.
     */
    setFeatureCoordinates(feature: Feature, coordinates: GeoJSONCoordinate | GeoJSONCoordinate[] | GeoJSONCoordinate[][] | GeoJSONCoordinate[][][]) {
        const _feature = feature;
        // if( this.exists(feature) )
        if (feature = this.getFeature(feature.id)) {
            const prevBBox = feature.getBBox();
            // var prevBBox        = feature.bbox.slice();
            const {geometry} = feature;
            const prevCoordinates = geometry.coordinates;

            // make sure listeners are not getting triggered for remove+add of feature.
            this.ignore = true;
            // remove from provider to make sure tile data and tree is balanced correctly.
            this.removeFeature(feature);
            if ((<any>geometry)._xyz) {
                // clear cached triangulation data
                delete (<any>geometry)._xyz;
            }
            // set the new geometry
            geometry.coordinates = this.encCoord(geometry.type, coordinates);
            // make sure correct bbox is set while getting added.
            feature.bbox = null;
            // ..
            this.addFeature(feature);
            // re-enable the event triggering
            this.ignore = false;

            // // reintegrate to tree, update bounding box and coordinates
            // this.tree.remove( feature );
            //
            // feature.geometry.coordinates = coordinates;
            //
            // this.prepare.updateBBox( feature );
            // this.tree.insert( feature );


            this.dispatchEvent(MODIFY_FEATURE_COORDINATES_EVENT, {
                feature,
                prevBBox,
                prevCoordinates,
                provider: this
            });
        } else {
            // update geometry/bbox although object isn't registered..
            _feature.geometry.coordinates = coordinates;
            _feature.bbox = null;
            this.updateBBox(_feature);
        }
    };

    /**
     * Remove feature(s) from the provider.
     *
     * @param feature - features that should be removed from the provider
     */
    removeFeature(feature: GeoJSONFeature | Feature | GeoJSONFeatureCollection | GeoJSONFeature[]);

    removeFeature(feature: GeoJSONFeature | Feature | GeoJSONFeatureCollection | GeoJSONFeature[], updateTileSet?: Set<Tile>);
    removeFeature(feature: GeoJSONFeature | Feature | GeoJSONFeatureCollection | GeoJSONFeature[], updateTileSet?: Set<Tile>) {
        if (feature) {
            if ((<GeoJSONFeatureCollection>feature).type == 'FeatureCollection') {
                feature = (<GeoJSONFeatureCollection>feature).features;
            }
            if (Array.isArray(feature)) {
                const result = [];
                if (!this.ignore) {
                    updateTileSet = new Set<Tile>();
                }
                for (let f = 0, len = feature.length; f < len; f++) {
                    result[f] = this.removeFeature(feature[f], updateTileSet);
                }
                if (updateTileSet) {
                    this.dispatchEvent('featuresRemove', {features: result, tiles: Array.from(updateTileSet)});
                }
                return result;
            }

            if (feature = this.getFeature((<GeoJSONFeature>feature).id)) {
                const tiles = this.getCachedTiles(this.decBBox(feature));

                for (let tile of tiles) {
                    if (tile.isLoaded()) {
                        updateTileSet?.add(tile);
                        tile.remove(<Feature>feature);
                        // tileIndex = tile.data.indexOf(feature);
                        // if( tileIndex !== -1 ){
                        //     tile.data.splice(tileIndex,1);
                        // }
                    }
                }

                this.cnt--;

                this.fReg.delete(feature.id);

                this.tree?.remove(feature);

                // delete feature._provider;

                if (!this.ignore) {
                    this.dispatchEvent('featuresRemove', {features: [feature], tiles});
                    // this.dispatchEvent(REMOVE_FEATURE_EVENT, {feature, tiles});
                }
            }
        }
        return feature;
    };


    /**
     * Finds the optimal path between two coordinates on a GeoJSON road network, considering various options.
     * By default, the weight function returns the distance of the road segment, a lower distance implies a shorter route and is considered more favorable.
     * If you have specific criteria such as road quality, traffic conditions, or other factors influencing the desirability of a road segment, you can customize the weight function accordingly.
     * Pathfinding will consider only the locally cached data available on the client.
     *
     * @experimental
     *
     * @param options - The options object containing parameters for finding the path.
     * @returns {Promise<{
     *   features: Feature[];
     *   readonly path: GeoJSONFeature<MultiLineString>;
     *   readonly distance: number;
     *   from: GeoJSONCoordinate;
     *   to: GeoJSONCoordinate;
     * }>} A Promise that resolves to an object containing the path, additional information, and the distance of the path.
     *
     * @example
     * ```typescript
     * const pathOptions = {
     *   from: [startLongitude, startLatitude],
     *   to: [endLongitude, endLatitude],
     *   // optional
     *   allowTurn: (turn) => {
     *      // Custom logic to determine whether a turn is allowed
     *     return true;
     *   },
     *   // optional
     *   weight: (data) => {
     *     // Custom weight function to determine the cost of traversing a road segment
     *     return data.distance; // Default implementation uses distance as the weight
     *   },
     * };
     * const result = await provider.findPath(pathOptions);
     * console.log(result);
     * ```
     */
    async findPath(options: {
        /**
         * The starting coordinates defining the path.
         */
        from: GeoJSONCoordinate | GeoPoint,
        /**
         * The ending coordinates of the path.
         */
        to: GeoJSONCoordinate | GeoPoint,
        /**
         * Optional callback function to determine if a turn is allowed between road segments.
         * If not provided, all turns are considered allowed.
         *
         * @param {object} turn - Object containing information about the turn, including source and destination road segments.
         * @returns {boolean} `true` if the turn is allowed, `false` otherwise.
         */
        allowTurn?: (turn: {
            /**
             * Object representing the source road segment of the turn.
             */
            readonly from: {
                /**
                 * GeoJSON Feature representing the source road segment.
                 */
                readonly link: Feature<'LineString'>,
                /**
                 * Index of the Coordinates array of the source road segment.
                 */
                readonly index: number
            },
            /**
             * Object representing the destination road segment of the turn.
             */
            readonly to: {
                /**
                 * GeoJSON Feature representing the destination road segment.
                 */
                readonly link: Feature<'LineString'>,
                /**
                 * Index of the Coordinates array of the destination road segment.
                 */
                readonly index: number
            }
        }) => boolean,
        /**
         * Optional callback function to determine the weight (cost) of traversing a road segment.
         *
         * @param {object} data - Object containing information about the road segment.
         * @returns {number} A numerical value representing the weight or cost of traversing the road segment. Default is the distance in meter.
         */
        weight?: (data: {
            /**
             * Starting coordinates of the road segment.
             */
            from: GeoJSONCoordinate,
            /**
             * Ending coordinates of the road segment.
             */
            to: GeoJSONCoordinate,
            /**
             * Feature representing the road segment.
             */
            feature: Feature<'LineString'>,
            /**
             * Direction of traversal on the road segment.
             */
            direction: 'START_TO_END' | 'END_TO_START',
            /**
             * The Distance of the road in meters.
             */
            distance: number
        }) => number
    })
    /**
     * A Promise that resolves to an object containing the path and additional information.
     */
        : Promise<{
        /**
         * A GeoJSON Feature of geometry type MultiLineString representing the geometry of the found path.
         */
        readonly path: GeoJSONFeature<'MultiLineString'>;
        /**
         * An array of GeoJSON features representing the road segments in the path.
         */
        features: Feature<'LineString'>[];
        /**
         * the distance in meter of the path.
         */
        readonly distance: number;
        /**
         * The starting coordinates of the path.
         */
        from: GeoJSONCoordinate;
        /**
         * The end coordinates of the path.
         */
        to: GeoJSONCoordinate
    }> {
        if (!options?.from || !options?.to) return null;
        const toGeoJsonCoordinate = (p: GeoPoint | GeoJSONCoordinate): GeoJSONCoordinate => {
            if (typeof (p as GeoPoint).longitude == 'number') {
                const alt = (p as GeoPoint).altitude;
                p = [(p as GeoPoint).longitude, (p as GeoPoint).latitude];
                if (typeof alt == 'number') p[2] = alt;
            }
            return p as GeoJSONCoordinate;
        };

        const from = toGeoJsonCoordinate(options.from);
        const to = toGeoJsonCoordinate(options.to);
        const ignoreZ = from.length + to.length < 6;
        const findPointOnLineString = (lineString: GeoJSONCoordinate[], point: GeoJSONCoordinate) => geometry.findPointOnLineString(lineString, point, ignoreZ);

        const findNearestNode = (point: number[], radius: number = 100, maxRadius = 10_000) => {
            const features = <Feature[]> this.search({point: {longitude: point[0], latitude: point[1]}, radius});
            if (!features.length && radius < maxRadius) return findNearestNode(point, radius * 10);

            const start = {distance: Infinity, feature: null, point: null, index: null, segment: null};
            for (let feature of features) {
                if (feature.geometry.type != 'LineString') continue;

                const coordinates = feature.geometry.coordinates as GeoJSONCoordinate[];
                const last = coordinates.length - 1;
                const result = findPointOnLineString(coordinates, point);
                const distance = geotools.distance(result.point, point);

                if (distance < start.distance) {
                    start.distance = distance;
                    start.feature = feature;
                    const distanceToStartNode = geotools.distance(result.point, coordinates[0]);
                    const distanceToEndNode = geotools.distance(result.point, coordinates[last]);

                    if (distanceToStartNode < distanceToEndNode) {
                        start.index = 0;
                    } else {
                        start.index = last;
                    }
                    start.point = coordinates[start.index];
                    start.segment = result.segment;
                }
            }
            return start;
        };

        const start = findNearestNode(<GeoJSONCoordinate>from);
        const end = findNearestNode(<GeoJSONCoordinate>to);

        if (!start.feature || !end.feature) return null;

        const fromNode = {
            point: start.feature.geometry.coordinates[start.index],
            data: {
                link: start.feature,
                index: start.index
            }
            // id: start.feature
        };
        const toNode = {
            point: end.feature.geometry.coordinates[end.index],
            data: {
                link: end.feature,
                index: end.index
            }
            // id: end.feature
        };

        const nodes = await PathFinder.findPath(this, fromNode, toNode, options?.allowTurn || (() => true), options?.weight);

        if (nodes?.length) {
            return {
                from: [...fromNode.point],
                to: [...toNode.point],
                features: nodes.map((node) => node.data.link) as Feature<'LineString'>[],
                get distance() {
                    let distance = 0;
                    for (let lineString of this.path.geometry.coordinates) {
                        for (let i = 1, len = lineString.length; i < len; i++) {
                            distance += geotools.distance(lineString[i - 1], lineString[i]);
                        }
                    }
                    return distance;
                },
                get path() {
                    const {features} = this;
                    let coords0 = [...features[0].geometry.coordinates];
                    let coords1 = features[1].geometry.coordinates;

                    if (AStar.isPointEqual(coords0[0], coords1[0]) || AStar.isPointEqual(coords0[0], coords1[coords1.length - 1])) {
                        // the travel of direction of the first lineString is reversed
                        coords0.reverse();
                    }
                    const multiLineString = [coords0];

                    for (let i = 1; i < features.length; i++) {
                        const prevCoordinates = multiLineString[i - 1];
                        const lineString = [...features[i].geometry.coordinates];
                        if (!AStar.isPointEqual(lineString[0], prevCoordinates[prevCoordinates.length - 1])) {
                            // does not match initial travel of direction
                            lineString.reverse();
                        }
                        multiLineString.push(lineString);
                    }

                    const {point, segment} = findPointOnLineString(multiLineString[0], from as GeoJSONCoordinate);
                    multiLineString[0] = multiLineString[0].slice(segment);
                    multiLineString[0][0] = point;

                    const lastIndex = multiLineString.length - 1;
                    let {
                        point: pointEnd,
                        segment: segmentEnd
                    } = findPointOnLineString(multiLineString[lastIndex], to as GeoJSONCoordinate);

                    multiLineString[lastIndex] = multiLineString[lastIndex].slice(0, segmentEnd + 1);
                    multiLineString[lastIndex][segmentEnd + 1] = pointEnd;

                    return {
                        type: 'Feature',
                        geometry: {
                            type: 'MultiLineString',
                            coordinates: multiLineString
                        },
                        properties: {}
                    };
                }
            };
        }
    }

    clear(bbox?: GeoJSONBBox | Tile | Tile[], triggerEvent?: boolean): string[] | null {
        const provider = this;
        if (!bbox) {
            // full wipe
            provider.tree?.clear();

            const {fReg} = provider;
            const featuresInfo = fReg.toArray();
            fReg.clear();

            for (const feature of featuresInfo) {
                if (!provider.isDroppable(feature)) {
                    fReg.set(feature.id, new FeatureRegistryInfo(feature));
                    provider.tree?.insert(feature);
                }
            }
            provider.cnt = fReg.size();
        }
        return super.clear(bbox, triggerEvent);
    };

    _insert(feature: GeoJSONFeature): Feature {
        // TODO: overwrite for providers providing splitted geo from tilehub
        const id = feature.id;// + o.bbox;

        let inserted = null;
        const FeatureClass = this.getFeatureClass(feature);

        const filter = this.filter;

        // if( typeof this.filter != 'function' || this.filter(o) )
        if (!filter || filter(feature)) {
            // filter out the duplicates!!
            if (
                !this.fReg.has(id)
            ) { // not in tree already??
                this.cnt++;

                if (this.isFeatureInstance(feature, FeatureClass)) {
                    (<any>feature)._provider = this;
                } else {
                    // USE FOR FASTER PROP LOOKUP -> FASTER COMBINE ACROSS TILES!

                    feature = this.createFeature(feature, FeatureClass);
                }

                this.updateBBox(feature);

                this.fReg.set(String(id), new FeatureRegistryInfo(feature as Feature));

                inserted = feature;
            }
        }

        return inserted;
    };

    _mark(o, tile: Tile) {
        this.fReg.get(o.id)?.tiles.add(tile.quadkey);
    };


    _removeTile(tile: Tile, triggerEvent?) {
        const prov = this;
        // let depTiles;
        let data;
        const qk = tile.quadkey;

        prov.storage.remove(tile);

        const tileDestroyedEvent = 'tileDestroyed';
        const droppedFeatures: Feature[] = prov.listeners.isListened(tileDestroyedEvent) && [];

        if (data = tile.data) {
            for (let feature of data) {
                if (prov._dropFeature(feature, qk, triggerEvent) && droppedFeatures) {
                    droppedFeatures.push(feature);
                }
            }
        }
        if (droppedFeatures) {
            prov.dispatchEvent(tileDestroyedEvent, {features: droppedFeatures, tiles: [tile]});
        }
    };

    _dropFeature(feature: Feature, qk: string, trigger?: boolean): boolean {
        const provider = this;
        const featureStoreInfo = provider.fReg.get(feature.id);

        if (featureStoreInfo) {
            const tiles = featureStoreInfo.tiles;
            tiles.delete(qk);

            if (!tiles.size && provider.isDroppable(feature)) {
                provider.cnt--;
                provider.fReg.delete(feature.id);
                provider.tree?.remove(feature);
                return true;
            }
        }
    };

    _s(searchBBox, tilePyramid?: string): Feature[] {
        if (this.tree) {
            return this.tree.search(searchBBox) as Feature[];
        }
        const prov = this;
        const mergeID = Math.random();
        const {level} = prov;
        let data;

        prov.storage.forEach((tile) => {
            if (tile.z != level || !tile.isLoaded() ||
                // Verify that the tile is part of the specified tile pyramid,
                // considering clipped data with offset and neighboring tiles.
                tilePyramid?.indexOf(tile.quadkey) == -1
            ) {
                return;
            }
            // var start = performance.now();
            const tileData = tile.search(searchBBox);

            if (tileData.length) {
                if (!data) {
                    data = tileData;
                    for (let feature of data) {
                        feature._m = mergeID;
                    }
                } else {
                    for (let feature of tileData) {
                        if (feature._m != mergeID) {
                            feature._m = mergeID;
                            data[data.length] = feature;
                        }
                    }
                }
            }
        });
        return data || [];
    };

    encCoord(type, coordinates) {
        return coordinates;
    }

    decCoord(feature) {
        return feature.geometry.coordinates;
    }

    decBBox(feature) {
        return feature.bbox;
    }

    // ignore listener triggering in case of feature geometry modify can result in internal remove+add
    ignore = false;

    cnt = 0;

    __type = 'FeatureProvider';

    prepareFeature(feature: GeoJSONFeature): GeoJSONFeature | false {
        feature.id ??= Math.random() * 1e8 ^ 0;
        // calculates object bbox's
        if (!feature.bbox) {
            // false -> unknown feature -> no success
            return this.updateBBox(feature) && feature;
        } else if ((<number[]>feature.bbox).length === 6) { // convert to 2D bbox
            feature.bbox = [feature.bbox[0], feature.bbox[1], feature.bbox[3], (<number[]>feature.bbox)[4]];
        }
        return feature;
    };

    updateBBox(feature: GeoJSONFeature | Feature): boolean {
        if (!feature.bbox) {
            const bbox = calcBBox(feature);
            if (bbox) {
                feature.bbox = <GeoJSONBBox>bbox;
                const geometry = (feature as Feature).geometry;
                if (geometry._c) {
                    // clear cached centroid
                    geometry._c = null;
                }
                if (geometry._pc) {
                    // clear cached projected polygon center
                    geometry._pc = null;
                }
            } else {
                return false;
            }
        }
        return true;
    };
}

// deprecated fallback..
(<any>FeatureProvider.prototype).modifyFeatureCoordinates = FeatureProvider.prototype.setFeatureCoordinates;
