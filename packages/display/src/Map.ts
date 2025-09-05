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

import {getElDimension} from './DOMTools';
import WebglDisplay from './displays/webgl/Display';
import CanvasDisplay from './displays/canvas/Display';
import BasicDisplay from './displays/BasicDisplay';
import {Behavior, BehaviorOptions} from './behavior/Behavior';
import {EventDispatcher} from './event/Dispatcher';
import {Search} from './search/Search';
import {MapEvent} from './event/Event';
import MapViewListener from './MapViewListener';
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
    GeoJSONFeatureCollection,
    GeoJSONFeature,
    GeoJSONBBox,
    FeatureProvider,
    Layer,
    CustomLayer,
    Color,
    TerrainTileLayer
} from '@here/xyz-maps-core';
import {FlightAnimator} from './animation/FlightAnimator';
import Copyright from './ui/copyright/Copyright';
import Logo from './ui/Logo';
import {fillMap} from './displays/styleTools';
import {GLRender} from './displays/webgl/GLRender';
import {CameraTerrainController} from './CameraTerrainController';


const project = webMercator;
// const alt2z = webMercator.alt2z;
const earthCircumference = webMercator.earthCircumference;

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
const MAX_ALLOWED_PITCH = 85;

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

    static fillZoomMap = fillMap;

    id: number;

    private readonly _el: HTMLElement;
    private readonly _l: Listener;
    private _w: number; // map width in pixel
    private _h: number; // map height in pixel
    private _cx: number; // center screen in pixel
    private _cy: number; // center screen in pixel

    _s: number = 1; // current scale

    private _display: BasicDisplay;
    private _mvListener: MapViewListener;
    private _rz: number = 0; // rotation z in rad
    private _rx: number = 0; // rotation x in rad
    private _z: number; // zoom level
    private _tlwx: number;
    private _tlwy: number;
    private _groundResolution: number; // meter per pixel at zoom

    private _maxZoomExtent: number;
    private _repeatWorldViewX: boolean;

    _worldSizeFixed: number; // world size in pixel for fixed zoom
    _worldSize: number; // world size in pixel for smooth/intermediate zoom

    private _vp: GeoRect; // viewport/viewbounds
    private ui: UI;
    private readonly _cfg: MapOptions;// mapconfig
    private _evDispatcher: EventDispatcher;
    private _b: Behavior;
    // fixed center world in pixel. eg: zoom 12.4 -> 2^12 * tilesize
    private _cWorldFixed: PixelPoint = new PixelPoint(0, 0);

    // center world in pixel including intermediate zoomlevels. eg: zoom 12.4 -> 2^12.4 * tilesize
    private get _cWorld(): PixelPoint {
        const fixedToSmoothZoomScale = this._worldSize / this._worldSizeFixed;
        return new PixelPoint(
            this._cWorldFixed.x * fixedToSmoothZoomScale,
            this._cWorldFixed.y * fixedToSmoothZoomScale
        );
    };

    private _c: GeoPoint = new GeoPoint(0, 0); // center geo
    private _pc: GeoPoint = new GeoPoint(0, 0); // previous center geo

    // TODO: remove screenOffset
    private _ox = 0; // screenOffsetY
    private _oy = 0; // screenOffsetX

    // TODO: remove
    _layers: (TileLayer | CustomLayer)[];
    private readonly _vplock: any; // current viewport lock state
    private _zoomAnimator: ZoomAnimator;
    private _flightAnimator: FlightAnimator;
    private _search: Search;

    private _terrainLayer?: TerrainTileLayer;
    // controls the camera to stay above terrain
    private _camController: CameraTerrainController;

    private _onTerrainReadyListener: (ev: MapEvent | CustomEvent<any>) => void;

    /**
     * @param mapElement - HTMLElement used to create the map display
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
    constructor(mapElement: HTMLElement, options: MapOptions) {
        this._cfg = options = JSUtils.extend(true,
            JSUtils.extend(true, {}, defaultOptions),
            options || {}
        );

        const tigerMap = this;
        tigerMap.id = Math.random() * 1e6 ^ 0;

        const mapContainer = document.createElement('div');
        mapContainer.className = '_' + JSUtils.String.random(11);
        mapContainer.style['-webkit-tap-highlight-color'] = 'rgba(0,0,0,0)';
        mapContainer.style.position = 'relative';

        mapElement.appendChild(mapContainer);

        this._el = mapContainer;
        // mapsize is same as displaysize by default
        this.resize();
        console.log('TM', this._w, 'x', this._h);

        // init defaults
        const zoomLevel = options['zoomLevel'] || options['zoomlevel'];

        options.maxLevel = Math.min(MAX_ALLOWED_ZOOM, options.maxLevel);
        options.maxPitch = Math.min(MAX_ALLOWED_PITCH, options.maxPitch);

        this._z = Math.min(MAX_GRID_ZOOM, zoomLevel) ^ 0;

        this._worldSizeFixed = Math.pow(2, this._z) * TILESIZE;
        this._worldSize = Math.pow(2, zoomLevel) * TILESIZE;

        this._l = new Listener([
            'center',
            'rotation',
            'zoomlevel',
            'pitch',

            'mapviewchangestart',
            'mapviewchange',
            'mapviewchangeend',

            'resize',

            ON_LAYER_ADD_EVENT,
            ON_LAYER_REMOVE_EVENT
        ]);

        let listeners = this._l;
        let layers = [];
        tigerMap._layers = layers;

        const Display = options['renderer'] == 'canvas' ? CanvasDisplay : WebglDisplay;

        if (typeof Display.zoomBehavior == 'string') {
            DEFAULT_ZOOM_BEHAVIOR = Display.zoomBehavior;
        }

        // var display = new Display( tigerMap, mapEl );
        const display = new Display(
            mapContainer,
            RENDER_TILE_SIZE,
            options['devicePixelRatio'],
            options['renderOptions'] || {}
        );

        tigerMap._mvListener = new MapViewListener(tigerMap,
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

        this._camController = new CameraTerrainController(tigerMap);

        this.setBackgroundColor(options.backgroundColor);

        this._search = new Search(tigerMap, display.layers, display.dpr);

        const pointerEvents = this._evDispatcher = new EventDispatcher(mapContainer, tigerMap, layers, options);

        listeners.add('mapviewchangestart', (e) => pointerEvents.disable('pointerenter'));
        listeners.add('mapviewchangeend', (e) => pointerEvents.enable('pointerenter'));
        listeners.add('mapviewchangeend', (e) => display.viewChangeDone());


        this._zoomAnimator = new ZoomAnimator(tigerMap);

        this._flightAnimator = new FlightAnimator(tigerMap);

        const behaviorOptions = {...options['behavior'], ...options['behaviour']};

        if (behaviorOptions[BEHAVIOR_ZOOM] == UNDEF) {
            behaviorOptions[BEHAVIOR_ZOOM] = DEFAULT_ZOOM_BEHAVIOR;
        }

        let behavior = this._b = new Behavior(
            mapContainer,
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

        this.ui = new UI(mapContainer, options, tigerMap);

        tigerMap.setCenter(options['center']);
        tigerMap.pitch(options['pitch']);
        tigerMap.rotate(options['rotate']);

        tigerMap.setZoomlevel(zoomLevel);

        tigerMap._layerChangeListener = tigerMap._layerChangeListener.bind(tigerMap);

        // Ensure the camera stays above the terrain after terrain data has finished loading
        tigerMap._onTerrainReadyListener = (ev) => {
            this._camController.ensureAboveTerrain();
        };

        for (let layer of (options['layers'] || [])) {
            tigerMap.addLayer(layer);
        }

        instances.push(this);

        if (options.debug) {
            this.debug(options.debug);
        }
    }

    private _layerChangeListener(ev: MapEvent | CustomEvent<any>) {
        // refresh render-data if layer is cleared
        this.refresh(ev.type === 'clear' ?? ev.detail.layer);
    }

    private initViewPort(): [number, number] {
        const currentScale = this._s;
        // const currentScale = 1;
        const worldSizePixel = this._worldSizeFixed;
        const centerWorldPixelX = this._cWorldFixed.x;
        const centerWorldPixelY = this._cWorldFixed.y;

        const cOffsetX = this._w / 2;
        const cOffsetY = this._h / 2;

        const topLeftWorldX = centerWorldPixelX - cOffsetX / currentScale;
        const topLeftWorldY = centerWorldPixelY - cOffsetY / currentScale;

        // this._tlwx = topLeftWorldX;
        // this._tlwy = topLeftWorldY;
        // this._ox = centerWorldPixelX - cOffsetX - topLeftWorldX;
        // this._oy = centerWorldPixelY - cOffsetY - topLeftWorldY;
        this._tlwx = centerWorldPixelX - cOffsetX;
        this._tlwy = centerWorldPixelY - cOffsetY;
        this._ox = centerWorldPixelX - cOffsetX / currentScale - topLeftWorldX;
        this._oy = centerWorldPixelY - cOffsetY / currentScale - topLeftWorldY;

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

        this._mvListener.watch(true);

        this._groundResolution = earthCircumference(centerGeo.latitude) / this._worldSizeFixed;

        display.setView(this.initViewPort(), this._s, this._rz, this._rx, this._groundResolution, this._worldSize);

        const zoomlevel = this.getZoomlevel();

        for (let layer of this._layers) {
            layer._initZoom(zoomlevel);
        }

        display.updateGrid(this._z, zoomlevel, this._ox, this._oy);

        // display.setTransform(this._s, this._rz, this._rx, this._groundResolution);
        // display.updateGrid(this.initViewPort(), this.getZoomlevel(), this._ox, this._oy);
        // display.updateGrid(this.initViewPort(), this._z, this._ox, this._oy);

        if (prevCenterGeo[LON] != centerGeo[LON] || prevCenterGeo[LAT] != centerGeo[LAT]) {
            this._l.trigger('center', ['center', centerGeo, prevCenterGeo], true);
            this._pc = centerGeo;
        }
        this._camController.ensureAboveTerrain();
    }


    /**
     * Returns the terrain height at the specified world coordinates.
     * Used for camera terrain collision detection.
     * Uses heightmaps for faster lookup.
     * TODO: Need to implement fallback to (simplified) terrain mesh if no heightmap is available.
     *
     * @internal
     * @hidden
     *
     * @param worldX - The x coordinate in world space.
     * @param worldY - The y coordinate in world space.
     * @returns The terrain height at the given world coordinates, or undefined if not available.
     */
    _getTerrainAtWorldXY(worldX: number, worldY: number) {
        return this._display.getTerrainHeightAtWorldXY(worldX, worldY, this._terrainLayer);
    }

    private _clipLatitude(latitude: number) {
        return Math.min(MAX_LATITUDE, Math.max(MIN_LATITUDE, latitude));
    }

    private _setCenter(lon, lat) {
        const worldSizeFixed = this._worldSizeFixed;
        const worldSize = this._worldSize;

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

        lat = this._clipLatitude(lat);

        if (!this._repeatWorldViewX) {
            const lonPerPixel = 360 / worldSize;
            const halfWidthDeg = lonPerPixel * this._w * .5;
            const minLon = lon - halfWidthDeg;
            const maxLon = lon + halfWidthDeg;
            if (minLon < -180) {
                lon -= minLon % 180;
            }
            if (maxLon > 180) {
                lon -= maxLon % 180;
            }
        }

        this._cWorldFixed = new PixelPoint(
            project.lon2x(lon, worldSizeFixed),
            project.lat2y(lat, worldSizeFixed)
        );

        if (this._maxZoomExtent) {
            const latPerPixel = worldSize / this._h - 1;
            const halfHeightDeg = latPerPixel * this._h * .5;
            const fixedToSmoothZoomScale = worldSize / worldSizeFixed;
            const y = this._cWorldFixed.y * fixedToSmoothZoomScale;
            const halfWorldSize = worldSize / 2;
            let adjustY = 0;

            const maxY = y + halfHeightDeg;
            if (maxY < halfWorldSize) {
                adjustY = maxY;
            }
            const minY = y - halfHeightDeg;
            if (minY > halfWorldSize) {
                adjustY = minY;
            }

            if (adjustY) {
                this._cWorldFixed.y += (halfWorldSize - adjustY) / fixedToSmoothZoomScale;
                lat = project.y2lat(this._cWorldFixed.y, worldSizeFixed);
            }
        }

        this._c = new GeoPoint(lon, lat);

        return true;
    }

    private calculateMaxZoomExtent(): number {
        // return this._cfg.singleWorldView ? Math.log2(this._h / TILESIZE) : 0;
        return Math.max(
            Math.log2(this._h / TILESIZE),
            Math.log2(this._w / TILESIZE)
        );
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
            pitch = Math.max(0, Math.min(maxPitch, Math.round(pitch % 360 * 10) / 10));
            const rad = pitch * Math.PI / 180;
            const rotX = this._rx;

            if (rotX != rad) {
                this._rx = rad;
                this.updateGrid();
                this._l.trigger('pitch', ['pitch', pitch, rotX * 180 / Math.PI], true);
            }
        }
        return this._rx * 180 / Math.PI;
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
            const deg = Math.round(10 * rotation || 0) / 10;
            const rad = deg * Math.PI / 180;
            const rotZRad = this._rz;

            if (rad !== rotZRad) {
                const rcx = this._cx;
                const rcy = this._cy;
                const uRotCenter = this._display.unproject(rcx, rcy);
                const centerWorldPixel = this._cWorldFixed;

                centerWorldPixel.x += uRotCenter[0] - rcx;
                centerWorldPixel.y += uRotCenter[1] - rcy;

                this._rz = rad;

                this.updateGrid();

                this._l.trigger('rotation',
                    ['rotation', deg, rotZRad / Math.PI * 180],
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
    setBackgroundColor(color: Color) {
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
     * @param animate - animate using a bow animation @see {@link Map.flyTo}. true to enable, false to disable.
     */
    setViewBounds(
        bounds: GeoRect | [number, number, number, number] | GeoJSONFeature | GeoJSONFeature[] | GeoJSONFeatureCollection,
        animate?: boolean
    );
    /**
     * Set view bounds for the map to display.
     *
     * @param bounds - GeoRect, GeoJson Feature or an GeoJson bbox [minLon, minLat, maxLon, maxLat] defining the view bounds.
     * @param animationOptions - options to configure the bow animation @see {@link Map.flyTo}.
     */
    setViewBounds(
        bounds: GeoRect | [number, number, number, number] | GeoJSONFeature | GeoJSONFeature[] | GeoJSONFeatureCollection,
        animationOptions?: {
            /**
             * the duration of the bow animation in milliseconds
             */
            duration?: number
        }
    );

    setViewBounds(
        bounds: GeoRect | [number, number, number, number] | GeoJSONFeature | GeoJSONFeature[] | GeoJSONFeatureCollection,
        animate?: { duration?: number } | boolean
    ) {
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

        const zoom = calcZoomLevelForBounds(minLon, minLat, maxLon, maxLat, this.getWidth(), this.getHeight());
        const center = new GeoPoint(
            minLon + (maxLon - minLon) / 2,
            minLat + (maxLat - minLat) / 2
        );

        if (!animate) {
            this.setZoomlevel(zoom);
            this.setCenter(center);
        } else {
            this.flyTo(center, zoom, animate === true ? {} : animate);
        }
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
    }): {
        feature: Feature,
        layer: TileLayer,
        /**
         * @hidden
         * @internal
         */
        intersectionPoint?
    } | undefined {
        options = options || {};
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
         * @hidden
         * @internal
         */
        skip3d?: boolean
    }): {
        features: Feature[],
        layer: TileLayer,
        /**
         * @hidden
         * @internal
         */
        intersectionPoint?
    }[] {
        let skip3d = false;
        let x1;
        let x2;
        let y1;
        let y2;

        options = options || {};

        let {layers} = options;
        if (layers && !Array.isArray(layers)) {
            layers = [layers];
        }

        // it's a point
        if ((<PixelPoint>position).x != UNDEF && (<PixelPoint>position).y != UNDEF) {
            let x = (<PixelPoint>position).x;
            let y = (<PixelPoint>position).y;
            let w = options.width ^ 0;
            let h = options.height || w;

            if (!w && !h) {
                // "pixel search"
                skip3d = true;
                const featureInfo = this._display.getRenderedFeatureAt(x, y, <TileLayer[]>layers);

                if (featureInfo.id != null) {
                    const {layer} = featureInfo;
                    const provider = layer.getProvider(this.getZoomlevel() ^ 0) as FeatureProvider;
                    const feature = provider?.search?.(featureInfo.id);

                    if (feature) {
                        const {pointWorld} = featureInfo;
                        let intersectionPoint = null;
                        if (pointWorld) {
                            const iPnt = this._w2g(
                                pointWorld[0],
                                pointWorld[1],
                                // convert from unscaled-world- to scaled-world coordinates
                                // pointWorld[0] + this._ox,
                                // pointWorld[1] + this._oy,
                                pointWorld[2]
                            );
                            intersectionPoint = new GeoPoint(iPnt[0], iPnt[1], iPnt[2]);
                        }

                        return [{
                            layer,
                            features: [feature],
                            intersectionPoint
                        }];
                    }
                }
            }

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
            <TileLayer[]>layers,
            skip3d
        );
    };

    /**
     * Take a snapshot of the current map's viewport.
     *
     * @param callback - Callback function that will be called when the requested snapshot has been captured.
     * @param dx - x coordinate of the left edge of the capturing rectangle in pixel
     * @param dy - y coordinate of the top edge of the capturing rectangle in pixel
     * @param width - width of the capturing rectangle in pixel
     * @param height - height of the capturing rectangle in pixel
     *
     */
    snapshot(
        callback: (
            /**
             * A HTMLCanvasElement containing the requested screenshot.
             */
            screenshot: HTMLCanvasElement
        ) => void,
        dx?: number,
        dy?: number,
        width?: number,
        height?: number
    ) {
        if (!callback) return;

        dx ||= 0;
        dy ||= 0;

        width ||= this._w;
        height ||= this._h;

        if (width + dx > this._w) {
            width = this._w - dx;
        }
        if (height + dy > this._h) {
            height = this._h - dy;
        }

        const display = this._display;
        const {dpr} = display;
        const canvas = display.copyCanvas2d(dx, dy, width, height);
        const fontHeightPx = 11;
        const buf = Math.ceil(fontHeightPx / 3);
        const copyright = <Copyright> this.ui.get('Copyright');
        const srcLabels = copyright.getSourceLabelsString();
        const colors = copyright.getColors();
        const srcWidth = copyright.calcWidth();

        (async () => {
            const logo = await (<Logo> this.ui.get('Logo')).getImage();
            const ctx = canvas.getContext('2d');
            ctx.scale(dpr, dpr);
            ctx.font = `${fontHeightPx}px sans-serif`;
            ctx.textBaseline = 'hanging';
            ctx.fillStyle = colors.backgroundColor;
            ctx.fillRect(width - srcWidth - 2 * buf, height - fontHeightPx - buf, width + 2 * buf, fontHeightPx + buf);
            ctx.fillStyle = colors.color;
            ctx.fillText(srcLabels, width - srcWidth - buf, height - fontHeightPx);
            ctx.drawImage(logo.img, 2 * buf, height - logo.height - 2 * buf);
            // support for high-dpi devices
            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;

            callback(canvas);
        })();
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
        zoomTo = Math.max(Math.min(zoomTo, vplock.maxLevel), vplock.minLevel, this._maxZoomExtent);

        if (arguments.length == 2) {
            animate = fixedX;
            fixedX = UNDEF;
        }
        if (fixedX == UNDEF || fixedY == UNDEF) {
            fixedX = this._cx;
            fixedY = this._cy;
        }

        if (zoomLevel != zoomTo || currentScale != 1) {
            this._worldSize = Math.pow(2, zoomTo) * TILESIZE;

            if (animate) {
                this._zoomAnimator.start(zoomTo, fixedX, fixedY,
                    typeof animate === 'number'
                        ? animate
                        : DEFAULT_ZOOM_ANIMATION_MS
                );
            } else {
                const startZoom = this.getZoomlevel();
                const _uFixed = this._display.unproject(fixedX, fixedY);
                const gridZoom = Math.min(MAX_GRID_ZOOM, zoomTo) ^ 0;
                const deltaFixedZoom = zoomLevel - gridZoom;
                const worldSizePixel = this._worldSizeFixed;
                const scale = Math.pow(2, zoomTo - gridZoom);

                if (deltaFixedZoom) {
                    this._z = Math.min(MAX_GRID_ZOOM, zoomTo) ^ 0;
                    this._worldSizeFixed = Math.pow(2, this._z) * TILESIZE;
                }

                this._display.setView(this.initViewPort(), scale * Math.pow(.5, deltaFixedZoom), this._rz, this._rx, this._groundResolution, this._worldSize);
                // this._display.setTransform(scale * Math.pow(.5, deltaFixedZoom), this._rz, this._rx, this._worldSizeFixed);

                const uFixed = this._display.unproject(fixedX, fixedY);

                this._setCenter(
                    project.x2lon(this._cWorldFixed.x + _uFixed[0] - uFixed[0], worldSizePixel),
                    project.y2lat(this._cWorldFixed.y + _uFixed[1] - uFixed[1], worldSizePixel)
                );

                this._s = scale;
                this.updateGrid();

                this._l.trigger('zoomlevel', ['zoomlevel', this.getZoomlevel(), startZoom], true);
            }
        }
    };

    /**
     * Adjusts the map zoom level so that the camera altitude matches the target altitude.
     * Moves the camera straight up or down — elevator style — while keeping the ground point
     * directly beneath the camera fixed in the same screen position.
     *
     * Unlike a plain {@link Map.setZoomlevel | setZoomlevel()}, which zooms towards a specified anchor point (default: map center),
     * this method ensures the zoom is anchored to the point directly under the camera.
     *
     * Pitch and bearing remain unchanged, so the map center (lookAt) will shift as altitude changes.
     *
     * @param targetAltitude - The desired camera altitude in meters.
     * @param {number} [duration=0] - Optional zoom animation duration in milliseconds.
     */
    setAltitude(targetAltitude: number, duration: number = 0) {
        const camPosition = this.getCamera().position;
        const zoom = this._altToZoom(targetAltitude);
        const camGroundScreen = this.geoToPixel(camPosition.longitude, camPosition.latitude, 0);
        this.setZoomlevel(zoom, camGroundScreen.x, camGroundScreen.y, duration);
    }

    /**
     * helper function
     * @hidden
     * @internal
     */
    _altToZoom(altitude: number): number {
        const currentZoom = this.getZoomlevel();
        const camPosition = this.getCamera().position;
        return currentZoom + Math.log2(camPosition.altitude / altitude);
    }

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
     * Set the map center using a bow animation combining pan and zoom operations.
     *
     * @param center - the geographical coordinate to center the map.
     * @param options - options to configure the bow animation
     */
    flyTo(center: GeoPoint, options?: {
        /**
         * the duration of the bow animation in milliseconds
         */
        duration?: number
    });
    /**
     * Set the map center and zoomlevel using a bow animation combining pan and zoom operations.
     *
     * @param center -  the geographical coordinate to center the map.
     * @param zoomTo - the zoomlevel the map should be zoomed to.
     * @param options - options to configure the bow animation
     */
    flyTo(center: GeoPoint, zoomTo: number, options?: {
        /**
         * the duration of the bow animation in milliseconds
         */
        duration?: number
    });

    flyTo(center: GeoPoint, zoomTo?: number | { duration?: number }, options?: { duration?: number }) {
        if (!zoomTo || typeof zoomTo == 'object') {
            options = <{ duration?: number }>zoomTo;
            zoomTo = this.getZoomlevel();
        }
        this._flightAnimator.stop();
        this._flightAnimator.start(center, zoomTo, options?.duration);
    }

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
            const worldSizePixel = this._worldSizeFixed;
            const cx = this._cx;
            const cy = this._cy;
            const centerWorldPixel = this._cWorldFixed;
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

    getLayers(index?: number): TileLayer | CustomLayer | (TileLayer | CustomLayer)[] {
        const layers = this._layers;
        if (index != UNDEF) {
            return layers[index];
        }
        return layers.slice();
    };


    /**
     * Adds a layer to the map.
     *
     * If an `index` is provided, the layer will be inserted at the specified position within the layer hierarchy,
     * which allows placing the layer between existing layers. If the `index` is not specified, the layer will be
     * added on top of all existing layers (i.e., as the last layer in the hierarchy).
     *
     * The `index` is zero-based, meaning an index of `0` will insert the layer at the bottom, and an index equal
     * to the current number of layers will place it on top. If the specified `index` exceeds the current number
     * of layers, the layer will be added on top.
     *
     * @param layer - The layer to be added to the map. This can be a `TileLayer` or a `CustomLayer`.
     * @param index - (Optional) The zero-based index in the layer hierarchy where the layer should be inserted.
     *                If omitted, the layer will be added as the topmost layer.
     */
    addLayer(layer: TileLayer | CustomLayer, index?: number) {
        const layers = this._layers;
        // make sure layer isn't active already
        if (layers.indexOf(layer) == -1) {
            if (index == UNDEF) {
                index = layers.length;
            }

            if (layer instanceof TerrainTileLayer) {
                if (this._terrainLayer) {
                    throw new Error('Only one TerrainTileLayer instance can be added to the MapDisplay. Please ensure you add a single terrain layer to avoid conflicts.');
                }
                this._terrainLayer = layer;

                layer.addEventListener('viewportReady', this._onTerrainReadyListener);
            }

            this._display.addLayer(layer, index, (layer as TileLayer).getStyleManager?.());
            // if layer get's cleared -> refresh/re-fetch data
            // layer.addEventListener('clear', (ev)=>this.refresh(ev.detail.layer));
            layer.addEventListener('clear', this._layerChangeListener);
            layer.addEventListener('layerVisibilityChange', this._layerChangeListener);


            const eventDetail = {
                index: index,
                layer: layer,
                map: this,
                context: this._display.getContext(),
                canvas: this._display.canvas
            };

            layer.dispatchEvent('layerAdd', eventDetail);

            this._l.trigger(ON_LAYER_ADD_EVENT, [new MapEvent(ON_LAYER_ADD_EVENT, eventDetail)]);

            layers.splice(index, 0, layer);
            this.updateGrid();
        }
    };


    /**
     * Remove a layer from the map.
     *
     * @param layer - the layer to remove
     */
    removeLayer(layer: TileLayer | CustomLayer) {
        const layers = this._layers;
        const index = layers.indexOf(layer);

        if (index >= 0) {
            if (layer instanceof TerrainTileLayer) {
                this._terrainLayer = null;
                layer.removeEventListener('viewportReady', this._onTerrainReadyListener);
            }
            this._display.removeLayer(layer);
            // layer.removeEventListener('clear', (ev)=>this.refresh(ev.detail.layer));
            layer.removeEventListener('clear', this._layerChangeListener);
            layer.removeEventListener('layerVisibilityChange', this._layerChangeListener);

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
    refresh(layers?: TileLayer | Layer | (TileLayer | Layer)[]) {
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
        if (arguments.length == 1) {
            y = (<PixelPoint>x).y;
            x = (<PixelPoint>x).x;
        }

        const p = this._unprj(<number>x, y);
        const [lon, lat] = this._w2g(p);

        return new GeoPoint(lon, lat);
    };

    /**
     * Converts from screenspace coordinates to worldspace coordinates (webmercator).
     * @param screen - coordinate in screenspace [x,y,z]
     *
     * @internal
     * @hidden
     */
    _unprj(p: number[]): number[];
    _unprj(x: number, y: number, z?: number): number[];
    _unprj(x: number | number[], y?: number, z?: number): number[] {
        if (Array.isArray(x)) {
            [x, y, z] = x;
        }
        const screenOffsetX = this._ox;
        const screenOffsetY = this._oy;
        const p = this._display.unproject(x, y, z);
        // compensate map scale
        p[0] += screenOffsetX;
        p[1] += screenOffsetY;

        return p;
    }

    /**
     * worldPixel to geographical world coordinates
     * @param p - untransformed world coordinate in pixel relative to screen
     *
     * @internal
     * @hidden
     */
    _w2g(p: number[]): number[];
    _w2g(x: number, y: number, z?: number): number[];
    _w2g(x: number | number[], y?: number, z?: number): number[] {
        if (Array.isArray(x)) {
            z = x[2];
            y = x[1];
            x = x[0];
        }

        const worldSizePixel = this._worldSizeFixed;
        const topLeftWorldX = this._tlwx;
        const topLeftWorldY = this._tlwy;
        let worldX = x + topLeftWorldX;
        let worldY = y + topLeftWorldY;

        worldX %= worldSizePixel;
        worldY %= worldSizePixel;

        if (worldY < 0) {
            worldY += worldSizePixel;
        }

        return [
            project.x2lon(worldX, worldSizePixel),
            project.y2lat(worldY, worldSizePixel),
            z
        ];
    }

    /**
     * Convert a geographical coordinate to a pixel coordinate relative to the current viewport of the map.
     *
     * @param longitude - the longitude in degrees
     * @param latitude - the latitude in degrees
     * @param altitude - the altitude in meters
     *
     * @returns the pixel coordinate relative to the current viewport.
     */
    geoToPixel(longitude: number, latitude: number, altitude?: number): PixelPoint;
    /**
     * Convert a geographical coordinate to a pixel coordinate relative to the current viewport of the map.
     *
     * @param coordinate - the geographical coordinate
     *
     * @returns the pixel coordinate relative to the current viewport.
     */
    geoToPixel(coordinate: GeoPoint): PixelPoint;

    geoToPixel(lon: number | GeoPoint, lat?: number, alt?: number): PixelPoint {
        if (lat == UNDEF) {
            alt = (<GeoPoint>lon).altitude;
            lat = (<GeoPoint>lon).latitude;
            lon = (<GeoPoint>lon).longitude;
        }

        let [x, y] = this._g2w(<number>lon, lat);

        [x, y] = this._prj([x, y, alt || 0]);

        return new PixelPoint(x, y);
    };

    /**
     * converts from geographical coordinate (wgs84) to projected world coordinates (webmercator)
     *
     * @internal
     * @hidden
     */
    _g2w(lon: number | number[], lat?: number, alt?: number): [number, number, number] {
        if (Array.isArray(lon)) {
            [lon, lat, alt] = lon;
        }

        lat = this._clipLatitude(lat);

        const worldSizePixel = this._worldSizeFixed;
        const topLeftWorldX = this._tlwx;
        const topLeftWorldY = this._tlwy;
        // const topLeftWorldX = this._tlwx + this._ox;
        // const topLeftWorldY = this._tlwy + this._oy;
        return [
            project.lon2x(<number>lon, worldSizePixel) - topLeftWorldX,
            project.lat2y(<number>lat, worldSizePixel) - topLeftWorldY,
            alt || 0
        ];
    }

    /**
     * Converts from pixel coordinates in worldspace (webmercator) to pixels in screenspace.
     * @param geo - coordinate in worldspace [lon,lat,alt]
     * @param worldPixel - indicates if coordinate should be returned in worldpixel (relative to screen) or screenpixel.
     *
     * @internal
     * @hidden
     */
    _prj(world: number[]): number[] {
        return this._display.project(world[0], world[1], world[2]);
    }

    /**
     * Get the camera of the current viewport.
     *
     * @experimental
     */
    getCamera(): {
        /**
         * The camera's center position in geographical coordinates (world-space).
         */
        position: { longitude: number, latitude: number, altitude: number }
        } {
        const cameraWorld = (this._display.render as GLRender).cameraWorld;
        const [longitude, latitude, altitude] = this._w2g(cameraWorld[0], cameraWorld[1], cameraWorld[2]);
        // const [longitude, latitude, altitude] = this._w2g(map._unprj(map._cx, map._cy, -1));
        return {
            position: {longitude, latitude, altitude}
        };
    }

    /**
     * Translates a geographical coordinate (wgs84) along the x-, y- and z-axis in pixels.
     *
     * @internal
     * @hidden
     */
    _translateGeoCoord(coordinate: number[], dx: number, dy: number, dz: number): number[] {
        const map = this;
        const zPixelToMeter = map._groundResolution / map._s;
        // const zPixelToMeter = 1 / map._display.render.zMeterToPixel / map._display.render.scale;
        let [longitude, latitude, altitude] = coordinate;

        altitude += dz * zPixelToMeter;

        if (dx || dy) {
            const [x, y, z] = map._g2w(longitude, latitude, altitude);
            [longitude, latitude, altitude] = map._w2g([x + dx, y + dy, z]);
        }

        return [longitude, latitude, altitude];
    }

    /**
     * Apply scaling of xy axis if required by "scaleByAltitude" styling.
     *
     * @internal
     * @hidden
     */
    _scaleOffsetXYByAltitude(pointWorld: number[], scaleByAltitude: boolean) {
        const map = this;
        const scale = scaleByAltitude ? 1 : map._display.scaleOffsetXYByAltitude(pointWorld);
        return scale / map._s;
    }

    /**
     * Destroy the the map.
     */
    destroy() {
        const mapEl = this._el;
        this.ui.destroy();

        this._layers.forEach((layer) => this.removeLayer(layer));

        this._display.destroy();

        mapEl.parentNode.removeChild(mapEl);

        this._mvListener.watch(false);

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

            this._w = width;
            this._h = height;

            this._cx = width / 2;
            this._cy = height / 2;


            const {singleWorldView} = this._cfg;
            this._maxZoomExtent = singleWorldView ? this.calculateMaxZoomExtent() : 0;
            this._repeatWorldViewX = !singleWorldView || singleWorldView === 'latitude';

            // make sure map is fully initialised
            if (this._display) {
                this._display.setSize(width, height);
                // ensure `singleWorldView` is respected and prevent map repetition when resizing the map
                this.setZoomlevel(this.getZoomlevel());
                this.updateGrid();
                this._l.trigger('resize', [new MapEvent('resize', {width: width, height: height})]);
            }
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
     * Supported observers are: "zoomlevel", "center", "rotation" and "pitch".
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

    /**
     * Returns the 3D geographic coordinates (including elevation) of the terrain
     * at a given screen position.
     *
     * This method performs a raycast from the screen pixel into the scene and returns
     * the intersection point on the terrain surface, if available.
     *
     * It can be used to convert screen positions into real-world terrain positions,
     * including altitude based on the terrain elevation data.
     *
     * @param screen - The screen (pixel) coordinates `{x, y}` to query.
     *
     * @returns A `GeoPoint` object `{longitude, latitude, altitude}` representing
     *          the 3D position on the terrain, or `null` if the terrain data is not yet loaded
     *          or if the ray does not intersect any terrain surface.
     *
     * @example
     * const terrainPoint = map.getTerrainPointAt({x: 300, y: 200});
     * if (terrainPoint) {
     *     console.log(`Longitude: ${terrainPoint.longitude}`);
     *     console.log(`Latitude: ${terrainPoint.latitude}`);
     *     console.log(`Altitude: ${terrainPoint.altitude} m`);
     * }
     */
    getTerrainPointAt(screen: PixelPoint): GeoPoint | null {
        const terrainLayer = this._terrainLayer;
        // const terrainLayer = this._layers.find((layer) => layer instanceof TerrainTileLayer) || null;
        return (terrainLayer && this.getFeatureAt(screen, {layers: terrainLayer})?.intersectionPoint) || null;
    }
}
