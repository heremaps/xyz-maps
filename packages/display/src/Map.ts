/*
 * Copyright (C) 2019-2021 HERE Europe B.V.
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

import {getElDimension} from './DOMTools';
import WebglDisplay from './displays/webgl/Display';
import CanvasDisplay from './displays/canvas/Display';
import BasicDisplay from './displays/BasicDisplay';
import {Behavior, BehaviorOptions} from './behavior/Behavior';
import {EventDispatcher} from './event/Dispatcher';
import {Search} from './search/Search';
import {MapEvent} from './event/Event';
import MVCRecognizer from './MVCRecognizer';
import UI from './ui/UI';
import {JSUtils, Listener} from '@here/xyz-maps-common';
import {ZoomAnimator} from './animation/ZoomAnimator';
import {KineticPanAnimator} from './animation/KineticPanAnimator';
import {defaultOptions, MapOptions} from './MapOptions';
import {
    Feature,
    TileLayer,
    webMercator,
    PixelPoint,
    PixelRect,
    GeoPoint,
    GeoRect,
    utils,
    GeoJSONFeatureCollection, GeoJSONFeature, GeoJSONBBox
} from '@here/xyz-maps-core';

const project = webMercator;

const DEFAULT_ZOOM_ANIMATION_MS = 250;
let DEFAULT_ZOOM_BEHAVIOR: 'fixed' | 'float' | boolean = 'fixed';

const MAX_LONGITUDE = 180;
const MIN_LONGITUDE = -MAX_LONGITUDE;
const MAX_LATITUDE = 85.05112878;
const MIN_LATITUDE = -MAX_LATITUDE;

const TILESIZE = 256;
const RENDER_TILE_SIZE = 256;

const MAX_GRID_ZOOM = 20;
const MAX_ALLOWED_ZOOM = 28;

const LON = 'longitude';
const LAT = 'latitude';
const WIDTH = 'width';
const HEIGHT = 'height';
const BEHAVIOR_ZOOM = 'zoom';
const BEHAVIOR_DRAG = 'drag';
const BEHAVIOR_PITCH = 'pitch';
const BEHAVIOR_ROTATE = 'rotate';
const ON_LAYER_ADD_EVENT = 'addLayer';
const ON_LAYER_REMOVE_EVENT = 'removeLayer';

let instances = [];
let UNDEF;

function calcZoomLevelForBounds(minLon, minLat, maxLon, maxLat, mapWidth, mapHeight) {
    let maxZoom = 20;
    let maxWorldSize = Math.pow(2, maxZoom) * TILESIZE;
    let zoomLevelWidth;
    let zoomLevelHeight;
    let toMap;

    for (let zoom = maxZoom; zoom >= 0; --zoom) {
        toMap = maxZoom - zoom;

        zoomLevelWidth =
            (project.lon2x(maxLon, maxWorldSize) >> toMap) - (project.lon2x(minLon, maxWorldSize) >> toMap);

        zoomLevelHeight =
            (project.lat2y(minLat, maxWorldSize) >> toMap) - (project.lat2y(maxLat, maxWorldSize) >> toMap);

        if (zoomLevelWidth <= mapWidth && zoomLevelHeight <= mapHeight) {
            return zoom;
        }
    }

    return 0;
}


/**
 * XYZ Map is a highly customizable WebGL based vector map display that's optimized for map editing, larger raw datasets and frequently changing data.
 */
export class Map {
    static getInstances() {
        return instances.slice();
    }

    id: number;

    private readonly _el: HTMLElement;
    private readonly _l: Listener;
    private _w: number; // map width in pixel
    private _h: number; // map height in pixel
    private _cx: number; // center screen in pixel
    private _cy: number; // center screen in pixel

    private _s: number = 1; // current scale

    private _display: BasicDisplay;
    private _mvcRecognizer: MVCRecognizer;
    private _rz: number = 0; // rotation z in rad
    private _rx: number = 0; // rotation x in rad
    private _z: number; // zoom level

    private _tlwx: number;
    private _tlwy: number;

    private _wSize: number; // world size pixel

    private _vp: GeoRect; // viewport/viewbounds

    private ui: UI;

    private readonly _cfg: MapOptions;// mapconfig

    private _evDispatcher: EventDispatcher;
    private _b: Behavior;

    // TODO: cleanup
    private _cw: PixelPoint = new PixelPoint(0, 0); // center world in pixel
    private _c: GeoPoint = new GeoPoint(0, 0); // center geo
    private _pc: GeoPoint = new GeoPoint(0, 0); // previous center geo

    // TODO: remove screenOffset
    private _ox = 0; // screenOffsetY
    private _oy = 0; // screenOffsetX

    // TODO: remove
    _layers: TileLayer[];
    private readonly _vplock: any; // current viewport lock state
    private zoomAnimator: ZoomAnimator;
    private _search: Search;

