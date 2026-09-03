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

import {global, Color as ColorUtils} from '@here/xyz-maps-common';
import {Tile, TileLayer, CustomLayer, RuntimeLayerStyle, Color, tile} from '@here/xyz-maps-core';
import {getElDimension, createCanvas} from '../DOMTools';
import {Layers, Layer} from './Layers';
import FeatureModifier from './FeatureModifier';
import BasicRender from './BasicRender';
import BasicTile from './BasicTile';
import BasicBucket from './BasicBucket';
import Preview from './Preview';
import Grid, {GridTile, ViewportTile} from '../Grid';
import {parseColor} from './styleTools';
import toRGB = ColorUtils.toRGB;

type RGBA = ColorUtils.RGBA;

const CREATE_IF_NOT_EXISTS = true;

function toggleLayerEventListener(toggle: string, layer: any, listeners: any) {
    toggle = toggle + 'EventListener';

    if (layer[toggle]) {
        for (var type in listeners) {
            layer[toggle](type, listeners[type]);
        }
    }
}

let UNDEF;

export type TerrainStats = {
    readonly min: number,
    readonly max: number,
    readonly avg: number,
    readonly available: boolean
};

type TerrainElevationSource = {
    readonly quadkey: string,
    readonly gridZ: number,
    readonly gridX: number,
    readonly gridY: number
};

export {ViewportTile};

export type DisplayTile = ViewportTile & {
    scale?: number,
    tile?: BasicTile
};

abstract class Display {
    private previewer: Preview;
    private ti: number; // tile index
    private renderFrameId: number = null;
    protected viewChange: boolean;
    protected sx: number; // grid/screen offset x (includes scale offset)
    protected sy: number; // grid/screen offset y (includes scale offset)
    protected dirty: boolean = false;

    centerWorld: number[]; // absolute world center xy
    zoom: number; // current zoomlevel
    protected tileGridZoom: number; // grid zoom level from last updateGrid() call

    protected globalBgc: RGBA | ((number) => RGBA);

    tileSize: number;
    layers: Layers;
    dpr: number;
    canvas: HTMLCanvasElement;
    w: number;
    h: number;
    s: number;
    rx: number;
    rz: number;
    render: BasicRender;
    buckets: BasicBucket;
    listeners: { [event: string]: (a1?, a2?) => void };
    tiles: DisplayTile[];
    protected grid: Grid;
    /**
     * Terrain altitude used as the camera's pitch/rotation pivot. Remains fixed during camera interactions and
     * is updated afterward with zoom and center compensation to prevent visual jumps.
     *
     * @internal
     * @hidden
     */
    terrainPivotAltitude: number = null;

    /**
     * Min/max terrain elevation from the previous frame's visible tiles.
     * Used for grid bounds, zFar calculation and fallback frustum culling.
     *
     * @internal
     * @hidden
     */
    visibleTerrainElevation: { min: number, max: number, hasStats: boolean } = {min: 0, max: 0, hasStats: false};

    private _pendingVisibleElevation: {
        min: number,
        max: number,
        source?: TerrainElevationSource
    } = {min: Infinity, max: 0};
    protected _emptyTerrainStats: TerrainStats = {
        min: 0,
        max: 0,
        avg: 0,
        available: false
    };

    getFOV(): number {
        return 0.6981317007977318; // 40 deg
    }

