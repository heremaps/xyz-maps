/*
 * Copyright (C) 2019-2021 HERE Europe B.V.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
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
import LayerStyleImpl from '../styles/LayerStyleImpl';

import {LayerStyle, Style, StyleGroup} from '../styles/LayerStyle';

/* exported Options */
import {TileLayerOptions} from './TileLayerOptions';
import TileProvider from '../providers/TileProvider/TileProvider';
import {RemoteTileProvider} from '../providers/RemoteTileProvider/RemoteTileProvider';
import {FeatureProvider} from '../providers/FeatureProvider';
import {Tile} from '../tile/Tile';
import {Feature} from '../features/Feature';
import {GeoPoint} from '../geo/GeoPoint';
import {GeoRect} from '../geo/GeoRect';
import {GeoJSONBBox, GeoJSONCoordinate, GeoJSONFeature, GeoJSONFeatureCollection} from '../features/GeoJSON';

const REMOVE_FEATURE_EVENT = 'featureRemove';
const ADD_FEATURE_EVENT = 'featureAdd';
const MODIFY_FEATURE_COORDINATES_EVENT = 'featureCoordinatesChange';
const STYLEGROUP_CHANGE_EVENT = 'styleGroupChange';
const STYLE_CHANGE_EVENT = 'styleChange';
const VIEWPORT_READY_EVENT = 'viewportReady';
const CLEAR_EVENT = 'clear';
const DEFAULT_TILE_SIZE = 256;

export const DEFAULT_LAYER_MIN_ZOOM = 15;
export const DEFAULT_LAYER_MAX_ZOOM = 32;

let UNDEF;

/**
 * TileLayer
 */
export class TileLayer {
    protected _p: TileProvider[] = [];

    private _fp: FeatureProvider;

    private _sd = null;
    // pointer events active
    private _pev = true;

    private _l: Listeners;

    protected __type = 'Layer';

    /**
     * default tile margin in pixel
     */
    protected margin: number = 20;

    /**
     * id of the Layer.
     */
    public readonly id: string;

    /**
     * Name of the Layer
     */
    public name: string = '';

    /**
     * minimum zoom level at which data from the Layer is displayed.
     */
    public min: number = DEFAULT_LAYER_MIN_ZOOM;

    /**
     * maximum zoom level at which data from the Layer will be displayed.
     */
    public max: number = DEFAULT_LAYER_MAX_ZOOM;

    public tileSize: number;

    levelOffset: number = 0;