    /**
     * @param mapEl - HTMLElement used to create the map display
     * @param options - options to configure for the map
     *
     * @example
     * ```typescript
     * import {Map} from '@here/xyz-maps-display';
     *
     * //create map display
     * const display = new Map( mapDiv, {
     *     zoomLevel : 19,
     *     center: {
     *         longitude: 8.53422,
     *         latitude: 50.16212
     *     },
     *     // add layers to display
     *     layers: layers
     * });
     * ```
     */
    constructor(mapEl: HTMLElement, options: MapOptions) {
        this._cfg = options = JSUtils.extend(true,
            JSUtils.extend(true, {}, defaultOptions),
            options || {}
        );

        let tigerMap = this;

        // mapsize is same as displaysize by default
        this._w = getElDimension(mapEl, WIDTH);
        this._h = getElDimension(mapEl, HEIGHT);
        this._cx = this._w / 2;
        this._cy = this._h / 2;

        // init defaults
        const zoomLevel = options['zoomLevel'] || options['zoomlevel'];

        options.maxLevel = Math.min(MAX_ALLOWED_ZOOM, options.maxLevel);

        this._z = Math.min(MAX_GRID_ZOOM, zoomLevel) ^ 0;

        this._wSize = Math.pow(2, this._z) * TILESIZE;
        this._l = new Listener([
            'center',
            'rotation',
            'zoomlevel',

            'mapviewchangestart',
            'mapviewchange',
            'mapviewchangeend',

            'resize',

            ON_LAYER_ADD_EVENT,
            ON_LAYER_REMOVE_EVENT
        ]);

        let listeners = this._l;
        let layers = [];
        let parent = mapEl;


        tigerMap._layers = layers;
        tigerMap.id = Math.random() * 1e6 ^ 0;

        mapEl = document.createElement('div');
        mapEl.className = '_' + JSUtils.String.random(11);
        mapEl.style['-webkit-tap-highlight-color'] = 'rgba(0,0,0,0)';
        mapEl.style.position = 'relative';
        mapEl.style.width = this._w + 'px';
        mapEl.style.height = this._h + 'px';

        parent.appendChild(mapEl);

        this._el = mapEl;

        console.log('TM', this._w, 'x', this._h);

        const Display = options['renderer'] == 'canvas' ? CanvasDisplay : WebglDisplay;

        if (typeof Display.zoomBehavior == 'string') {
            DEFAULT_ZOOM_BEHAVIOR = Display.zoomBehavior;
        }

        // var display = new Display( tigerMap, mapEl );
        const display = new Display(
            mapEl,
            RENDER_TILE_SIZE,
            options['devicePixelRatio'],
            options['renderOptions'] || {}
        );

        tigerMap._mvcRecognizer = new MVCRecognizer(tigerMap,
            function triggerEventListeners(type, detail, sync) {
                listeners.trigger(
                    type,
                    [new MapEvent(type, detail)],
                    sync
                );
            },
            display
        );

        tigerMap._display = display;

        this._search = new Search(tigerMap);

        const pointerEvents = this._evDispatcher = new EventDispatcher(mapEl, tigerMap, layers, options);

        listeners.add('mapviewchangestart', (e) => pointerEvents.disable('pointerenter'));
        listeners.add('mapviewchangeend', (e) => pointerEvents.enable('pointerenter'));
        listeners.add('mapviewchangeend', (e) => display.viewChangeDone());


        this.zoomAnimator = new ZoomAnimator(tigerMap);

        const behaviorOptions = {...options['behavior'], ...options['behaviour']};

        if (behaviorOptions[BEHAVIOR_ZOOM] == UNDEF) {
            behaviorOptions[BEHAVIOR_ZOOM] = DEFAULT_ZOOM_BEHAVIOR;
        }

        let behavior = this._b = new Behavior(
            mapEl,
            tigerMap,
            new KineticPanAnimator(tigerMap),
            <BehaviorOptions>behaviorOptions,
            options
        );
        // just attach the eventlisteners..
        // does not influence actual drag/zoom behavior
        behavior.drag(true);
        behavior.scroll(true);

        this._vplock = {
            pan: false,
            minLevel: options['minLevel'],
            maxLevel: options['maxLevel']
        };

        const uiOptions = options['UI'] || options['ui'] || {};
        if (uiOptions.Compass == UNDEF) {
            // enable compass ui if pitch or rotate is enabled
            uiOptions.Compass = behaviorOptions[BEHAVIOR_ROTATE] || behaviorOptions[BEHAVIOR_PITCH];
        }

        this.ui = new UI(mapEl, options, tigerMap);

        tigerMap.setCenter(options['center']);
        tigerMap.pitch(options['pitch']);
        tigerMap.rotate(options['rotate']);

        tigerMap.setZoomlevel(zoomLevel);

        tigerMap._layerClearListener = tigerMap._layerClearListener.bind(tigerMap);

        for (let layer of (options['layers'] || [])) {
            tigerMap.addLayer(layer);
        }

        instances.push(this);
    }