    constructor(mapEl: HTMLElement, tileSize: number, dpr: string | number, bucketPool, tileRenderer: BasicRender, previewLookAhead: number | [number, number]) {
        const display = this;
        const w = getElDimension(mapEl, 'width');
        const h = getElDimension(mapEl, 'height');

        const canvas = createCanvas(mapEl, w, h, 0);

        display.previewer = new Preview(display, previewLookAhead);
        display.grid = new Grid(tileSize);
        display.render = tileRenderer;
        // tileRenderer.mapContext = this.mapContext;
        display.tileSize = tileSize;
        display.buckets = bucketPool;
        display.layers = new Layers();
        display.w = w;
        display.h = h;
        display.canvas = canvas;
        canvas.className = 'tmc';
        display.dpr = Display.getPixelRatio(dpr);
        display.setSize(w, h);
        display.setBGColor();

        const featureModifier = new FeatureModifier(display, tileRenderer);

        display.listeners = {
            'clear': (ev) => {
                const {tiles, layer} = ev.detail;
                featureModifier.clear(layer, tiles);
            },

            'featuresAdd': (ev) => {
                const {features, tiles, layer} = ev.detail;
                if (tiles?.length) {
                    featureModifier.add(features, tiles, layer);
                }
            },

            'featuresRemove': (ev) => {
                const {features, tiles, layer} = ev.detail;
                if (tiles) {
                    featureModifier.remove(features, tiles, layer);
                }
            },

            'featureCoordinatesChange': (ev) => {
                const {feature, prevBBox, prevCoordinates, layer} = ev.detail;
                featureModifier.updateGeometry(feature, prevBBox, prevCoordinates, layer);
            },

            'styleGroupChange': (ev) => {
                const {feature, styleGroup, layer} = ev.detail;
                featureModifier.repaint(feature, styleGroup, layer);
            },

            'styleChange': (ev) => {
                const {layer, style} = ev.detail;
                // const index = display.layers.indexOf(layer);
                const displayLayer = display.layers.get(layer);
                const {index} = displayLayer;
                displayLayer.initStyle();
                displayLayer.setBackgroundColor((style as RuntimeLayerStyle).backgroundColor || display.globalBgc);
                display.buckets.tiles.forEach((t) => t.clear(index));
            }
        };
    }

    static getPixelRatio(dpr: string | number | any) {
        dpr = dpr == 'auto'
            ? Math.min(2, global.devicePixelRatio || 1)
            : dpr || 1;

        return dpr < 1 ? 1 : dpr;
    }

    addLayer(layer: TileLayer | CustomLayer, index: number, styles?: RuntimeLayerStyle): Layer {
        const display = this;
        const layers = display.layers;
        if (layers.add(layer, index)) {
            const dLayer = layers.get(layer);
            display.buckets.forEach((dTile) => {
                dTile.addLayer(index);
            });
            toggleLayerEventListener('add', layer, display.listeners);

            if (layer.custom) return dLayer;

            styles?.clearCache();

            // new function needs to be created per layer otherwise a setup with same provider used
            // accross multiple layers will lead in case of cancel to cancel all layers.
            dLayer.handleTile = (tile) => {
                // is tile still visible ?
                if (display.isVisible(tile, dLayer)) {
                    display.handleTile(tile, <TileLayer>layer);
                }
            };

            dLayer.setBackgroundColor(
                (layer as TileLayer).getRuntimeStyle().backgroundColor || display.globalBgc
            );
            return dLayer;
        }
    }

    removeLayer(layer: TileLayer | CustomLayer): number {
        const display = this;
        const layers = this.layers;
        const dLayer = layers.get(layer);
        const tiles = dLayer.tiles;
        const index = layers.indexOf(layer);

        if (index !== -1) {
            display.buckets.forEach((dTile) => {
                dTile.cancelTasks(<TileLayer>layer);
                dTile.removeLayer(index);
            });

            for (let screenTile of tiles) {
                const quadkey = screenTile.tile.quadkey;
                display.releaseTile(quadkey, dLayer);
                display.cancel(quadkey, <TileLayer>layer);
            }

            layers.remove(layer);

            toggleLayerEventListener('remove', layer, display.listeners);
        }
        return index;
    }

    getBucket(quadkey: string, createIfNotExists?: boolean): BasicTile {
        const display = this;
        let bucket;

        if (createIfNotExists) {
            bucket = display.buckets.create(quadkey, <any[]><unknown>display.layers);
        } else {
            bucket = display.buckets.get(quadkey);
        }
        return bucket;
    }

