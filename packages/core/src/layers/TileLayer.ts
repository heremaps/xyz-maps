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

import {Listener as Listeners} from '@here/xyz-maps-common';
import defaultStylesDef from '../styles/default';
import LayerStyle from './LayerStyle';

/* exported Options */
import Options from './Options';
import TileProvider from '../providers/TileProvider/TileProvider';
import {RemoteTileProvider} from '../providers/RemoteTileProvider/RemoteTileProvider';
import {Tile} from '../tile/Tile';
import {FeatureProvider} from '../providers/FeatureProvider';

const doc = Options; // doc only!

const REMOVE_FEATURE_EVENT = 'featureRemove';
const ADD_FEATURE_EVENT = 'featureAdd';
const MODIFY_FEATURE_COORDINATES_EVENT = 'featureCoordinatesChange';
const STYLEGROUP_CHANGE_EVENT = 'styleGroupChange';
const STYLE_CHANGE_EVENT = 'styleChange';
const VIEWPORT_READY_EVENT = 'viewportReady';
const CLEAR_EVENT = 'clear';

let UNDEF;


// function mixin( to, from )
// {
//     for( var f in from )
//     {
//         to[f] = from[f];
//     }
//     return to;
// }
//
// function mergeStyle( grp1, grp2 )
// {
//
//     if( grp2 === null || grp2 === false )
//     {
//         return null;
//     }
//
//     var mergedGroups = [],
//         group;
//
//     for( var i = 0, len = grp1.length; i<len; i++ )
//     {
//         group = mixin( {}, grp1[i] );
//
//         if( grp2[i] )
//         {
//             mixin( group, grp2[i] );
//         }
//
//         mergedGroups[i] = group;
//     }
//
//     return mergedGroups;
// }

type zoomlevelRange = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20;

/**
 *  Layers
 *
 *  @public
 *  @class
 *  @expose
 *  @constructor
 *  @param {here.xyz.maps.layers.TileLayer.Options}
 *  @name here.xyz.maps.layers.TileLayer
 */
export class TileLayer {
    private _p: TileProvider[] = [];

    private _fp: FeatureProvider;

    private _sd = null;
    // pointer events actice
    private _pev = true;

    private _l: Listeners;

    protected __type = 'Layer';
    protected margin: number = 20;

    public id: string;

    public name: string = '';

    public min: zoomlevelRange = 15;
    public max: zoomlevelRange = 20;

    public tileSize: number = 256;

    constructor(cfg) {
        const layer = this;

        for (const c in cfg) {
            layer[c] = cfg[c];
        }

        /**
         * Layer name
         *
         * @public
         * @expose
         * @name here.xyz.maps.layers.TileLayer#name
         * @type {string}
         */

        /**
         * minimum zoom level.
         *
         * @public
         * @expose
         * @name here.xyz.maps.layers.TileLayer#min
         * @type {number}

         /**
         * maximum zoom level.
         *
         * @public
         * @expose
         * @name here.xyz.maps.layers.TileLayer#max
         * @type {number}
         */

        /**
         *  default tile margin in pixel
         *
         *  @public
         *  @expose
         *  @type {number}
         *  @name here.xyz.maps.layers.TileLayer#margin
         */

        /**
         * Layer id, identifier of the Layer.
         *
         * @public
         * @readonly
         * @expose
         * @name here.xyz.maps.layers.TileLayer#id
         * @type {string}
         */
        if (layer.id == UNDEF) {
            layer.id = 'L-' + (Math.random() * 1e8 ^ 0);
        }


        layer._l = new Listeners([
            ADD_FEATURE_EVENT,
            REMOVE_FEATURE_EVENT,
            MODIFY_FEATURE_COORDINATES_EVENT,
            CLEAR_EVENT,
            STYLEGROUP_CHANGE_EVENT,
            VIEWPORT_READY_EVENT,
            STYLE_CHANGE_EVENT
            // ,'tap', 'pointerup', 'pointerenter', 'pointerleave', 'dbltap', 'pointerdown', 'pressmove', 'pointermove'
        ]);

        const providerCfg = cfg.providers || cfg.provider;


        if (providerCfg instanceof Array) {
            for (let p = 0, prov; p < providerCfg.length; p++) {
                prov = providerCfg[p];

                for (let min = prov.min; min <= prov.max; min++) {
                    layer._p[min] = prov.provider;
                }
            }
        } else {
            for (let l = layer.min; l <= layer.max; l++) {
                layer._fp =
                    layer._p[l] = providerCfg;

                // TODO: remove =)
                // currently used by edtior for automatic feature unselect..
                // ..in case of layer is not visible anymore due to (zoomlevel range)
                (<any>layer._fp).minLevel = layer.min;
                (<any>layer._fp).maxLevel = layer.max;
            }
        }


        const providers = layer._p;

        providers.forEach((provider, i) => {
            // layer.__type  = providers.__type;

            if (provider.__type == 'FeatureProvider') {
                provider.addEventListener(ADD_FEATURE_EVENT, layer._afl, layer);

                provider.addEventListener(REMOVE_FEATURE_EVENT, layer._rfl, layer);

                provider.addEventListener(MODIFY_FEATURE_COORDINATES_EVENT, layer._mfl, layer);
            }
            provider.addEventListener(CLEAR_EVENT, layer._cpl, layer);
        });


        // // hold feature's custom style data...
        // layer._cs = {
        //
        // };

        layer.setMargin(layer.getMargin());


        let style;
        // deprecated fallback
        const deprecatedProviderStyles = this._fp && (<any> this._fp).styles;

        if (style = cfg.style || cfg.styles || deprecatedProviderStyles || defaultStylesDef) {
            layer.setStyle(style);
        }


        ['style', 'styles', 'provider', 'providers'].forEach((prop) => {
            delete layer[prop];
        });
    }