    private _layerClearListener(ev) {
        // refresh(re-fetch) data if layer get's cleared
        this.refresh(ev.detail.layer);
    }

    private initViewPort(): [number, number] {
        const currentScale = this._s;
        let cOffsetX = this._w / 2;
        let cOffsetY = this._h / 2;

        let centerWorldPixelX = this._cw.x;
        let centerWorldPixelY = this._cw.y;

        let topLeftWorldX = centerWorldPixelX - cOffsetX / currentScale;
        let topLeftWorldY = centerWorldPixelY - cOffsetY / currentScale;

        this._tlwx = topLeftWorldX;
        this._tlwy = topLeftWorldY;

        // topLeftX = centerWorldPixelX - this._w / currentScale / 2;
        // topLeftY = centerWorldPixelY - this._h / currentScale / 2;

        this._ox = centerWorldPixelX - cOffsetX - topLeftWorldX;
        this._oy = centerWorldPixelY - cOffsetY - topLeftWorldY;


        const worldSizePixel = this._wSize;

        let topLeftLon = project.x2lon(topLeftWorldX, worldSizePixel);
        let topLeftLat = project.y2lat(topLeftWorldY, worldSizePixel);
        let bottomRightX = centerWorldPixelX + cOffsetX / currentScale;
        let bottomRightY = centerWorldPixelY + cOffsetY / currentScale;
        let bottomRightLon = project.x2lon(bottomRightX, worldSizePixel);
        let bottomRightLat = project.y2lat(bottomRightY, worldSizePixel);

        this._vp = new GeoRect(topLeftLon, bottomRightLat, bottomRightLon, topLeftLat);

        return [centerWorldPixelX / worldSizePixel, centerWorldPixelY / worldSizePixel];
    };

    private updateGrid() {
        const display = this._display;
        const centerGeo = this._c;
        const prevCenterGeo = this._pc;

        this._mvcRecognizer.watch(true);

        display.setTransform(this._s, this._rz, this._rx);

        display.updateGrid(this.initViewPort(), this._z, this._ox, this._oy);

        if (prevCenterGeo[LON] != centerGeo[LON] || prevCenterGeo[LAT] != centerGeo[LAT]) {
            this._l.trigger('center', ['center', centerGeo, prevCenterGeo], true);
            this._pc = centerGeo;
        }
    }

    private _setCenter(lon, lat) {
        const worldSizePixel = this._wSize;

        if (arguments.length != 2) {
            if (lon instanceof Array) {
                lat = lon[1];
                lon = lon[0];
            } else {
                lon = lon || this._c;
                lat = lon[LAT];
                lon = lon[LON];
            }
        }

        if (isNaN(lon) || isNaN(lat) || typeof lon != 'number' || typeof lat != 'number') {
            return false;
        }

        if (lon > MAX_LONGITUDE) {
            lon -= 360;
        } else if (lon < MIN_LONGITUDE) {
            lon += 360;
        }

        if (lat < MIN_LATITUDE) {
            lat = MIN_LATITUDE;
        } else if (lat > MAX_LATITUDE) {
            lat = MAX_LATITUDE;
        }

        this._c = new GeoPoint(lon, lat);

        this._cw = new PixelPoint(
            project.lon2x(lon, worldSizePixel),
            project.lat2y(lat, worldSizePixel)
        );

        return true;
    }

    repaint() {
        this.updateGrid();
    };

    debug(d) {
        this._display.showGrid(d);
        this.updateGrid();
    };

    /**
     * Set or get map pitch (tilt) in degrees
     *
     * @param pitch - pitch in degrees
     */
    pitch(pitch?: number) {
        if (pitch !== UNDEF) {
            const maxPitch = this._cfg.maxPitch;
            const deg = Math.max(0, Math.min(maxPitch, Math.round(pitch % 360 * 10) / 10));

            this._rx = -deg * Math.PI / 180;
            this.updateGrid();
        }
        return -this._rx * 180 / Math.PI;
    };

    /**
     * Set or get map rotation along z-axis
     *
     * @param rotation - set absolute map rotation in degrees
     *
     * @returns current applied rotation in degrees
     */
    rotate(rotation?: number): number {
        if (rotation !== UNDEF) {
            const rad = Math.round(10 * rotation || 0) * Math.PI / 1800;
            const rotZRad = this._rz;

            if (rad !== rotZRad) {
                const rcx = this._cx;
                const rcy = this._cy;
                const uRotCenter = this._display.unproject(rcx, rcy);
                const centerWorldPixel = this._cw;

                centerWorldPixel.x += uRotCenter[0] - rcx;
                centerWorldPixel.y += uRotCenter[1] - rcy;

                this._rz = rad;

                this.updateGrid();

                this._l.trigger('rotation',
                    ['rotation', this._rz, rotZRad],
                    true
                );
            }
        }
        return this._rz / Math.PI * 180;
    };