    handleTile(tile: Tile, layer: TileLayer, displayTile?: BasicTile, index?: number) {
        const display: Display = this;
        let dirty = false;
        let data;

        if (displayTile) {
            dirty = true;
        } else {
            displayTile = display.getBucket(tile.quadkey, CREATE_IF_NOT_EXISTS);
        }

        if (index == UNDEF) {
            index = display.layers.indexOf(layer);
        }

        if (tile.error) {
            display.layers[index].error = true;
        }

        // A tile without usable data is handled according to the layer policy.
        if (tile.dataUnavailable) {
            if (layer.dataUnavailableFallback === 'ancestor-preview') {
                displayTile.fallbackToAncestorPreview(index);
            } else {
                displayTile.markEmpty(index);
            }
            return;
        }

        // prepare tile data for rendering. process/prerender vector data
        if (!displayTile.ready(index) && !displayTile.busy(layer)) {
            if (data = tile.data) {
                const tileProcessed = (dTile: BasicTile, layer: TileLayer) => {
                    // in case of local data is getting added to a remote provider..
                    // before data is fetched from remote
                    // => we need to "wait" otherwise remote update is missed.
                    if (tile.isLoaded()) {
                        dTile.ready(dTile.index(layer), true);
                    }
                    display.update(dirty);
                };
                displayTile.ready(index, false);
                // @ts-ignore
                let layerRender = layer.render;
                // experimental
                if (layerRender) {
                    layerRender(tile, data, layer, displayTile, tileProcessed);
                } else {
                    display.prepareTile(tile, data, layer, displayTile, tileProcessed);
                }
            }
        }
    };

    protected abstract viewport();

    abstract prepareTile(tile: Tile, data, layer: TileLayer, dTile: BasicTile, onDone: (dTile: BasicTile, layer: TileLayer) => void);

    abstract unproject(x: number, y: number, z?: number): number[];


    abstract unproject(x: number, y: number, z?: number): number[];

    // Ray-plane intersection at a custom Z height. Override in WebGL Display.
    unprojectAtZ(x: number, y: number, targetZ: number): number[] {
        return this.unproject(x, y);
    }

    abstract project(x: number, y: number, z?: number): number[];

    /**
     * Check if a tile over a min/max terrain elevation range projects entirely outside the viewport.
     * Override in WebGL Display for actual 4-corner projection check.
     *
     * @internal
     * @hidden
     */
    isTileOutsideViewport(tileX: number, tileY: number, minZ: number, maxZ: number, tileSize: number): boolean {
        return false;
    }

    /**
     * Compute viewport bounds at a given terrain altitude.
     * Returns the 4 viewport corners projected onto the horizontal plane at z=terrainAltitude
     * (in grid-space coordinates). This gives the actual visible footprint at terrain height —
     * which is smaller than the sea-level bounds when terrain is elevated.
     *
     * @internal
     * @hidden
     */
    getTerrainViewportBounds(terrainAltitude: number): number[][] | undefined {
        return undefined;
    }

    /**
     * Sample the actual terrain height at the center of a given tile.
     * Returns exaggerated height in meters, or 0 if not available.
     *
     * @internal
     * @hidden
     */
    getTerrainHeight(zoom: number, x: number, y: number): TerrainStats {
        return this._emptyTerrainStats;
    }

    beginVisibleTerrainElevationCollection() {
        this._pendingVisibleElevation.min = Infinity;
        this._pendingVisibleElevation.max = 0;
        this._pendingVisibleElevation.source = undefined;
    }

    includeVisibleTerrainElevation(
        minElevation: number,
        maxElevation?: number,
        source?: TerrainElevationSource
    ) {
        if (Number.isFinite(minElevation) && minElevation < this._pendingVisibleElevation.min) {
            this._pendingVisibleElevation.min = minElevation;
            this._pendingVisibleElevation.source = source;
        }
        if (maxElevation != null && maxElevation > this._pendingVisibleElevation.max) {
            this._pendingVisibleElevation.max = maxElevation;
        }
    }

    commitVisibleTerrainElevationCollection(allowIncrease: boolean = true): boolean {
        const fallback = this.terrainPivotAltitude || 0;
        const hasStats = this._pendingVisibleElevation.min !== Infinity;
        let nextMin = hasStats ? this._pendingVisibleElevation.min : fallback;

        const debugMinVisibleTerrainElevation = (window as any)._minVisibleTerrainElevation;
        if (debugMinVisibleTerrainElevation != null) {
            nextMin = debugMinVisibleTerrainElevation;
        }

        const nextMax = this._pendingVisibleElevation.max > 0
            ? this._pendingVisibleElevation.max
            : fallback;

        const current = this.visibleTerrainElevation;
        const prevMin = current.min;
        const hadStats = current.hasStats;

        // Missing stats are not a newly observed low terrain value. Keep the last
        // conservative real value instead of replacing it with the pivot fallback;
        // otherwise a stats-less pass can trigger the same grid retry indefinitely.
        if (!hasStats) {
            if (!hadStats && prevMin === 0) {
                current.min = fallback;
                current.max = nextMax;
            }
            return false;
        }

        current.hasStats = true;
        current.max = nextMax;

        if (!hadStats && prevMin === 0) {
            current.min = nextMin;
            return Math.abs(nextMin - fallback) > 1e-3;
        }

        if (
            // Lower terrain becoming visible must apply immediately to avoid clipping.
            (nextMin < prevMin - 1e-3) ||
            // Raising the minimum is less urgent and is disabled for the corrective
            // retry, where it could otherwise recreate the same oscillation.
            (allowIncrease && nextMin > prevMin + 1)
        ) {
            current.min = nextMin;
            return true;
        }
        return false;
    }