    /**
     * @param options - options to configure the TileLayer
     */
    constructor(options: TileLayerOptions) {
        const layer = this;
        const {pointerEvents} = options;
        delete options.pointerEvents;


        for (const c in options) {
            layer[c] = options[c];
        }

        if (layer.id == UNDEF) {
            (<any>layer).id = 'L-' + (Math.random() * 1e8 ^ 0);
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

        if (typeof pointerEvents == 'boolean') {
            this.pointerEvents(pointerEvents);
        }


        const providerCfg = options.providers || options.provider;
        let tileSize = DEFAULT_TILE_SIZE;

        const setProvider = (min, max, provider) => {
            for (let z = min; z <= max; z++) {
                layer._p[z] = provider;
            }
        };

        if (providerCfg instanceof Array) {
            for (let prov of providerCfg) {
                setProvider(prov.min, prov.max, prov.provider);
            }
        } else {
            if (this.tileSize) {
                tileSize = providerCfg.size = this.tileSize;
            } else {
                tileSize = Math.max(tileSize, providerCfg.size);
            }
            let offset = Number(tileSize == 512);
            let min = layer.min - offset;
            let max = layer.max - offset;
            setProvider(min, max, providerCfg);
            layer._fp = providerCfg;
            // TODO: remove =)
            // currently used by edtior for automatic feature unselect..
            // ..in case of layer is not visible anymore due to (zoomlevel range)
            providerCfg.minLevel = min;
            providerCfg.maxLevel = max;
        }

        if (!this.tileSize && !(tileSize % 256)) {
            this.tileSize = tileSize;
        }

        this.levelOffset = Math.round(Math.log(this.tileSize) / Math.log(2) - 8);

        layer._p.forEach((provider, i) => {
            if (provider) {
                if (provider.__type == 'FeatureProvider') {
                    provider.addEventListener(ADD_FEATURE_EVENT, layer._eventProxy, layer);

                    provider.addEventListener(REMOVE_FEATURE_EVENT, layer._eventProxy, layer);

                    provider.addEventListener(MODIFY_FEATURE_COORDINATES_EVENT, layer._eventProxy, layer);
                }
                provider.addEventListener(CLEAR_EVENT, layer._eventProxy, layer);
            }
        });

        layer.setMargin(layer.getMargin());


        let style;
        // deprecated fallback
        const deprecatedProviderStyles = this._fp && (<any> this._fp).styles;

        if (style = options.style || (<any>options).styles || deprecatedProviderStyles || defaultStylesDef) {
            layer.setStyle(style);
        }


        ['style', 'styles', 'provider', 'providers'].forEach((prop) => {
            delete layer[prop];
        });
    }

    /**
     * Get provider(s) of this layer.
     */
    getProvider(level?: number): TileProvider {
        if (level) {
            return this._p[Math.floor(level) - this.levelOffset];
        }
        return this._fp;
    };

    /**
     * Add an EventListener to the layer.
     * Valid events: "featureAdd", "featureRemove", "featureCoordinatesChange", "clear", "styleGroupChange", "styleChange", and "viewportReady"
     *
     * The detail property of the Event gives additional information about the event.
     * detail.layer is a reference to the layer onto which the event was dispatched and is set for all events.
     *
     * @param type - A string representing the event type to listen for
     * @param listener - the listener function that will be called when an event of the specific type occurs
     */
    addEventListener(type: string, listener: (event: CustomEvent) => void)

    addEventListener(type: string, listener: (event: CustomEvent) => void, _c?) {
        const listeners = this._l;

        if (listeners.isDefined(type)) {
            return listeners.add(type, listener, _c);
        }

        return this._fp && this._fp.addEventListener(type, listener, _c);
    };

    /**
     * Remove an EventListener from the layer.
     * Valid events: "featureAdd", "featureRemove", "featureCoordinatesChange", "clear", "styleGroupChange", "styleChange", and "viewportReady"
     *
     * @param type - A string which specifies the type of event for which to remove an event listener.
     * @param listener - The listener function of the event handler to remove from the TileLayer.
     */
    removeEventListener(type: string, listener: (event: CustomEvent) => void)

    removeEventListener(type: string, listener: (event: CustomEvent) => void, _c?) {
        const listeners = this._l;

        if (listeners.isDefined(type)) {
            return listeners.remove(type, listener, _c);
        }

        return this._fp.removeEventListener(type, listener, _c);
    };

    private _eventProxy(ev: CustomEvent) {
        const {type, detail} = ev;
        detail.layer = this;

        if (type == REMOVE_FEATURE_EVENT) {
            // cleanup styles
            // delete this._cs[id];
            this.setStyleGroup(detail.feature);
        }
        this._l.trigger(type, ev, true);
    }

    protected dispatchEvent(type: string, detail: { [name: string]: any, layer?: TileLayer }) {
        detail.layer = this;
        const event = new CustomEvent(type, {
            detail: detail
        });
        this._l.trigger(type, event, true);
    }


    /**
     * Modify coordinates of a feature in the layer.
     *
     * @param feature - the Feature whose coordinates should be modified
     * @param coordinates - the modified coordinates to set. The coordinates must match features geometry type.
     */
    setFeatureCoordinates(feature: Feature, coordinates: GeoJSONCoordinate | GeoJSONCoordinate[] | GeoJSONCoordinate[][] | GeoJSONCoordinate[][][]) {
        return this._fp.setFeatureCoordinates(feature, coordinates);
    };

    /**
     * Add a feature to the layer.
     *
     * @param feature - the feature to be added to the layer
     * @param style - optional style the feature should be displayed with.
     *
     * @example
     * ```
     * // add a feature that will be displayed with the default style of the layer.
     * layer.addFeature({
     *    type: "Feature"
     *    geometry: {
     *        coordinates: [[-122.49373, 37.78202, 0], [-122.49263, 37.78602, 0]],
     *        type: "LineString"
     *    }
     * });
     * ```
     * @example
     * ```
     * // add a feature that will be displayed with a specific style.
     * layer.addFeature({
     *    type: "Feature"
     *    geometry: {
     *        coordinates: [[-122.49373, 37.78202, 0], [-122.49263, 37.78602, 0]],
     *        type: "LineString"
     *    }
     * }, [{
     *    zIndex: 0, type: "Line", stroke: "#DDCB97", "strokeWidth": 18
     * }]);
     * ```
     */
    addFeature(feature: GeoJSONFeature | Feature, style?: Style[]): Feature;
    /**
     * Add features to the layer.
     *
     * @param feature - the features to be added to the layer
     * @param style - optional style the features should be displayed with.
     *
     * @example
     * ```
     * // add multiple features to the layer.
     * layer.addFeature([{
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
    addFeature(feature: GeoJSONFeatureCollection | GeoJSONFeature[], style?: Style[]): Feature[];

    addFeature(feature: GeoJSONFeature | Feature | GeoJSONFeatureCollection | GeoJSONFeature[], style?: Style[]): Feature | Feature[] {
        const prov = <FeatureProvider> this._fp;

        if (prov.addFeature) {
            const providerFeature = prov.addFeature(<Feature>feature);

            if (style) {
                this.setStyleGroup(providerFeature, style);
            }
            return providerFeature;
        }
    };


    /**
     * Remove feature(s) from the layer.
     *
     * @param feature - features that should be removed from the layer
     */
    removeFeature(feature: GeoJSONFeature | Feature | GeoJSONFeatureCollection | GeoJSONFeature[]) {
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
     * @param feature - the feature that's styleGroup should be set
     * @param styleGroup - the styleGroup that feature should be displayed with
     */
    setStyleGroup(feature: Feature, styleGroup?: Style[] | false | null): void;

    setStyleGroup(feature, style?, merge?) {
        if (this._sd) {
            this.dispatchEvent(STYLEGROUP_CHANGE_EVENT, {
                feature,
                styleGroup: this._sd.setStyleGroup(feature, style, merge)
            });
        }
    };

    /**
     * Get styleGroup for the feature.
     *
     * @param feature - the feature to get style
     * @param zoomlevel - specify the zoomlevel for the feature style
     *
     */
    getStyleGroup(feature, zoomlevel?: number, layerDefault?: boolean): Style[] {
        return this._sd && this._sd.getStyleGroup(feature, zoomlevel, layerDefault);
    };

    /**
     * Search for feature(s) in the layer.
     *
     * @param options - configure the search
     * @example
     * ```
     * // searching by id:
     * layer.search({id: 1058507462})
     *
     * // remote search:
     * layer.search({
     *     id: 1058507462,
     *     remote: true, // force layer to do remote search if feature/search area is not cached locally
     *     onload: (result) => {...}
     * })
     * ```
     * @returns array of features
     */
    search(options: {
        /**
         * search a feature by id.
         */
        id: number | string,
        /**
         * Force the data provider(s) to do remote search if no result is found in local cache.
         */
        remote?: boolean,
        /**
         * Callback function for "remote" search.
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
     * Search for feature(s) in the layer.
     *
     * @param options - configure the search
     * @example
     * ```
     * // searching features by id:
     * layer.search({ids: [1058507462, 1058507464]})
     *
     * // searching by point and radius:
     * layer.search({
     *     point: {longitude: 72.84205, latitude: 18.97172},
     *     radius: 100
     * })
     *
     * // searching by Rect:
     * layer.search({
     *     rect:  {minLon: 72.83584, maxLat: 18.97299, maxLon: 72.84443, minLat: 18.96876}
     * })
     *
     * // remote search:
     * layer.search({
     *     rect:  {minLon: 72.83584, maxLat: 18.97299, maxLon: 72.84443, minLat: 18.96876},
     *     remote: true, // force layer to do remote search if feature/search area is not cached locally
     *     onload: (result) => {...}
     * })
     * ```
     * @returns array of features
     */
    search(options: {
        /**
         * Array of feature ids to search.
         */
        ids?: number[] | string[],
        /**
         * Geographical center point of the circle to search in. options.radius must be defined.
         */
        point?: GeoPoint,
        /**
         * Radius of the circle in meters, it is used in "point" search.
         */
        radius?: number,
        /**
         * Geographical Rectangle to search in. [minLon, minLat, maxLon, maxLat] | GeoRect.
         */
        rect?: GeoRect | GeoJSONBBox,
        /**
         * Force the data provider(s) to do remote search if no result is found in local cache.
         */
        remote?: boolean,
        /**
         * Callback function for "remote" search.
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
     * Rectangle Search for feature(s) in the layer.
     * @param rect - Geographical Rectangle to search in. [minLon, minLat, maxLon, maxLat] | GeoRect.
     * @param options - configure the search
     *
     * @example
     * ```
     * layer.search({minLon: 72.83584, maxLat: 18.97299, maxLon: 72.84443, minLat: 18.96876})
     * // or:
     * layer.search([72.83584, 18.96876, 72.84443,18.97299])
     *
     * // remote search:
     * layer.search({ minLon: 72.83584, maxLat: 18.97299, maxLon: 72.84443, minLat: 18.96876 }, {
     *     remote: true, // force layer to do remote search if search area is not cached locally
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
     * Circle Search for feature(s) in the layer.
     * @param point - Geographical center point of the circle to search in. options.radius must be defined.
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
     *
     * // remote search:
     * layer.search([72.84205, 18.97172], {
     *  radius: 100,
     *  remote: true, // force layer to do remote search if search area is not cached locally
     *  onload: function(result){
     *   // search result is only return in this callback function if features are not found in cache.
     *  }
     * })
     * ```
     */
    search(point: GeoPoint, options: {
        /**
         * the radius is mandatory for circle search.
         */
        radius?: number,
        /**
         * Force the data provider(s) to do remote search if no result is found in local cache.
         */
        remote?: boolean,
        /**
         * Callback function for "remote" search.
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
    }): Feature[];

    /**
     * Search for feature by id in the layer.
     *
     * @param id - id of the feature to search for
     * @param options - configure the search
     *
     * @example
     * ```typescript
     * layer.search(1058507462)
     *
     * // remote search:
     * layer.search(1058507462,{
     * remote: true, // force layer to do remote search if search area is not cached locally
     * onload: function(feature){
     *  // search result is only return in this callback function if features are not found in cache.
     * }
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
         */
        onload?: (result: Feature) => void
    }): Feature;

    search(options: GeoRect | GeoJSONBBox | GeoPoint | string | number | {
        id?: number | string,
        ids?: number[] | string[],
        point?: GeoPoint,
        radius?: number,
        rect?: GeoRect | GeoJSONBBox,
        remote?: boolean,
        onload?: (result: Feature | Feature[] | null) => void
        onerror?: (error: { name: 'NetworkError', message: string, responseText: string, status: number }) => void
    }, _options?): Feature | Feature[] {
        const prov = <FeatureProvider> this._fp;

        if (prov && prov.search) {
            return prov.search.apply(this._fp, arguments);
        }
    };

    /**
     * Get a tile by quadkey.
     *
     * @param quadkey - quadkey of the tile
     * @param callback - callback function
     * @returns the Tile is returned if its already cached locally
     */
    getTile(quadkey: string, callback: (tile: Tile) => void): Tile | undefined {
        const level = quadkey.length;
        const provider = this._p[level];

        if (provider) {
            return provider.getTile(quadkey, callback);
        }
    };

    cancelTile(tile: Tile | string, cb?) {
        const level = typeof tile == 'string'
            ? tile.length
            : tile.quadkey.length;

        const prov = <RemoteTileProvider> this._p[level];
        if (prov && prov.cancel) {
            return prov.cancel(tile, cb);
        }
    };

    /**
     * Get a locally cached tile by quadkey.
     *
     * @param quadkey - the quadkey of the tile
     */
    getCachedTile(quadkey: string): Tile {
        const level = quadkey.length;
        const prov = this._p[level];

        if (prov) {
            return prov.getCachedTile(quadkey);
        }
    };


    /**
     * Set layer with given style.
     *
     * @param layerStyle - the layerStyle
     * @param keepCustom - keep and reuse custom set feature styles that have been set via layer.setStyleGroup(...)
     */
    setStyle(layerStyle: LayerStyle, keepCustom: boolean = false) {
        const isFnc = (fnc) => typeof fnc == 'function';

        // @ts-ignore
        if (!isFnc(layerStyle.getStyleGroup) || !isFnc(layerStyle.setStyleGroup)) {
            layerStyle = new LayerStyleImpl(layerStyle, keepCustom && this._sd && this._sd._c);
        }

        this._sd = layerStyle;

        this.dispatchEvent(STYLE_CHANGE_EVENT, {style: layerStyle});
    };

    /**
     * Get the current layerStyle.
     */
    getStyle(): LayerStyle {
        return this._sd;
    };


    getMargin() {
        return this.margin;
    };

    /**
     * Set the tile margin in pixel.
     *
     * @param tileMargin - the tileMargin
     */
    setMargin(tileMargin: number = 0) {
        tileMargin = Number(tileMargin);

        const providers = this._p;
        let p = providers.length;

        while (p--) {
            if (providers[p]) {
                providers[p].setMargin(tileMargin);
            }
        }

        return this.margin = tileMargin;
    };


    /**
     * enable or disable pointer-event triggering for all features of all layers.
     *
     * @param active - boolean to enable or disable posinter-events.
     *
     * @returns boolean indicating if pointer-event triggering is active or disabled.
     */
    pointerEvents(active?: boolean): boolean {
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
    //  * get copyright information of all providers used by the layer.
    //  *
    //  * @public
    //  * @expose
    //  * @param {here.xyz.maps.layers.TileLayer~copyrightCallback} callback that handles copyright response
    //  * @function
    //  * @name here.xyz.maps.layers.TileLayer#getCopyright
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
