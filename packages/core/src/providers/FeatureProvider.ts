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

import {Feature as GeoJsonFeature} from '../features/Feature';

import Provider from './TileProvider/TileProvider';
import {geotools} from '@here/xyz-maps-common';
import {Tile} from '../tile/Tile';
import {updateBBox, prepareFeature} from '../data/prepare/GeoJSON';

import rbush from 'rbush';


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
 *  @public
 *  @class
 *  @expose
 *  @constructor
 *  @extends here.xyz.maps.providers.TileProvider
 *  @param {here.xyz.maps.providers.TileProvider.Options} config configuration of the provider
 *  @name here.xyz.maps.providers.FeatureProvider
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


    constructor(defaultConfig, config) {
        super(defaultConfig, config);

        this.tree = rbush(9, ['.bbox[0]', '.bbox[1]', '.bbox[2]', '.bbox[3]']);

        this.Feature = this.Feature || GeoJsonFeature;
    }


    /**
     *  Adds a feature to layer.
     *
     *  @public
     *  @expose
     *  @function
     *  @name here.xyz.maps.providers.FeatureProvider#addFeature
     * @example
     * provider.addFeature({
     *  geometry: {
     *      coordinates: [[-122.159958,37.76620, 0],[-122.169958,37.76620, 0]],
     *      type: "LineString"
     *  },
     *  type: "Feature"
     * })
     *  @param {here.xyz.maps.providers.FeatureProvider.Feature|Array.<here.xyz.maps.providers.FeatureProvider.Feature>} feature
     *  @return {here.xyz.maps.providers.FeatureProvider.Feature|Array.<here.xyz.maps.providers.FeatureProvider.Feature>} feature
     */
    addFeature(feature) {
        const provider = this;
        let prepared;
        let inserted;
        let len;

        if (feature.type == 'FeatureCollection') {
            feature = feature.features;
        }
        if (len = feature.length) {
            const result = [];

            for (let f = 0; f < len; f++) {
                result[f] = provider.addFeature(feature[f]);
            }
            return result;
        }

        if (provider.isFeatureInstance(feature, GeoJsonFeature)) {
            if (feature._provider && (feature._provider != provider)) {
                feature = feature.toJSON();
            }
        }

        prepared = provider.prepareFeature(feature);

        if (prepared !== false) {
            inserted = provider._insert(prepared);

            if (inserted != UNDEF) {
                feature = inserted;


                // var tiles = provider.getCachedTilesOfBBox( feature.bbox );
                const tiles = provider.getCachedTilesOfBBox(provider.decBBox(feature));
                // var tiles = provider.getCachedTilesOfBBox( provider._decBBox( feature ) );

                for (let t = 0, tile; t < tiles.length; t++) {
                    // // if not in already -> ADD!
                    // if( tiles[t].data.indexOf(feature) == -1 )
                    // {
                    //     tiles[t].data.push( feature );
                    //
                    tile = tiles[t];

                    tile.add(feature);

                    if (tile.z == provider.level) {
                        this._mark(feature, tile);

                        // if( !provider.IDPOOL[feature.id][tile.quadkey] )
                        // {
                        //     provider.IDPOOL[feature.id].cnt++;
                        // }
                        //
                        // provider.IDPOOL[feature.id][tile.quadkey] = tile;
                    }
                }

                if (provider.tree) {
                    provider.tree.insert(feature);
                }


                if (!provider.ignore) {
                    provider.listeners.trigger(ADD_FEATURE_EVENT, [feature, tiles], true);
                }
            }
        } else {
            // unkown feature
            console.warn('unkown feature detected..', feature.geometry.type);

            feature = null;
        }

        return feature;
    };

    /**
     *  Gets all features currently stored in provider.
     *
     *  @public
     *  @expose
     *  @function
     *  @name here.xyz.maps.providers.FeatureProvider#all
     *  @return {Array.<here.xyz.maps.providers.FeatureProvider.Feature>}
     */
    all() {
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
     *  Gets a feature from provider.
     *
     *  @public
     *  @expose
     *  @function
     *  @name here.xyz.maps.providers.FeatureProvider#getFeature
     *  @param {string} id object id
     *  @return {here.xyz.maps.providers.FeatureProvider.Feature}
     */
    getFeature(id) {
        if (this.IDPOOL[id]) {
            return this.IDPOOL[id].feature;
        }
    };

    /**
     *  Gets features from provider layer.
     *
     *  @public
     *  @expose
     *  @function
     *  @name here.xyz.maps.providers.FeatureProvider#getFeatures
     *  @param {Array.<string>|string} ids array of object ids
     *  @return {Array.<here.xyz.maps.providers.FeatureProvider.Feature>}
     */
    getFeatures(ids, options?) {
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

    getTile(quadkey: string, cb) {
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

        cb && cb(tile);

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
     *  Search for feature in provider.
     *
     *  @public
     *  @expose
     *  @function
     *  @name here.xyz.maps.providers.FeatureProvider#search
     *  @param {Object} options
     *  @param {String=} options.id Object id.
     *  @param {Array.<String>=} options.ids Array of object ids.
     *  @param {here.xyz.maps.geo.Point=} options.point Center point of the circle for search
     *  @param {number=} options.radius Radius of the circle in meters, it is used in "point" search.
     *  @param {(here.xyz.maps.geo.Rect|Array.<number>)=} options.rect Rect object is either an array: [minLon, minLat, maxLon, maxLat] or Rect object defining rectangle to search in.
     *  @example
     * //searching by id:
     *provider.search({id: 1058507462})
     * //or:
     *provider.search({ids: [1058507462, 1058507464]})
     *@example
     * //searching by point and radius:
     *provider.search({
     *  point: {longitude: 72.84205, latitude: 18.97172},
     *  radius: 100
     *})
     *@example
     * //searching by Rect:
     *provider.search({
     *  rect:  {minLon: 72.83584, maxLat: 18.97299, maxLon: 72.84443, minLat: 18.96876}
     *})
     *  @return {Array.<here.xyz.maps.providers.FeatureProvider.Feature>} array of features
     */
    // FeatureProvider.prototype.search = function( { rect: bbox || point: point || id: id || ids:[], radius: 1, onload: function(){}, remote: true } )
    // FeatureProvider.prototype.search = function( bbox||point||objID, { radius: 1, onload: function(){}, remote: true } )
    search(bbox, options?) {
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
                searchBBox = geotools.getPointBBox(<geotools.Point>bbox, radius);
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
            return provider.search(geo);
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
     *  Validate if a feature is in cache, returns true if the object exists.
     *
     *  @public
     *  @expose
     *  @function
     *  @name here.xyz.maps.providers.FeatureProvider#exists
     *  @param {Object} feature Object literal containing "id" property.
     *  @return {here.xyz.maps.providers.FeatureProvider.Feature} return feature if it is found, otherwise undefined
     */
    exists(feature) {
        return this.IDPOOL[feature.id];
    };


    /**
     *  Modify coordinates of a feature.
     *
     *  @public
     *  @expose
     *  @function
     *  @name here.xyz.maps.providers.FeatureProvider#setFeatureCoordinates
     *  @param {here.xyz.maps.providers.FeatureProvider.Feature} feature
     *  @param {Array.<Array>|Array.<number>} coordinates new coordinates of the feature, it is either array of coordinates: [longitude, latitude, z] or
     *      array of coordinate arrays: [ [longitude, latitude, z], [longitude, latitude, z], , , , ].
     */
    setFeatureCoordinates(feature, coordinates) {
        const _feature = feature;
        // if( this.exists(feature) )
        if (feature = this.getFeature(feature.id)) {
            const prevBBox = feature.getBBox();
            // var prevBBox        = feature.bbox.slice();
            const prevCoordinates = feature.geometry.coordinates;


            // make sure listeners are not getting triggered for remove+add of feature.
            this.ignore = true;
            // remove from provider to make sure tile data and tree is balanced correctly.
            this.removeFeature(feature);
            // set the new geometry
            feature.geometry.coordinates = this.encCoord(feature.geometry.type, coordinates);
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


            this.listeners.trigger(MODIFY_FEATURE_COORDINATES_EVENT, [feature, prevBBox, prevCoordinates, this], true);
        } else {
            // update geometry/bbox although object isn't registered..
            _feature.geometry.coordinates = coordinates;
            _feature.bbox = null;
            this.updateBBox(_feature);
        }
    };

    /**
     *  Remove feature from layer provider.
     *
     *  @public
     *  @expose
     *  @function
     *  @name here.xyz.maps.providers.FeatureProvider#removeFeature
     *  @param {here.xyz.maps.providers.FeatureProvider.Feature|Array.<here.xyz.maps.providers.FeatureProvider.Feature>} feature
     */
    removeFeature(feature) {
        let len;
        if (feature.type == 'FeatureCollection') {
            feature = feature.features;
        }
        if (len = feature.length) {
            const result = [];

            for (let f = 0; f < len; f++) {
                result[f] = this.removeFeature(feature[f]);
            }
            return result;
        }


        if (feature = this.getFeature(feature.id)) {
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
                this.listeners.trigger(REMOVE_FEATURE_EVENT, [feature, tiles], true);
            }
        }

        return feature;
    };


    /**
     *  Clear features in bounding box. clear all if bounding box is not given.
     *
     *  @public
     *  @expose
     *  @function
     *  @name here.xyz.maps.providers.FeatureProvider#clear
     *  @param {Array<number>=} bbox bounding box array: [minLon, minLat, maxLon, maxLat]
     */
    clear(bbox?) {
        const provider = this;
        let dataQuads = null;
        let feature;

        if (arguments.length == 4) {
            bbox = Array.prototype.slice.call(arguments);
        }

        // if( !bbox )
        // {
        //     bbox = [ -180, -90, 180, 90 ];
        // }

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
            provider.dep = {};
            provider.IDPOOL = protectedFeatures;

            // Provider clears complete tile storage
            Provider.prototype.clear.call(this, bbox);
        }

        provider.listeners.trigger('clear', [this, dataQuads], true);
    };

    _insert(o, tile?: Tile) {
        // TODO: overwrite for providers providing splitted geo from tilehub
        const id = o.id;// + o.bbox;

        let inserted = null;
        const Feature = this.getFeatureClass(o);

        const filter = this.filter;

        // if( typeof this.filter != 'function' || this.filter(o) )
        if (!filter || filter(o)) {
            // filter out the duplicates!!
            if (
                this.IDPOOL[id] === UNDEF
            ) { // not in tree already??
                this.cnt++;

                if (this.isFeatureInstance(o, Feature)) {
                    o._provider = this;
                } else {
                    // USE FOR FASTER PROP LOOKUP -> FASTER COMBINE ACROSS TILES!

                    o = this.createFeature(o, Feature);
                }

                this.updateBBox(o);

                this.IDPOOL[id] = new FeatureStorageInfo(o);

                inserted = o;
            }

            if (tile) {
                this._mark(o, tile);
            }
        }

        return inserted;
    };


    _mark(o, tile: Tile) {
        const pool = this.IDPOOL[o.id];

        if ( // pool &&
            !pool[tile.quadkey]
        ) {
            pool.cnt++;
            pool[tile.quadkey] = true;
            // this.IDPOOL[ o.id ][tile.quadkey] = tile;
        }
    };


    _removeTile(tile: Tile, triggerEvent) {
        const prov = this;
        let depTiles;
        let data;
        const qk = tile.quadkey;

        // var t1 = performance.now();

        if (depTiles = prov.dep[qk]) {
            for (var d = 0; d < depTiles.length; d++) {
                prov.storage.remove(depTiles[d]);
            }

            delete prov.dep[qk];
        }

        prov.storage.remove(tile);

        if (data = tile.data) {
            for (var d = 0; d < data.length; d++) {
                prov._dropFeature(data[d], qk, triggerEvent);
            }
        }

        // console.log(
        //     'loader tile removed', tile.quadkey,
        //     'dep', (depTiles && depTiles.length)||0,
        //     'features', data && data.length,
        //     'in', performance.now() - t1, 'ms'
        // );
    };

    _dropFeature(feature, qk, trigger) {
        const prov = this;
        const featureStoreInfo = prov.IDPOOL[feature.id];

        if (featureStoreInfo) {
            if (featureStoreInfo[qk]) {
                featureStoreInfo[qk] = UNDEF;
                // delete featureStoreInfo[qk];
                featureStoreInfo.cnt--;
            }

            if (prov.isDroppable(feature)) {
                if (!featureStoreInfo.cnt) {
                    prov.cnt--;
                    delete prov.IDPOOL[feature.id];

                    if (prov.tree) {
                        prov.tree.remove(feature);
                    }

                    if (trigger) {
                        prov.listeners.trigger(REMOVE_FEATURE_EVENT, [feature, prov], true);
                    }
                }
            }
        }
    };

    _s(searchBBox) {
        if (this.tree) {
            return this.tree.search(searchBBox);
        }
        const prov = this;
        const mergeID = Math.random() * 1e8 ^ 0;
        const level = prov.level;
        let data;
        let tileData;
        // const set = new Set();

        prov.storage.forEach((tile) => {
            if (tile.z == level && tile.isLoaded()) {
                tileData = tile.search(searchBBox);
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
        // data = Array.from(set);

        // if((data||[]).length)
        // {
        //     // var dupl = findDuplicates(data);
        //     // console.log( quads );
        //     // console.log( quads.length, data.length);
        //     console.log('timeSearch',((timeSearch*1e3)^0)/1e3,'ms','timeMerge',((timeMerge*1e3)^0)/1e3,'ms');
        // }

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

    prepareFeature(feature: GeoJsonFeature): GeoJsonFeature | false {
        return feature;
    };

    updateBBox(feature: GeoJsonFeature): boolean {
        return true;
    };
}

FeatureProvider.prototype.prepareFeature = prepareFeature;
FeatureProvider.prototype.updateBBox = updateBBox;

// deprecated fallback..
(<any>FeatureProvider.prototype).modifyFeatureCoordinates = FeatureProvider.prototype.setFeatureCoordinates;