    /**
     * Approximate perspective distance scale for a world position.
     * WebGL display overrides this with the actual view matrix calculation.
     *
     * @internal
     * @hidden
     */
    computeDistanceScale(x: number, y: number, z: number = 0): number {
        return 1;
    }

    toRGB(color: Color): RGBA {
        return toRGB(color);
    }

    private isVisible(tile: Tile, dLayer: Layer): boolean {
        const qk = tile.quadkey;
        for (let screen of dLayer.tiles) {
            if (screen.tile.quadkey == qk) {
                return true;
            }
        }
        return false;
    }


    getContext() {
        return this.render.getContext();
    }

    copyCanvas2d(dx: number = 0, dy: number = 0, w: number = this.w, h: number = this.h): HTMLCanvasElement {
        const {canvas, dpr} = this;
        dx *= dpr;
        dy *= dpr;
        w *= dpr;
        h *= dpr;
        const cpyCanvas = <HTMLCanvasElement>document.createElement('Canvas');
        cpyCanvas.width = w;
        cpyCanvas.height = h;
        this.viewport();
        cpyCanvas.getContext('2d').drawImage(canvas, dx, dy, w, h, 0, 0, w, h);
        return cpyCanvas;
    }


    getScreenTile(quadkey: string, layer?: Layer): DisplayTile {
        return this.tiles.find((tile) => tile.quadkey == quadkey);
    }

    // USED BY FEATUREMODIFIER
    updateTile(tile: Tile, dTile: BasicTile, layer: TileLayer, feature?) {
        if (!dTile) return;
        const pendingTask = dTile.busy(layer);
        if (pendingTask) {
            if (pendingTask.isInterrupted()) {
                pendingTask.outdated = true;
            }
        } else {
            const display = this;
            const index = dTile.index(layer);
            dTile.ready(index, false);
            // clear preview to enable preview creation for next render iteration
            // dTile.p[index] = false;
            display.layers[index].handleTile(tile);
        }
    }

    setSize(w: number, h: number) {
        const display = this;
        const {dpr, canvas} = display;

        display.w = w;
        display.h = h;

        canvas.width = w * dpr;
        canvas.height = h * dpr;
        canvas.style.width = w + 'px';
        canvas.style.height = h + 'px';
    }

    cancel(quadkey: string, layer?: TileLayer) {
        const dTile = this.buckets.get(quadkey, true/* SKIP TRACK */);
        if (dTile) {
            dTile.cancelTasks(layer);
        }
    }

    preview(displayTile: BasicTile, layer: TileLayer, index: number): any[][] {
        const previewData = this.previewer.create(displayTile, layer);
        displayTile.preview(index, previewData);
        return previewData;
    }

    protected useLODTiles() {
        return false;
    }