    /**
     *  Get provider of this layer.
     *
     *  @public
     *  @expose
     *  @function
     *  @name here.xyz.maps.layers.TileLayer#getProvider
     *  @return {here.xyz.maps.providers.TileProvider}
     */
    getProvider(level?: number): TileProvider {
        if (level) {
            return this._p[level ^ 0];
        }

        return this._fp;
    };

    /**
     *  add event listener to layer, valid events: "featureAdd", "featureRemove", "featureCoordinatesChange", "clear", "styleGroupChange", "styleChange", and "viewportReady"
     *
     *  @public
     *  @expose
     *  @function
     *  @name here.xyz.maps.layers.TileLayer#addEventListener
     *  @param {String} type
     *  @param {Function} callback
     *  @param {Object=} context
     */
    addEventListener(type: string, cb, scp?) {
        const listeners = this._l;

        if (listeners.isDefined(type)) {
            return listeners.add(type, cb, scp);
        }

        return this._fp && this._fp.addEventListener(type, cb, scp);
    };

    /**
     *  remove event listener to layer, valid events: "featureAdd", "featureRemove", "featureCoordinatesChange", "clear", "styleGroupChange", "styleChange", and "viewportReady"
     *
     *  @public
     *  @expose
     *  @function
     *  @name here.xyz.maps.layers.TileLayer#removeEventListener
     *  @param {String} type
     *  @param {Function} callback
     *  @param {Object=} context
     */
    removeEventListener(type: string, cb, scp?) {
        const listeners = this._l;

        if (listeners.isDefined(type)) {
            return listeners.remove(type, cb, scp);
        }

        return this._fp.removeEventListener(type, cb, scp);
    };


    private _mfl(feature, prevBBox, prevCoordinates, provider) {
        this._l.trigger(MODIFY_FEATURE_COORDINATES_EVENT, [feature, prevBBox, prevCoordinates, this], true);
    };

    private _cpl(provider, quadkeys) {
        // full provider clear!
        // if( !quadkeys )
        // {
        //     // clear custom styles..
        //     this._cs = {};
        // }

        this._l.trigger(CLEAR_EVENT, [this, quadkeys], true);
    };


    private _afl(feature, tiles) {
        this._l.trigger(ADD_FEATURE_EVENT, [feature, tiles, this], true);
    };


    private _rfl(feature, tiles) {
        // cleanup styles
        // delete this._cs[id];
        this.setStyleGroup(feature);

        this._l.trigger(REMOVE_FEATURE_EVENT, [feature, tiles, this], true);
    };


    /**
     *  Modify coordinates of a feature in layer.
     *
     *  @public
     *  @expose
     *  @function
     *  @name here.xyz.maps.layers.TileLayer#setFeatureCoordinates
     *  @param {here.xyz.maps.providers.FeatureProvider.Feature} feature
     *  @param {Array.<Array>|Array.<number>} coordinates new coordinates of the feature, it is either array of coordinates: [longitude, latitude, z] or
     *      array of coordinate arrays: [ [longitude, latitude, z], [longitude, latitude, z], , , , ].
     */
    setFeatureCoordinates(feature, coordinates) {
        return this._fp.setFeatureCoordinates(feature, coordinates);
    };