    /**
     * Set the background color of the map
     *
     * @param color - the background color to set
     */
    setBackgroundColor(color: string) {
        this._display.setBGColor(color);
        this.refresh();
    };

    /**
     * Adds an event listener to the map.
     * supported events: 'mapviewchangestart', 'mapviewchange', 'mapviewchangeend', 'resize',
     * 'tap', 'dbltap', 'pointerup', 'pointerenter', 'pointerleave', 'pointerdown', 'pointermove', 'pressmove'
     *
     * @param type - A string representing the event type to listen for.
     * @param listener - the listener function that will be called when an event of the specific type occurs
     */
    addEventListener(type: string, listener: (e: MapEvent) => void) {
        const listeners = this._l;
        type.split(' ').forEach((type) => {
            if (listeners.isDefined(type)) { // normal event listeners.
                return listeners.add(type, listener);
            }
            this._evDispatcher.addEventListener(type, listener);
        });
    };

    /**
     * Removes an event listener to the map.
     *
     * @param type - A string representing the event type to listen for.
     * @param listener - The EventListener function of the event handler to remove from the editor.
     */
    removeEventListener(type: string, listener: (e: MapEvent) => void) {
        const listeners = this._l;
        type.split(' ').forEach((type) => {
            if (listeners.isDefined(type)) { // normal event listeners.
                return listeners.remove(type, listener);
            }
            this._evDispatcher.removeEventListener(type, listener);
        });
    };

    /**
     * Gets the current view bounds of the view port.
     */
    getViewBounds(): GeoRect {
        let viewport = this._vp;
        let minLon = viewport.minLon;
        let maxLon = viewport.maxLon;
        let minLat = viewport.minLat;
        let maxLat = viewport.maxLat;

        if (minLat <= MIN_LATITUDE) {
            minLat = -90;
        }

        if (maxLat >= MAX_LATITUDE) {
            maxLat = 90;
        }

        if (minLon < MIN_LONGITUDE) {
            minLon = MIN_LONGITUDE;
        }

        if (maxLon > MAX_LONGITUDE) {
            maxLon = MAX_LONGITUDE;
        }

        return new GeoRect(minLon, minLat, maxLon, maxLat);
    };

    /**
     * Set view bounds for the map to display.
     *
     * @param bounds - GeoRect, GeoJson Feature or an GeoJson bbox [minLon, minLat, maxLon, maxLat] defining the view bounds.
     */
    setViewBounds(bounds: GeoRect | [number, number, number, number] | GeoJSONFeature | GeoJSONFeature[] | GeoJSONFeatureCollection) {
        const args = arguments;
        let minLon;
        let minLat;
        let maxLon;
        let maxLat;

        if (typeof bounds == 'number') {
            bounds = [args[0], args[1], args[2], args[3]];
        } else if ((<GeoJSONFeatureCollection>bounds).type == 'FeatureCollection') {
            bounds = (<GeoJSONFeatureCollection>bounds).features;
        } else if ((<Feature>bounds).type == 'Feature') {
            bounds = [<Feature>bounds];
        }

        if (Array.isArray(bounds)) {
            if (typeof bounds[0] == 'object') {
                // convert/merge Feature[] to bbox
                const bbox: GeoJSONBBox = [Infinity, Infinity, -Infinity, -Infinity];
                // calc merged bbox
                for (let feature of <Feature[]>bounds) {
                    utils.calcBBox(feature, bbox);
                }
                bounds = bbox;
            }
            minLon = bounds[0];
            minLat = bounds[1];
            maxLon = bounds[2];
            maxLat = bounds[3];
        } else {
            const rect = <GeoRect>bounds;
            minLon = rect.minLon;
            minLat = rect.minLat;
            maxLon = rect.maxLon;
            maxLat = rect.maxLat;
        }

        this.setZoomlevel(
            calcZoomLevelForBounds(
                minLon,
                minLat,
                maxLon,
                maxLat,
                this.getWidth(),
                this.getHeight()
            )
        );

        this.setCenter(
            minLon + (maxLon - minLon) / 2,
            minLat + (maxLat - minLat) / 2
        );
    };

    /**
     * Get most top rendered feature within the given area of map
     *
     * @param position - Point or Rect in pixel to define search area.
     * If a Point is used, width and height must be passed in options parameter.
     *
     * @param options - Describing the options param
     *
     * @returns The result providing found feature and layer.
     * undefined is returned if nothing is found.
     */
    getFeatureAt(position: PixelPoint | PixelRect, options?: {
        /**
         * width in pixel of rectangle if point geometry is used.
         */
        width?: number;
        /**
         * height in pixel of rectangle if point geometry is used.
         */
        height?: number;
        /**
         * defines the layer(s) to search in.
         */
        layers?: TileLayer | TileLayer[]
    }): { feature: Feature, layer: TileLayer } | undefined {
        options = options || {};
        (<any>options).topOnly = true;

        const results = this.getFeaturesAt(position, options);

        if (results.length) {
            const result = <any>results[results.length - 1];
            result.feature = result.features[0];
            return result;
        }
    };