    private initVpTiles(gridTiles: GridTile[], zoomLevel: number, _gridTileSize?: number) {
        const display = this;
        const layers = this.layers;
        const prevVPTiles = display.tiles || [];
        const vpTiles = display.tiles = [];
        const center = {x: display.w / 2, y: display.h / 2};
        const pitchExceedsLODThreshold = this.useLODTiles();

        // Per-frame cache: layers with identical grid parameters reuse the same tile hierarchy.
        const gridTileCache: { [key: string]: DisplayTile[] } = {};

        for (let dLayer of layers) {
            dLayer.reset(zoomLevel);

            const layer = dLayer.layer as TileLayer;
            if (!layer.tiled) continue;

            let layerTileSize = layer.tileSize || 256;
            let gridTileSize = layerTileSize;
            let screenTiles = [];

            dLayer.tiles = screenTiles;

            if (layer.isVisible(zoomLevel)) {
                const maxZoomLevel = (layer as TileLayer).max || 20;
                let minZoomLevel = (layer as TileLayer).min || 1;

                // If the current tile zoom exceeds maxDataZoom, increase minTileSize
                // to stop subdivision at maxDataZoom level.
                const {maxDataZoom} = layer;
                const normalTileZoom = zoomLevel - (layer.levelOffset || 0);
                let effectiveMinTileSize = layerTileSize;

                if (normalTileZoom > maxDataZoom) {
                    effectiveMinTileSize = layerTileSize << (normalTileZoom - maxDataZoom);
                }

                // Adaptive LOD: use distance-based LOD when the layer supports it
                // (adaptiveGrid !== false). Activated in two cases:
                // 1. High pitch (> 60°) — normal overpitch LOD
                // 2. Large terrain height difference — prevents tile explosion when
                //    camera is high above distant low-elevation tiles (e.g. mountain summit)
                const terrainHeightRange = (display.terrainPivotAltitude || 0) - (display.visibleTerrainElevation.min || 0);
                const significantTerrainDrop = terrainHeightRange > 500;
                const useAdaptiveLOD = (layer as any).adaptiveGrid !== false && (pitchExceedsLODThreshold || significantTerrainDrop);

                // Numeric cache key — bit layout:
                // [22+] effectiveMinTileSize | [21] adaptiveLOD | [16..20] maxZoom | [11..15] minZoom | [0..10] gridTileSize
                const gridCacheKey = effectiveMinTileSize * 4194304 // 1<<22
                    + (useAdaptiveLOD ? 2097152 : 0) // 1<<21
                    + maxZoomLevel * 65536 // 1<<15
                    + minZoomLevel * 2048 // 1<<11
                    + gridTileSize;
                let tiles: DisplayTile[];
                if (gridTileCache[gridCacheKey]) {
                    tiles = gridTileCache[gridCacheKey];
                } else {
                    tiles = gridTiles.flatMap((_gridTile) => {
                        return _gridTile.generateVisibleLODTiles(display,
                            effectiveMinTileSize,
                            useAdaptiveLOD,
                            maxZoomLevel,
                            minZoomLevel,
                            [],
                            gridTileSize
                        ) as DisplayTile[];
                    });
                    gridTileCache[gridCacheKey] = tiles;
                }
                // Terrain: additionally generate an UNCAPPED display-zoom render-tile set.
                // dLayer.tiles above is capped at maxDataZoom (for DEM loading); the mesh
                // partitioning needs the full adaptive-LOD grid so each visible display
                // tile gets its own terrain mesh sampling the parent DEM via UV-transform.
                if (dLayer === this.layers.getTerrainLayer()) {
                    // Reset elevation collection — the data-tile leaves (z10) may have
                    // reported a coarse min covering area outside the viewport. Re-collect
                    // from the finer render-tiles which use sub-region heightmap sampling.
                    this.beginVisibleTerrainElevationCollection();
                    dLayer.terrainRenderTiles = gridTiles.flatMap((_gridTile) => {
                        return _gridTile.generateVisibleLODTiles(display,
                            layerTileSize,
                            useAdaptiveLOD,
                            maxZoomLevel,
                            minZoomLevel,
                            [],
                            layerTileSize
                        );
                    });
                }

                // load tiles in order of distance to the center of the screen
                tiles.sort((a, b) => Math.hypot(a.x - center.x, a.y - center.y) - Math.hypot(b.x - center.y, b.y - center.y));

                for (let gridTile of tiles) {
                    const {quadkey, worldTileSize} = gridTile;
                    const displayTile = display.getBucket(quadkey, CREATE_IF_NOT_EXISTS);
                    const tileZoomScale = worldTileSize / gridTileSize;

                    gridTile.scale = tileZoomScale;
                    gridTile.tile = displayTile;

                    screenTiles.push(gridTile);

                    if (!vpTiles.find((t) => t.quadkey == quadkey
                        // At the most zoomed-out level, tiles may repeat multiple times to fully cover the screen.
                        && t.x == gridTile.x && t.y == gridTile.y)
                    ) {
                        vpTiles.push(gridTile);
                        displayTile.i = ++this.ti;
                    }
                    display.initTile(displayTile, dLayer);
                    layer.getTile(quadkey, dLayer.handleTile);
                }

                this.freeStaleTilesLayer(screenTiles, prevVPTiles, dLayer);
            }
        }
    }