    /**
     *  Add a feature to layer.
     *
     *  @public
     *  @expose
     *  @function
     *  @name here.xyz.maps.layers.TileLayer#addFeature
     *  @param {here.xyz.maps.providers.FeatureProvider.Feature} feature the feature to be added to layer
     *  @param {Array.<here.xyz.maps.layers.TileLayer.Style>=} stylegroup
     * @example
     *layer.addFeature({
     *  geometry: {
     *      coordinates: [[-122.49373, 37.78202, 0], [-122.49263, 37.78602, 0]],
     *      type: "LineString"
     *      },
     *      type: "Feature"
     *  },[
     *      {zIndex:0, type:"Line", stroke:"#DDCB97", "strokeWidth":18}
     *  ])
     *  @return {here.xyz.maps.providers.FeatureProvider.Feature} feature
     */
    addFeature(feature, style) {
        const prov = <FeatureProvider> this._fp;

        if (prov.addFeature) {
            feature = prov.addFeature(feature);

            if (style) {
                this.setStyleGroup(feature, style);
            }
            return feature;
        }
    };


    /**
     *  Remove feature from layer.
     *
     *  @public
     *  @expose
     *  @function
     *  @name here.xyz.maps.layers.TileLayer#removeFeature
     *  @param {here.xyz.maps.providers.FeatureProvider.Feature} feature the feature to be removed from layer
     */
    removeFeature(feature) {
        const prov = <FeatureProvider> this._fp;
        if (prov.removeFeature) {
            return prov.removeFeature(feature);
        }
    };

    /**
     * Set StyleGroup the feature should be rendered with.
     * Pass styleGroup = false|null to hide the feature.
     * If no styleGroup is passed, custom feature style will be cleared and layer default style will be set.
     *
     * @expose
     * @function
     * @param {here.xyz.maps.providers.FeatureProvider.Feature} feature the feature to set style
     * @param {Array.<here.xyz.maps.layers.TileLayer.Style>|false|null=} styleGroup
     * @name here.xyz.maps.layers.TileLayer#setStyleGroup
     */
    setStyleGroup(feature, style?, merge?) {
        if (this._sd) {
            this._l.trigger(STYLEGROUP_CHANGE_EVENT, [
                feature,
                this._sd.setStyleGroup(feature, style, merge),
                this
            ], true);
        }

        // var id           = feature.id;
        // var customStyles = this._cs;
        //
        // if( style && (
        //     merge // || merge == UNDEF
        // )){
        //
        //     style = mergeStyle( this.getStyleGroup( feature ), style )
        // }
        //
        // if( style || customStyles[id] )
        // {
        //     customStyles[id] = style;
        // }
        //
        // this._l.trigger( 'style', [ feature, style, this ], true );
    };

    /**
     * Get style of the feature.
     *
     * @expose
     * @function
     * @param {here.xyz.maps.providers.FeatureProvider.Feature} feature the feature to get style
     * @param {number=} level feature style at this specific zoomlevel
     * @name here.xyz.maps.layers.TileLayer#getStyleGroup
     * @return {Array.<here.xyz.maps.layers.TileLayer.Style>}
     *  style group for rendering this feature.
     */
    getStyleGroup(feature, level?: number, getDefault?: boolean) {
        return this._sd && this._sd.getStyleGroup(feature, level, getDefault);
    };