    /**
     * Get rendered features within the given area of map
     *
     * @param position - Point or Rect in pixel to define search area.
     * If a Point is used, width and height must be passed in options parameter.
     *
     * @param options - Describing the options param
     *
     * @returns zIndex ordered results array
     */
    getFeaturesAt(position: PixelPoint | PixelRect, options?: {
        /**
         * width in pixel of rectangle if point geometry is used.
         */
        width?: number;
        /**
         * height in pixel of rectangle if point geometry is used.
         */
        height?: number;
        /**
         * defines the layer(s) to search in.
         */
        layers?: TileLayer | TileLayer[],
        /**
         * if set to true only the top most feature will be returned. [default: false]
         */
        topOnly?: boolean
    }): { features: Feature[], layer: TileLayer }[] {
        let x1;
        let x2;
        let y1;
        let y2;

        options = options || {};

        // its a point
        if ((<PixelPoint>position).x != UNDEF && (<PixelPoint>position).y != UNDEF) {
            let x = (<PixelPoint>position).x;
            let y = (<PixelPoint>position).y;
            let w = options.width ^ 0;
            let h = options.height || w;

            x1 = x - w / 2;
            x2 = x + w / 2;

            y1 = y - h / 2;
            y2 = y + h / 2;
        } else if ((<PixelRect>position).minX != UNDEF && (<PixelRect>position).maxX != UNDEF) {
            // its a  rect point
            x1 = (<PixelRect>position).minX;
            y1 = (<PixelRect>position).minY;
            x2 = (<PixelRect>position).maxX;
            y2 = (<PixelRect>position).maxY;
        }

        return x1 != UNDEF && this._search.search(
            x1, y1, x2, y2,
            options.layers,
            options.topOnly
        );
    };

    /**
     * Get current active map behavior options.
     */
    getBehavior(): {
        /**
         * indicates if map zooming is enabled or disabled.
         */
        zoom: boolean;
        /**
         * indicates if map dragging is enabled or disabled.
         */
        drag: boolean;
        /**
         * indicates if map pitching is enabled or disabled.
         */
        pitch: boolean;
        /**
         * indicates if map rotation is enabled or disabled.
         */
        rotate: boolean;
        } {
        const settings = {};
        const options = this._b.getOptions();
        for (let b in options) {
            settings[b] = !!options[b];
        }
        return <any>settings;
    };

    /**
     * Set the map behavior on user interaction.
     *
     * @example
     * ```typescript
     * // to deactivate map zoom on mouse scroll:
     * setBehavior({zoom: false, drag: true});
     * ```
     *
     * @param options - Behavior options
     */
    setBehavior(options: {
        /**
         * true to enable map zooming, false to disable.
         */
        zoom?: boolean;
        /**
         * true to enable map dragging, false to disable.
         */
        drag?: boolean;
        /**
         * true to enable map pitching, false to disable.
         */
        pitch?: boolean;
        /**
         * true to enable map rotation, false to disable.
         */
        rotate?: boolean;
    }): void;

    /**
     * Enable/Disable a specific map behavior on user interaction.
     * Possible behavior are: "zoom", "drag", "pitch" and "rotate
     *
     * @example
     * ```typescript
     * // to deactivate map zoom on mouse scroll:
     * setBehavior('zoom',true);
     * ```
     *
     * @param behavior - the behavior that should be disabled or enabled.
     * @param active - true to enable, false to disable
     */
    setBehavior(behavior: string, active: boolean);

    setBehavior(key, value?) {
        let type = typeof key;
        let options = type == 'object' ? key : {};
        const behaviorOptions = this._b.getOptions();

        if (type == 'string') {
            options[key] = value;
        }

        let zoom = options[BEHAVIOR_ZOOM];
        if (zoom != UNDEF) {
            // "backdoor" to change default zoom behavior..
            if (zoom == 'fixed' || zoom == 'float') {
                behaviorOptions[BEHAVIOR_ZOOM] = zoom;
            } else {
                behaviorOptions[BEHAVIOR_ZOOM] = zoom
                    ? DEFAULT_ZOOM_BEHAVIOR
                    : false;
            }
        }
        for (let option of [BEHAVIOR_DRAG, BEHAVIOR_PITCH, BEHAVIOR_ROTATE]) {
            let val = options[option];
            if (val != UNDEF) {
                behaviorOptions[option] = !!val;
            }
        }
    };