    private freeStaleTilesLayer(vpTiles: DisplayTile[], prevVPTiles: DisplayTile[], displayLayer: Layer) {
        // mark tiles to not be visible anymore
        for (const {quadkey, renderTileSize} of prevVPTiles) {
            let staled = true;
            for (const {quadkey: qk, renderTileSize: s} of vpTiles) {
                if (qk == quadkey && renderTileSize == s) {
                    staled = false;
                    break;
                }
            }
            if (staled) {
                const tileLayer = <TileLayer>displayLayer.layer;
                if ((tileLayer).tileSize == renderTileSize) {
                    this.releaseTile(quadkey, displayLayer);
                }
                this.cancel(quadkey, tileLayer);
            }
        }
    }

    protected getCamGroundPositionScreen() {
        return [this.w / 2, this.h / 2];
    }

    protected getHorizonYOffset() {
        return 0;
    }

    /**
     * Returns the distance from camera to the map center in world pixels.
     *
     * @internal
     * @hidden
     */
    getCameraToCenterDistance(): number {
        return 1000;
    }

    updateGrid(
        tileGridZoom: number,
        zoomLevel: number,
        screenOffsetX: number,
        screenOffsetY: number,
        isTerrainElevationRetry: boolean = false
    ) {
        const centerWorldPixel = this.centerWorld;

        this.setZoom(zoomLevel);

        this.viewChange = true;
        this.tileGridZoom = tileGridZoom;
        this.sx = screenOffsetX;
        this.sy = screenOffsetY;

        const display = this;
        const mapWidthPixel = this.w;
        const mapHeightPixel = this.h;
        const displayWidth = mapWidthPixel;

        // Be sure to also handle tiles that are not part of the actual viewport but whose data is still visible because of high altitude.
        const displayHeight = Math.max(mapHeightPixel, this.getCamGroundPositionScreen()[1]);

        // if map is pitched too much, we clip the grid at the top
        const maxGridPitchOffset = this.getHorizonYOffset();

        const representativeTerrainAltitude = display.terrainPivotAltitude || 0;
        const conservativeMinTerrainAltitude = this.visibleTerrainElevation.hasStats
            ? this.visibleTerrainElevation.min
            : representativeTerrainAltitude;

        // Use the lowest observed visible terrain as the grid plane. Until DEM stats
        // are available, fall back to the terrain pivot, then to sea level.
        let gridPlaneAltitude: number;
        if (this.visibleTerrainElevation.hasStats) {
            gridPlaneAltitude = conservativeMinTerrainAltitude;
        } else if (representativeTerrainAltitude > 0) {
            gridPlaneAltitude = representativeTerrainAltitude;
        } else {
            gridPlaneAltitude = 0;
        }

        const gridWorldPixel = [
            display.unprojectAtZ(0, maxGridPitchOffset, gridPlaneAltitude), // top-left: far → terrain surface
            display.unprojectAtZ(displayWidth - 1, maxGridPitchOffset, gridPlaneAltitude), // top-right: far → terrain surface
            display.unprojectAtZ(displayWidth - 1, displayHeight - 1, gridPlaneAltitude), // bottom-right: near → terrain
            display.unprojectAtZ(0, displayHeight - 1, gridPlaneAltitude) // bottom-left: near → terrain
        ];

        // Initialize the grid with the adjusted bounds
        this.grid.init(centerWorldPixel, mapWidthPixel, mapHeightPixel, gridWorldPixel);
        this.ti = 0;

        const zoomOutLookahead = 10; // this.getGridZoomOutLookahead(tileGridZoom, zoomLevel);
        const gridTiles = display.grid.getTiles(tileGridZoom, zoomOutLookahead);

        this.initVpTiles(gridTiles, tileGridZoom);
        const elevationChanged = this.commitVisibleTerrainElevationCollection(!isTerrainElevationRetry);
        if (elevationChanged && !isTerrainElevationRetry) {
            // Terrain elevation can change the grid footprint and reveal lower terrain.
            // Allow one corrective rebuild, but never recurse from the corrective pass.
            this.updateGrid(tileGridZoom, zoomLevel, this.sx, this.sy, true);
            return;
        }

        this.dirty = true;
        display.update();
    }