    /**
     *  Search for feature in layer.
     *
     *  @public
     *  @expose
     *  @function
     *  @name here.xyz.maps.layers.TileLayer#search
     *  @param {Object} options
     *  @param {String=} options.id Object id.
     *  @param {Array.<String>=} options.ids Array of object ids.
     *  @param {here.xyz.maps.geo.Point=} options.point Center point of the circle for search
     *  @param {number=} options.radius Raduis of the circle in meters, it is used in "point" search.
     *  @param {(here.xyz.maps.geo.Rect|Array.<number>)=} options.rect Rect object is either an array: [minLon, minLat, maxLon, maxLat] or Rect object defining rectangle to search in.
     *  @param {Boolean=} options.remote Force the provider to do remote search if objects are not found in cache.
     *  @param {Function=} options.onload Callback function of search.
     *  @example
     * //searching by id:
     *layer.search({id: 1058507462})
     * //or:
     *layer.search({ids: [1058507462, 1058507464]})
     *@example
     * //searching by point and radius:
     *layer.search({
     *  point: {longitude: 72.84205, latitude: 18.97172},
     *  radius: 100
     *})
     *@example
     * //searching by Rect:
     *layer.search({
     *  rect:  {minLon: 72.83584, maxLat: 18.97299, maxLon: 72.84443, minLat: 18.96876}
     *})
     *@example
     * //remote search:
     *layer.search({
     *  rect:  {minLon: 72.83584, maxLat: 18.97299, maxLon: 72.84443, minLat: 18.96876},
     *  remote: true, // force layer to do remote search if feature/search area is not cached locally
     *  onload: function(e){
     *   // search result is only return in this callback function if features are not found in cache.
     *  }
     *})
     *  @return {Array.<here.xyz.maps.providers.FeatureProvider.Feature>} array of features
     */

    /**
     *  @param {Array<number>|here.xyz.maps.geo.Rect} bbox
     *      bounding box can be either an array: [minLon, minLat, maxLon, maxLat] or {@link here.xyz.maps.geo.Rect|Rect object}
     *  @param {here.xyz.maps.providers.FeatureProvider.ISearchParam=} options
     *      "onload" and "remote" properties in options specify callback function in remote search
     *
     *@example
     *layer.search({minLon: 72.83584, maxLat: 18.97299, maxLon: 72.84443, minLat: 18.96876})
     * //or:
     *layer.search([72.83584, 18.96876, 72.84443,18.97299])
     *@example
     * //remote search:
     *layer.search(
     *  {minLon: 72.83584, maxLat: 18.97299, maxLon: 72.84443, minLat: 18.96876},
     *  {
     *  remote: true, // force layer to do remote search if search area is not cached locally
     *  onload: function(e){
     *   // search result is only return in this callback function if features are not found in cache.
     *  }
     *})
     *  @return {Array.<here.xyz.maps.providers.FeatureProvider.Feature>}
     */

    /**
     *  @param {Array<number>|here.xyz.maps.geo.Point} point
     *      point can be either an array: [longitude, latitude] or {@link here.xyz.maps.geo.Point|coordinate object}.
     *
     *  @param {here.xyz.maps.providers.FeatureProvider.ISearchParam} options
     *       "radius" is mandatory for searching in a circle. "onload" and "remote" properties in options specify callback function in remote search.
     *@example
     *layer.search(
     *  {longitude: 72.84205, latitude: 18.97172},
     *  {radius: 100}
     *)
     * //or:
     *layer.search(
     *  [72.84205, 18.97172],
     *  {radius: 100}
     *)
     *@example
     * //remote search:
     *layer.search(
     *  [72.84205, 18.97172],
     *  {
     *  radius: 100,
     *  remote: true, // force layer to do remote search if search area is not cached locally
     *  onload: function(e){
     *   // search result is only return in this callback function if features are not found in cache.
     *  }
     *})
     *  @return {Array.<here.xyz.maps.providers.FeatureProvider.Feature>}
     *
     */
    /**
     *  @param {number|string} Id
     *      Object id
     *  @param {here.xyz.maps.providers.FeatureProvider.ISearchParam=} options
     *      "onload" and "remote" properties in options specify callback function in remote search
     *@example
     *layer.search(1058507462)
     *@example
     * //remote search:
     *layer.search(
     *  1058507462,
     *  {
     *  remote: true, // force layer to do remote search if search area is not cached locally
     *  onload: function(e){
     *   // search result is only return in this callback function if features are not found in cache.
     *  }
     *})
     *  @return {Array.<here.xyz.maps.providers.FeatureProvider.Feature>}
     */
    search(options:any) {
        const prov = <FeatureProvider> this._fp;

        if (prov && prov.search) {
            return prov.search.apply(this._fp, arguments);
        }
    };


    // ++++++


    /**
     *  Get a tile by quad key. tile and layer itself are returned in callback function if it is given.
     *
     *  @public
     *  @expose
     *  @function
     *  @name here.xyz.maps.layers.TileLayer#getTile
     *  @param {number} quadkey
     *  @param {Function=} cb callback function
     *  @return {here.xyz.maps.providers.TileProvider.Tile}
     */
    getTile(quadkey: string, cb) {
        const layer = this;
        const level = quadkey.length;
        const provider = layer._p[level];

        if (provider) {
            return provider.getTile(quadkey, cb);
        }
    };