    /**
     * Get the current zoom level
     *
     * @returns the current zoom level of the map
     */
    getZoomlevel(): number {
        return this._z + Math.log(this._s) / Math.LN2;
    };

    /**
     * Set zoomlevel with an optional anchor point.
     *
     * @param zoomTo - new zoomlevel
     * @param fixedX - x coordinate of fixed anchor point on screen in pixels
     * @param fixedY - y coordinate of fixed anchor point on screen in pixels
     * @param animate - zoom transition animation time in milliseconds [default: 0]
     */
    setZoomlevel(zoomTo: number, fixedX?: number, fixedY?: number, animate?: number) {
        const vplock = this._vplock;
        const zoomLevel = this._z;
        const currentScale = this._s;

        zoomTo = Math.round(zoomTo * 1e3) / 1e3;
        zoomTo = Math.max(Math.min(zoomTo, vplock.maxLevel), vplock.minLevel);

        if (arguments.length == 2) {
            animate = fixedX;
            fixedX = UNDEF;
        }
        if (fixedX == UNDEF || fixedY == UNDEF) {
            fixedX = this._cx;
            fixedY = this._cy;
        }

        if (zoomLevel != zoomTo || currentScale != 1) {
            if (animate) {
                this.zoomAnimator.animate(zoomTo, fixedX, fixedY,
                    typeof animate === 'number'
                        ? animate
                        : DEFAULT_ZOOM_ANIMATION_MS
                );
            } else {
                const startZoom = this.getZoomlevel();
                const _uFixed = this._display.unproject(fixedX, fixedY);
                const gridZoom = Math.min(MAX_GRID_ZOOM, zoomTo) ^ 0;
                const deltaFixedZoom = zoomLevel - gridZoom;
                const worldSizePixel = this._wSize;
                const scale = Math.pow(2, zoomTo - gridZoom);

                if (deltaFixedZoom) {
                    this._z = Math.min(MAX_GRID_ZOOM, zoomTo) ^ 0;
                    this._wSize = Math.pow(2, this._z) * TILESIZE;
                }

                this._display.setTransform(scale * Math.pow(.5, deltaFixedZoom), this._rz, this._rx);

                const uFixed = this._display.unproject(fixedX, fixedY);

                this._setCenter(
                    project.x2lon(this._cw.x + _uFixed[0] - uFixed[0], worldSizePixel),
                    project.y2lat(this._cw.y + _uFixed[1] - uFixed[1], worldSizePixel)
                );

                this._s = scale;
                this.updateGrid();

                this._l.trigger('zoomlevel', ['zoomlevel', this.getZoomlevel(), startZoom], true);
            }
        }
    };


    /**
     * Set new geographical center for the map.
     *
     * @param center - the geographical coordinate to center the map
     *
     * @example
     * ```typescript
     * display.setCenter({longitude: 8.53422, latitude: 50.16212});
     * ```
     */
    setCenter(center: GeoPoint);
    /**
     * Set new geographical center for the map.
     *
     * @param logitude - longitude to center the map
     * @param latitude - latitude to center the map
     *
     * @example
     * ```typescript
     * display.setCenter(8.53422, 50.16212);
     * ```
     */
    setCenter(longitude: number | GeoPoint, latitude: number);

    setCenter(lon: number | GeoPoint, lat?: number) {
        if (this._setCenter.apply(this, arguments)) {
            this.updateGrid();
        }
    };

    /**
     * Get the current geographical center of the map.
     *
     * @returns the map's geographical center point.
     */
    getCenter(): GeoPoint {
        return new GeoPoint(
            this._c.longitude,
            this._c.latitude
        );
    };


    /**
     * get the current applied lock status of the map.
     *
     * @returns the current applied lock options.
     */
    lockViewport(): { pan: boolean, minLevel: number, maxLevel: number };
    /**
     * set lock the viewport of the map.
     * by indicating if panning, minLevel and maxLevel should be locked.
     *
     * @param options - the lock options.
     *
     * @returns the current applied lock options.
     */
    lockViewport(options: {
        /**
         * true to enable panning, false to disable panning.
         */
        pan?: boolean,
        /**
         * the minimum allowed zoom level that can be zoomed to.
         */
        minLevel?: number,
        /**
         * the maximum allowed zoom level that can be zoomed to.
         */
        maxLevel?: number
    }): { pan: boolean, minLevel: number, maxLevel: number };

    lockViewport(options?): { pan: boolean, minLevel: number, maxLevel: number } {
        const lockState = this._vplock;

        if (options) {
            let pan = options['pan'];
            let minLevel = options['minLevel'];
            let maxLevel = options['maxLevel'];

            // reset to default
            minLevel = minLevel === false ? this._cfg['minLevel'] : minLevel;
            maxLevel = maxLevel === false ? this._cfg['maxLevel'] : maxLevel;

            if (pan != UNDEF) {
                lockState['pan'] = pan;
            }

            if (typeof minLevel == 'number') {
                lockState['minLevel'] = minLevel;
            }

            if (typeof maxLevel == 'number') {
                lockState['maxLevel'] = maxLevel;
            }
        }

        return lockState;
    };


