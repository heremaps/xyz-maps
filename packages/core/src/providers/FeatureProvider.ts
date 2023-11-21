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
import {geotools} from '@here/xyz-maps-common';
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


const REMOVE_FEATURE_EVENT = 'featureRemove';
const ADD_FEATURE_EVENT = 'featureAdd';
const MODIFY_FEATURE_COORDINATES_EVENT = 'featureCoordinatesChange';

let UNDEF;


function FeatureStorageInfo(feature) {
    this.feature = feature;
}

FeatureStorageInfo.prototype.cnt = 0;

/**
 *  Feature provider.
 *
 */
export class FeatureProvider extends Provider {
    IDPOOL = {};

    Feature: any;

    dataType = 'json';

    tree: any;

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

        this.Feature = this.Feature || Feature;

        [
            ADD_FEATURE_EVENT,
            REMOVE_FEATURE_EVENT,
            MODIFY_FEATURE_COORDINATES_EVENT
        ].forEach((type) => this.listeners.addEvent(type));
    }

    protected loadTileData(tile: Tile, data: any[], onDone: (data: any) => void) {
        const provider = this;
        const unique = [];
        let len = data.length;
        let prepared;
        let inserted;
        let o;

        for (var i = 0; i < len; i++) {
            prepared = provider.prepareFeature(o = data[i]);

            if (prepared !== false) {
                o = prepared;

                inserted = provider._insert(o, tile);

                // filter out the duplicates!!
                if (inserted) {
                    o = inserted;
                    unique[unique.length] = o;
                } else if (/* provider.indexed &&*/ !provider.tree) { // NEEDED FOR MULTI TREE!
                    unique[unique.length] = provider.getFeature(o.id);
                }
            } else {
                // unkown feature
                console.warn('unkown feature detected..', o.geometry.type, o);
                data.splice(i--, 1);
                len--;
            }
        }

        data = unique;

        // if( provider.indexed )
        // {
        if (provider.tree) {
            provider.tree.load(data);
        }
        // }

        data = provider.clipped
            ? data
            : provider.search(tile.getContentBounds());

        onDone(data);
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

    addFeature(feature: GeoJSONFeature | Feature | GeoJSONFeatureCollection | GeoJSONFeature[]): Feature | Feature[] {
        const provider = this;
        let prepared;
        let inserted;

        if (typeof feature != 'object') return;

        if ((<GeoJSONFeatureCollection>feature).type == 'FeatureCollection') {
            feature = (<GeoJSONFeatureCollection>feature).features || [];
        }

        if (Array.isArray(feature)) {
            const result: Feature[] = [];

            for (let f = 0, len = feature.length; f < len; f++) {
                result[f] = provider.addFeature(feature[f]);
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

                const tiles = provider.getCachedTilesOfBBox(provider.decBBox(feature));

                for (let t = 0, tile; t < tiles.length; t++) {
                    tile = tiles[t];

                    tile.add(feature);

                    if (tile.z == provider.level) {
                        this._mark(feature, tile);
                    }
                }

                if (provider.tree) {
                    provider.tree.insert(feature);
                }

                if (!provider.ignore) {
                    provider.dispatchEvent(ADD_FEATURE_EVENT, {feature: feature, tiles: tiles});
                }
            }
        } else {
            //  unkown feature
            console.warn('unkown feature detected..', feature);

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
        const prov = this;

        if (prov.tree) {
            return prov.tree.all();
        }

        return prov._s({
            minX: -180,
            maxX: 180,
            minY: -90,
            maxY: 90
        });

        // very slow for 100K+ entries...
        // var data = [], pool = prov.IDPOOL;
        // for(var id in pool)
        //     data.push( pool[id].feature )
        // return data;
    };

    /**
     *  Gets a feature from the provider by id.
     *
     *  @param id - the id of the feature
     *
     *  @returns the found feature or undefined if feature is not present.
     */
    getFeature(id: string | number): Feature | undefined {
        if (this.IDPOOL[id]) {
            return this.IDPOOL[id].feature;
        }
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
        const storage = provider.storage;
        let tile = storage.get(quadkey);

        if (tile === UNDEF) {
            storage.set(
                tile = provider.createTile(quadkey)
            );

            // tile.provider    = provider;
            tile.loadStartTs = tile.loadStopTs = Date.now();

            // var tileBounds = utils.getGeoBounds.call(utils, tile.z, tile.y, tile.x);
            // tile.data      = this.tree.search([tileBounds[1], tileBounds[2], tileBounds[3], tileBounds[0]]);


            tile.data = provider.search(tile.getContentBounds());
            // tile.data = this.tree.search.call( this.tree, tile.getContentBounds() )
        }

        callback && callback(tile);

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
    exists(feature: { id: number | string }): Feature {
        return this.IDPOOL[feature.id];
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
    removeFeature(feature: GeoJSONFeature | Feature | GeoJSONFeatureCollection | GeoJSONFeature[]) {
        if (feature) {
            if ((<GeoJSONFeatureCollection>feature).type == 'FeatureCollection') {
                feature = (<GeoJSONFeatureCollection>feature).features;
            }
            if (Array.isArray(feature)) {
                const result = [];
                for (let f = 0, len = feature.length; f < len; f++) {
                    result[f] = this.removeFeature(feature[f]);
                }
                return result;
            }


            if (feature = this.getFeature((<GeoJSONFeature>feature).id)) {
                const tiles = this.getCachedTilesOfBBox(this.decBBox(feature));
                let tile;

                for (let t = 0; t < tiles.length; t++) {
                    tile = tiles[t];

                    if (tile.isLoaded()) {
                        tile.remove(feature);

                        // tileIndex = tile.data.indexOf(feature);
                        //
                        // if( tileIndex !== -1 )
                        // {
                        //     tile.data.splice(tileIndex,1);
                        // }
                    }
                }

                this.cnt--;

                delete this.IDPOOL[feature.id];

                if (this.tree) {
                    this.tree.remove(feature);
                }

                // delete feature._provider;

                if (!this.ignore) {
                    this.dispatchEvent(REMOVE_FEATURE_EVENT, {feature, tiles});
                }
            }
        }

        return feature;
    };

    /**
     *  Clear all tiles and features of a given bounding box or do a full wipe if no parameter is given.
     *
     *  @param bbox - array of geographical coordinates [minLon, minLat, maxLon, maxLat] defining the area to clear.
     */
    clear(bbox?: number[]) {
        const provider = this;
        let dataQuads = null;
        let feature;

        if (arguments.length == 4) {
            bbox = Array.prototype.slice.call(arguments);
        }

        if ( // wipe all cached tiles containing provided bbox
            bbox instanceof Array
        ) {
            dataQuads = provider.getCachedTilesOfBBox(bbox, provider.level);

            for (let d = 0, tile; d < dataQuads.length; d++) {
                tile = dataQuads[d];

                provider._removeTile(tile, false);

                dataQuads[d] = tile.quadkey;
            }
        } else if (arguments.length == 0) { // full wipe
            const protectedFeatures = {};
            const idPool = provider.IDPOOL;
            let cnt = 0;


            if (provider.tree) {
                provider.tree.clear();
            }

            for (const id in idPool) {
                feature = provider.getFeature(id);

                if (!provider.isDroppable(feature)) {
                    protectedFeatures[id] = new FeatureStorageInfo(feature);

                    cnt++;

                    if (provider.tree) {
                        provider.tree.insert(feature);
                    }
                }
            }

            provider.cnt = cnt;
            provider.IDPOOL = protectedFeatures;

            // Provider clears complete tile storage
            Provider.prototype.clear.call(this, bbox);
        }

        provider.dispatchEvent('clear', {tiles: dataQuads});
    };

    _insert(feature: Feature, tile?: Tile) {
        // TODO: overwrite for providers providing splitted geo from tilehub
        const id = feature.id;// + o.bbox;

        let inserted = null;
        const FeatureClass = this.getFeatureClass(feature);

        const filter = this.filter;

        // if( typeof this.filter != 'function' || this.filter(o) )
        if (!filter || filter(feature)) {
            // filter out the duplicates!!
            if (
                this.IDPOOL[id] === UNDEF
            ) { // not in tree already??
                this.cnt++;

                if (this.isFeatureInstance(feature, FeatureClass)) {
                    (<any>feature)._provider = this;
                } else {
                    // USE FOR FASTER PROP LOOKUP -> FASTER COMBINE ACROSS TILES!

                    feature = this.createFeature(feature, FeatureClass);
                }

                this.updateBBox(feature);

                this.IDPOOL[id] = new FeatureStorageInfo(feature);

                inserted = feature;
            }

            if (tile) {
                this._mark(feature, tile);
            }
        }

        return inserted;
    };


    _mark(o, tile: Tile) {
        const pool = this.IDPOOL[o.id];

        if ( // pool &&
            !pool[tile.quadkey]
        ) {
            // debugger;
            pool.cnt++;
            pool[tile.quadkey] = true;
            // this.IDPOOL[ o.id ][tile.quadkey] = tile;
        }
    };


    _removeTile(tile: Tile, triggerEvent?) {
        const prov = this;
        // let depTiles;
        let data;
        const qk = tile.quadkey;

        prov.storage.remove(tile);

        if (data = tile.data) {
            for (var d = 0; d < data.length; d++) {
                prov._dropFeature(data[d], qk, triggerEvent);
            }
        }
    };

    _dropFeature(feature: Feature, qk: string, trigger?: boolean) {
        const provider = this;
        const featureStoreInfo = provider.IDPOOL[feature.id];

        if (featureStoreInfo) {
            if (featureStoreInfo[qk]) {
                featureStoreInfo[qk] = UNDEF;
                // delete featureStoreInfo[qk];
                featureStoreInfo.cnt--;
            }

            if (provider.isDroppable(feature)) {
                if (!featureStoreInfo.cnt) {
                    provider.cnt--;
                    delete provider.IDPOOL[feature.id];

                    if (provider.tree) {
                        provider.tree.remove(feature);
                    }

                    if (trigger) {
                        provider.dispatchEvent(REMOVE_FEATURE_EVENT, {feature});
                    }
                }
            }
        }
    };

    _s(searchBBox, tilePyramid?: string) {
        if (this.tree) {
            return this.tree.search(searchBBox);
        }
        const prov = this;
        const mergeID = Math.random();
        const {level} = prov;
        let data;

        prov.storage.forEach((tile) => {
            if (tile.z == level && tile.isLoaded() && (
                !tilePyramid || tilePyramid.startsWith(tile.quadkey)
            )) {
                // const [minLon, minLat, maxLon, maxLat] = tile.bounds;
                // if (searchBBox.minX < minLon || searchBBox.maxX > maxLon || searchBBox.minY < minLat || searchBBox.maxY > maxLat) return;
                const tileData = tile.search(searchBBox);

                if (tileData.length) {
                    // for(let f of tileData) set.add(f);
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

    prepareFeature(feature: Feature): Feature | false {
        if (feature['id'] == UNDEF) {
            feature['id'] = Math.random() * 1e8 ^ 0;
        }
        // calculates object bbox's
        if (!feature.bbox) {
            // false -> unkown feature -> no success
            return this.updateBBox(feature) && feature;
        } else if ((<number[]>feature.bbox).length === 6) { // convert to 2D bbox
            feature.bbox = [feature.bbox[0], feature.bbox[1], feature.bbox[3], (<number[]>feature.bbox)[4]];
        }
        return feature;
    };

    updateBBox(feature: Feature): boolean {
        if (!feature.bbox) {
            const bbox = calcBBox(feature);
            if (bbox) {
                feature.bbox = <GeoJSONBBox>bbox;
                if (feature.geometry._c) {
                    // clear cached centroid
                    feature.geometry._c = null;
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