    cancelTile(tile, cb) {
        const level = typeof tile == 'string'
            ? tile.length
            : tile.quadkey.length;

        const prov = <RemoteTileProvider> this._p[level];
        if (prov && prov.cancel) {
            return prov.cancel(tile, cb);
        }
    };

    /**
     *  get cached tile by quadkey.
     *
     *  @public
     *  @expose
     *  @function
     *  @name here.xyz.maps.layers.TileLayer#getCachedTile
     *  @param {String} quadkey
     *  @return {here.xyz.maps.providers.TileProvider.Tile}
     */
    getCachedTile(quadkey) {
        const level = quadkey.length;
        const prov = this._p[level];

        if (prov) {
            return prov.getCachedTile(quadkey);
        }
    };


    /**
     *  Set layer with given style.
     *
     *  @public
     *  @expose
     *  @function
     *  @name here.xyz.maps.layers.TileLayer#setStyle
     *  @param {here.xyz.maps.layers.TileLayer.TileLayerStyle} layerstyle
     *  @param {boolean=} [keepCustomStyles=false] keep and reuse custom set styles via layer.setStyleGroup(...)
     */
    setStyle(style, keepCustoms?: boolean) {
        function isFunction(fnc) {
            return typeof fnc == 'function';
        }

        if (
            !isFunction(style.getStyleGroup) ||
            !isFunction(style.setStyleGroup)
        ) {
            style = new LayerStyle(style, keepCustoms && this._sd && this._sd._c);
        }

        this._sd = style;

        this._l.trigger(STYLE_CHANGE_EVENT, [style, this], true);
    };

    /**
     *  Get current layer style.
     *
     *  @public
     *  @expose
     *  @function
     *  @name here.xyz.maps.layers.TileLayer#getStyle
     *  @return {here.xyz.maps.layers.TileLayer.TileLayerStyle}
     */
    getStyle() {
        return this._sd;
    };


    getMargin() {
        return this.margin;
    };

    /**
     *  Set tile margin in pixel.
     *
     *  @public
     *  @expose
     *  @function
     *  @name here.xyz.maps.layers.TileLayer#setMargin
     *  @param {Integer} margin
     */
    setMargin(marginPixel) {
        marginPixel = Number(marginPixel || 0);

        const providers = this._p;
        let p = providers.length;

        while (p--) {
            if (providers[p]) {
                providers[p].setMargin(marginPixel);
            }
        }

        return this.margin = marginPixel;
    };


    /**
     *  enable or disable pointer events for all features of layer.
     *
     *  @public
     *  @expose
     *  @param {Boolean=} active
     *  @function
     *  @name here.xyz.maps.layers.TileLayer#pointerEvents
     *  @return {Boolean} active
     */
    pointerEvents(active) {
        if (active != UNDEF) {
            this._pev = !!active;
        }

        return this._pev;
    };


    // /**
    //  * Copyright callback receiving array of copyright objects: [{label:"",alt:""}]
    //  *
    //  * @callback here.xyz.maps.layers.TileLayer~copyrightCallback
    //  * @param {Array.<{label: String, alt: String}>} copyright array of copyright data.
    //  */
    //
    // /**
    //  *  get copyright information of all providers used by the layer.
    //  *
    //  *  @public
    //  *  @expose
    //  *  @param {here.xyz.maps.layers.TileLayer~copyrightCallback} callback that handles copyright response
    //  *  @function
    //  *  @name here.xyz.maps.layers.TileLayer#getCopyright
    //  *
    //  */
    getCopyright(cb) {
        let unique = this._p.filter((v, i, self) => self.indexOf(v) === i);
        let copyrights = [];
        let i = 0;
        let prov;
        let done = (c) => {
            if (c.length) {
                copyrights.push(...c);
            }
            if (!--i) {
                cb && cb(copyrights);
            }
        };

        while (prov = unique.pop()) {
            if (prov && prov.getCopyright) {
                i++;
                prov.getCopyright(done);
            }
        }

        // this.getProvider(this.max).getCopyright(cb);
    };
}

// deprecated fallback..
(<any>TileLayer.prototype).modifyFeatureCoordinates = TileLayer.prototype.setFeatureCoordinates;