    /**
     * Shift the geographical center of the map in pixels.
     *
     * @param dx - distance in pixels to pan the map on x axis
     * @param dy - distance in pixels to pan the map on y axis
     */
    pan(dx: number, dy: number) {
        // make sure dx or dy results in real viewport change...
        if (dx != 0 || dy != 0) {
            const worldSizePixel = this._wSize;
            const cx = this._cx;
            const cy = this._cy;
            const centerWorldPixel = this._cw;
            const uDelta = this._display.unproject(cx + dx, cy + dy);
            const x = centerWorldPixel.x - uDelta[0] + cx;
            const y = centerWorldPixel.y - uDelta[1] + cy;

            this.setCenter(
                project.x2lon(x, worldSizePixel),
                project.y2lat(y, worldSizePixel)
            );
        }
    };

    /**
     * Get the current added layer(s) of the map.
     *
     * @returns the layer(s) that are added to the map
     */
    getLayers(): TileLayer[];
    /**
     * Get a specific Layer of the map.
     *
     * @param index - get a specific layer at index in the layer hierarchy
     *
     * @returns the layer that is added to the map
     */
    getLayers(index: number): TileLayer;

    getLayers(index?: number): TileLayer | TileLayer[] {
        const layers = this._layers;
        if (index != UNDEF) {
            return layers[index];
        }
        return layers.slice();
    };


    /**
     * Adds a layer to the map.
     * If index is defined the layer will be placed at respective index in the layer hierarchy.
     * Otherwise it's added on top (last).
     *
     * @param layer - the layer to add
     * @param index - the index in layer hierarchy where the layer should be inserted.
     */
    addLayer(layer: TileLayer, index?: number) {
        const layers = this._layers;
        // make sure layer isn't active already
        if (layers.indexOf(layer) == -1) {
            if (index == UNDEF) {
                index = layers.length;
            }
            // initLayer(layer, index);
            this._display.addLayer(layer, layer.getStyle(), index);
            // if layer get's cleared -> refresh/re-fetch data
            // layer.addEventListener('clear', (ev)=>this.refresh(ev.detail.layer));
            layer.addEventListener('clear', this._layerClearListener);
            this._l.trigger(ON_LAYER_ADD_EVENT,
                [new MapEvent(ON_LAYER_ADD_EVENT, {index: index, layer: layer})]
            );

            layers.splice(index, 0, layer);
            this.updateGrid();
        }
    };


    /**
     * Remove a layer from the map.
     *
     * @param layer - the layer to remove
     */
    removeLayer(layer: TileLayer) {
        const layers = this._layers;
        const index = layers.indexOf(layer);

        if (index >= 0) {
            this._display.removeLayer(layer);
            // layer.removeEventListener('clear', (ev)=>this.refresh(ev.detail.layer));
            layer.removeEventListener('clear', this._layerClearListener);

            layers.splice(index, 1);

            this.updateGrid();

            this._l.trigger(
                ON_LAYER_REMOVE_EVENT,
                [new MapEvent(ON_LAYER_REMOVE_EVENT, {index: index, layer: layer})]
            );
        }
    };


    /**
     * Refresh the map view.
     * Manually trigger re-rendering of specific layer(s) of the map.
     *
     * @param layers - the layer(s) that should be refreshed/re-rendered.
     */
    refresh(layers?: TileLayer | TileLayer[]) {
        if (!(layers instanceof Array)) {
            layers = [layers];
        }
        for (let layer of layers) {
            if (layer instanceof TileLayer) {
                this._display.clearLayer(layer);
            }
        }
        this.updateGrid();
    };

    /**
     * Converts from screen pixel to geo coordinate
     *
     * @param x - the x position on screen in pixel
     * @param y - the y position on screen in pixel
     *
     * @returns the geographical coordinate
     */
    pixelToGeo(x: number, y: number): GeoPoint;
    /**
     * Converts from screen pixel to geo coordinate
     *
     * @param position - the pixel coordinate on screen
     *
     * @returns the geographical coordinate
     */
    pixelToGeo(position: PixelPoint): GeoPoint;
    pixelToGeo(x: number | PixelPoint, y?: number): GeoPoint {
        const worldSizePixel = this._wSize;

        if (arguments.length == 1) {
            y = (<PixelPoint>x).y;
            x = (<PixelPoint>x).x;
        }
        const screenOffsetX = this._ox;
        const screenOffsetY = this._oy;

        // converts screenpixel to unprojected screenpixels
        let p = this._display.unproject(<number>x, <number>y);

        const topLeftWorldX = this._tlwx;
        const topLeftWorldY = this._tlwy;

        let worldX = p[0] + topLeftWorldX + screenOffsetX;
        let worldY = p[1] + topLeftWorldY + screenOffsetY;

        worldX %= worldSizePixel;
        worldY %= worldSizePixel;

        if (worldY < 0) {
            worldY += worldSizePixel;
        }

        return new GeoPoint(
            project.x2lon(worldX, worldSizePixel),
            project.y2lat(worldY, worldSizePixel)
        );
    };