    releaseTile(quadkey: string, dLayer: Layer) {
        const tileLayer = <TileLayer>dLayer.layer;
        const tile = tileLayer.getCachedTile(quadkey);

        if (tile && tile.loadStartTs) {
            if (!tile.isLoaded()) {
                tileLayer.cancelTile(tile, dLayer.handleTile);
            }
        }
    }

    private initTile(displayTile: BasicTile, dLayer: Layer) {
        const index = dLayer.index;
        const display = this;

        if (dLayer.visible) {
            if (!displayTile.ready(index) && !displayTile.preview(index)) {
                display.preview(displayTile, dLayer.layer as TileLayer, index);
            }
        } else {
            // if layer is not visible displaytiles need to be marked as ready to stop renderloop.
            displayTile.ready(index, true);
        }
    }


    update(dirty?: boolean) {
        const display = this;

        display.dirty ||= dirty;

        if (display.renderFrameId === null) {
            display.renderFrameId = requestAnimationFrame(() => {
                display.renderFrameId = null;
                display.viewport();
            });
        }
    }

    setBGColor(color: Color = '#ffffff') {
        const displ = this;
        const {render} = displ;

        if (color == 'transparent') {
            color = 'rgba(0, 0, 0, 0)';
        }

        displ.globalBgc = parseColor(color);

        render.setBackgroundColor(displ.globalBgc);
    }

    showGrid(show: boolean | { [opt: string]: any }) {
        this.render.grid(show);
    }

    setView(
        centerWorld: number[],
        scale: number,
        rotZ: number,
        rotX: number,
        groundResolution?: number,
        worldSizePixel?: number
    ) {
        this.centerWorld = centerWorld;
        this.setTransform(scale, rotZ, rotX);
    }

    protected setTransform(scale: number, rotZ: number, rotX: number) {
        this.render.setScale(this.s = scale, 0, 0);
        this.render.setRotation(this.rz = rotZ, this.rx = rotX);
        this.render.applyTransform();
    }

    getLayers() {
        return this.layers;
    }

    destroy() {
        if (this.renderFrameId !== null) {
            cancelAnimationFrame(this.renderFrameId);
            this.renderFrameId = null;
        }
        this.render.destroy();
        var canvas = this.canvas;
        canvas.parentElement.removeChild(canvas);
        canvas.width = canvas.height = 1;
    }

    clearLayer(layer: TileLayer) {
        const index = this.getLayers().indexOf(layer);
        this.buckets.forEach((dTile) => {
            dTile.preview(index, false);
            dTile.ready(index, false);
        });
    };

    viewChangeDone() {
        this.viewChange = false;
    }

    /**
     * Returns the topmost rendered feature on the screen.
     *
     * @param screenX x position on screen
     * @param screenY y position
     * @param layers
     *
     * @internal
     * @hidden
     */
    getRenderedFeatureAt(screenX: number, screenY: number, layers?: (TileLayer | CustomLayer)[]): {
        id: number | string | null,
        z?: number,
        layer?: TileLayer,
        pointWorld?: number[]
    } {
        return {id: null};
    }

    scaleOffsetXYByAltitude(pointWorld: number[]) {
        // compensate altitude scaling is not supported by defaultgetRenderedFeatureAt
        return 1;
    }

    protected setZoom(zoomLevel: number): boolean {
        if (this.zoom != zoomLevel) {
            this.zoom = zoomLevel;
            return true;
        }
    }


    getTerrainHeightAtWorldXY(x: number, y: number): number | null {
        return null;
    }

    getTerrainPointHeight(lon: number, lat: number, terrainLayer?: TileLayer): number | null {
        return null;
    }

    getTerrainRegionMaxHeight(lon: number, lat: number, terrainLayer?: TileLayer): number | null {
        return null;
    }

    getTerrainCenterAltitude(): number {
        return 0;
    }
}


export default Display;