    /**
     * Convert a geographical coordinate to a pixel coordinate relative to the current viewport of the map.
     *
     * @param longitude - the longitude
     * @param latitude - lat latitude
     *
     * @returns the pixel coordinate relative to the current viewport.
     */
    geoToPixel(longitude: number, latitude?: number): PixelPoint;
    /**
     * Convert a geographical coordinate to a pixel coordinate relative to the current viewport of the map.
     *
     * @param coordinate - the geographical coordinate
     *
     * @returns the pixel coordinate relative to the current viewport.
     */
    geoToPixel(coordinate: GeoPoint): PixelPoint;

    geoToPixel(lon: number | GeoPoint, lat?: number): PixelPoint {
        if (lat == UNDEF) {
            lat = (<GeoPoint>lon).latitude;
            lon = (<GeoPoint>lon).longitude;
        }

        if (lat < MIN_LATITUDE) {
            lat = MIN_LATITUDE;
        } else if (lat > MAX_LATITUDE) {
            lat = MAX_LATITUDE;
        }
        const worldSizePixel = this._wSize;
        const topLeftWorldX = this._tlwx;
        const topLeftWorldY = this._tlwy;
        const screenX = project.lon2x(<number>lon, worldSizePixel) - topLeftWorldX;
        const screenY = project.lat2y(<number>lat, worldSizePixel) - topLeftWorldY;
        const pixel = this._display.project(screenX, screenY);

        return new PixelPoint(pixel[0], pixel[1]);
    };

    /**
     * Destroy the the map.
     */
    destroy() {
        const mapEl = this._el;
        this.ui.destroy();

        this._layers.forEach((layer) => this.removeLayer(layer));

        this._display.destroy();

        mapEl.parentNode.removeChild(mapEl);

        this._mvcRecognizer.watch(false);

        this._evDispatcher.destroy();

        this._b.drag(false);
        this._b.scroll(false);
        // behavior.resize(false);

        const map = this;
        (<any>map).__proto__ = null;
        Object.keys(map).forEach((key) => delete map[key]);

        // remove stored map instance
        instances.splice(instances.indexOf(map), 1);
    };

    /**
     * Resize the map view.
     * If no width/height is passed the map will resize automatically to the maximum possible size defined by the HTMLElement.
     *
     * @param width - new width in pixels
     * @param height - new height in pixels
     */
    resize(width?: number, height?: number) {
        const mapEl = this._el;

        if (width == UNDEF || height == UNDEF) {
            width = getElDimension(<HTMLElement>mapEl.parentNode, WIDTH);
            height = getElDimension(<HTMLElement>mapEl.parentNode, HEIGHT);
        }

        const {_w, _h} = this;

        if (_w !== width || _h !== height) {
            mapEl.style.width = width + 'px';
            mapEl.style.height = height + 'px';

            this._display.setSize(width, height);

            this._w = width;
            this._h = height;

            this._cx = width / 2;
            this._cy = height / 2;

            this.updateGrid();

            this._l.trigger('resize', [new MapEvent('resize', {width: width, height: height})]);
        }
    };

    /**
     * Get the current width in pixels of map.
     *
     */
    getWidth(): number {
        return this._w;
    };

    /**
     * Get the current height in pixels of map.
     *
     */
    getHeight(): number {
        return this._h;
    };

    /**
     * Add an observer to the map.
     * Supported observer types are: "zoomlevel" and "center".
     *
     * @param name - the name of the value to observe
     * @param observer - the observer that will be executed on value changes.
     *
     * @returns boolean that's indicating if observer was added.
     */
    addObserver(name: string, observer: (name: string, newValue: any, prevValue: any) => void): boolean {
        if (name == 'zoomLevel') {
            name = 'zoomlevel';
        }
        return this._l.add(name, observer);
    };

    /**
     * Removes an observer from the map.
     *
     * @param name - the name of the value to observe
     * @param observer - the observer that should be removed.
     *
     * @returns boolean that's indicating if observer was removed.
     */
    removeObserver(name: string, observer: (name: string, newValue: any, prevValue: any) => void): boolean {
        if (name == 'zoomLevel') {
            name = 'zoomlevel';
        }
        return this._l.remove(name, observer);
    };

    /**
     * Get the HTMLElement used by the map.
     */
    getContainer(): HTMLElement {
        return <HTMLElement>(this._el.parentNode);
    };
}
