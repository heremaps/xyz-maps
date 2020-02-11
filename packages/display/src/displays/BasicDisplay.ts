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

import {global, TaskManager} from '@here/xyz-maps-common';
import {geo, tile, layers} from '@here/xyz-maps-core';
import {getElDimension, createCanvas} from '../DOMTools';
import {Layers, Layer, TilePosition} from './Layers';
import FeatureModifier from './FeatureModifier';
import BasicRender from './BasicRender';
import BasicTile from './BasicTile';
import BasicBucket from './BasicBucket';
import Preview from './Preview';
import LayerClusterer from './LayerClusterer';
import Grid from '../Grid';

type Tile = tile.Tile;
type TileLayer = layers.TileLayer;


const CREATE_IF_NOT_EXISTS = true;

function toggleLayerEventListener(toggle: string, layer: any, listeners: any) {
    toggle = toggle + 'EventListener';

    if (layer[toggle]) {
        for (var type in listeners) {
            layer[toggle](type, listeners[type]);
        }
    }
}

const exclusiveTimeMS = 4;

let UNDEF;

abstract class Display {
    static getPixelRatio(dpr: string | number | any) {
        dpr = dpr == 'auto'
            ? Math.min(2, global.devicePixelRatio || 1)
            : dpr || 1;

        return dpr < 1 ? 1 : dpr;
    }

    private previewer: Preview;
    private updating: boolean = false;
    protected dirty: boolean = false;
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
    listeners: any;
    tiles: { [tilesize: string]: TilePosition[] };
    cluster: LayerClusterer;
    grid: Grid;

    constructor(mapEl: HTMLElement, tileSize, dpr: string | number, bucketPool, tileRenderer: BasicRender, previewLookAhead: number | [number, number]) {
        const display = this;
        const w = getElDimension(mapEl, 'width');
        const h = getElDimension(mapEl, 'height');

        const canvas = createCanvas(mapEl, w, h, 0);

        display.previewer = new Preview(display, previewLookAhead);
        display.cluster = new LayerClusterer(TaskManager.getInstance(), exclusiveTimeMS);
        display.grid = new Grid(tileSize);
        display.tiles = {
            256: [],
            512: []
        };
        display.render = tileRenderer;
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
            'clear': featureModifier.clear.bind(featureModifier),

            'featureAdd': featureModifier.add.bind(featureModifier),

            'featureRemove': featureModifier.remove.bind(featureModifier),

            'featureCoordinatesChange': featureModifier.updateGeometry.bind(featureModifier),

            'styleGroupChange': featureModifier.repaint.bind(featureModifier),

            'styleChange': (layerStyle, layer) => {
                display.setLayerBgColor(layer);
                const index = display.layers.indexOf(layer);
                display.buckets.tiles.forEach((t) => t.clear(index));
            }
        };
    }

    addLayer(layer: TileLayer, styles, index: number): boolean {
        const display = this;
        const layers = display.layers;
        let added = false;
        if (layers.add(layer, index)) {
            const dLayer = layers.get(layer);
            // new function needs to be created per layer otherwise a setup with same provider used
            // accross multiple layers will lead in case of cancel to cancel all layers.
            dLayer.handleTile = (tile) => {
                // is tile still visible ?
                if (display.isVisible(tile, dLayer)) {
                    display.handleTile(tile, layer);
                }
            };

            toggleLayerEventListener('add', layer, display.listeners);

            if (index == 0) {
                display.setLayerBgColor(layer);
            }

            display.buckets.forEach((dTile) => {
                dTile.addLayer(index);
            });

            added = true;
        }
        return added;
    }

    removeLayer(layer: TileLayer): number {
        const display = this;
        const layers = this.layers;
        const dLayer = layers.get(layer);
        const tiles = dLayer.tiles;
        const index = layers.remove(layer);

        if (index !== -1) {
            display.buckets.forEach((dTile) => {
                dTile.cancelTasks(layer);
                dTile.removeLayer(index);
            });

            for (let screenTile of tiles) {
                const quadkey = screenTile.tile.quadkey;
                display.releaseTile(quadkey, dLayer);
                display.cancel(quadkey, layer);
            }

            toggleLayerEventListener('remove', layer, display.listeners);
        }
        return index;
    }

    getBucket(quadkey: string, createIfNotExists?: boolean) {
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
        const display = this;
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

    protected abstract viewport(dirty?: boolean);

    abstract prepareTile(tile: Tile, data, layer, dTile: BasicTile, onDone: (dTile: BasicTile, layer: TileLayer) => void);

    abstract unproject(x: number, y: number, screenOffsetX?: number, screenOffsetY?: number): [number, number];

    abstract project(x: number, y: number, screenOffsetX?: number, screenOffsetY?: number): [number, number];

    private setLayerBgColor(layer: TileLayer) {
        const style = layer.getStyle();
        const layerBgc = style.backgroundColor;
        const display = this;
        // only set background color of layer if no global bg color has been defined on display.
        if (!display.globalBgc && layerBgc) {
            display.render.setBackgroundColor(layerBgc);
        }
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

    // USED BY FEATUREMODIFIER
    updateTile(tile: Tile, dTile: BasicTile, layer: TileLayer, feature?) {
        if (dTile && !dTile.busy(layer)) {
            const display = this;
            const index = dTile.index(layer);
            dTile.ready(index, false);
            // clear preview to enable preview creation for next render iteration
            // dTile.p[index] = false;
            if (display.isVisible(tile, display.layers[index])) {
                display.handleTile(tile, layer, dTile, index);
            }
        }
    }

    setSize(w: number, h: number) {
        var display = this;
        var dpr = display.dpr;
        var canvas = display.canvas;

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


    private initGrid(zoomLevel: number, gridTileSize: number) {
        const display = this;
        const layers: Layer[] = <Layer[]><unknown> this.layers;
        const gridTiles = display.grid.getGrid(zoomLevel - Number(gridTileSize == 512), gridTileSize);
        const prevVPTiles = display.tiles[gridTileSize];
        let vpTiles = display.tiles[gridTileSize] = [];
        const screenTiles = [];

        for (let gridTile of gridTiles) {
            const x1 = Math.round(gridTile.x);
            const y1 = Math.round(gridTile.y);
            const quadkey = gridTile.quadkey;
            const displayTile = display.getBucket(quadkey, CREATE_IF_NOT_EXISTS);
            const tilePosition = new TilePosition(x1, y1, displayTile);

            screenTiles.push(tilePosition);
            vpTiles.push(tilePosition);

            for (let dLayer of layers) {
                let layer = dLayer.layer;
                let layerTileSize = layer.tileSize || 256;

                if (layerTileSize == gridTileSize) {
                    if (dLayer.tiles != screenTiles) {
                        dLayer.tiles = screenTiles;
                    }
                    if (zoomLevel >= layer.min && zoomLevel <= layer.max) {
                        display.initTile(displayTile, dLayer);
                        // tile = mapLayers[layerId][quadkey] =
                        layer.getTile(quadkey, dLayer.handleTile);
                    }
                }
            }
        }

        // mark tiles to not be visible anymore
        prevVPTiles.forEach((tilePos) => {
            const qk = tilePos.tile.quadkey;
            for (let vpTile of vpTiles) {
                if (vpTile.tile.quadkey == qk) {
                    return;
                }
            }

            for (let dLayer of layers) {
                if (dLayer.layer.tileSize == gridTileSize) {
                    display.releaseTile(qk, dLayer);
                }
            }
            display.cancel(qk);
        });
    }

    updateGrid(centerWorld: [number, number], zoomlevel: number, screenOffsetX: number, screenOffsetY: number) {
        const display = this;
        const rotZRad = this.rz;
        const mapWidthPixel = this.w;
        const mapHeightPixel = this.h;
        const displayWidth = mapWidthPixel;
        const displayHeight = mapHeightPixel;
        const grid = this.grid;

        // optimize gird if screen is rotated
        let rotatedScreenPixels = [
            display.unproject(0, 0),
            display.unproject(displayWidth - 1, 0),
            display.unproject(displayWidth - 1, displayHeight - 1),
            display.unproject(0, displayHeight - 1)
        ];

        grid.init(centerWorld, rotZRad, mapWidthPixel, mapHeightPixel, rotatedScreenPixels);


        const layers = this.layers;
        // const prevVPTiles =
        const tileSizes = layers.reset(zoomlevel);


        for (let tileSize of tileSizes) {
            this.initGrid(zoomlevel, tileSize);
        }
        this.dirty = true;

        display.update();
    }

    releaseTile(quadkey: string, dLayer: Layer) {
        const tileLayer = dLayer.layer;
        const tile = tileLayer.getCachedTile(quadkey);

        if (tile && tile.loadStartTs) {
            if (!tile.isLoaded()) {
                dLayer.layer.cancelTile(tile, dLayer.handleTile);
            }
        }
    }

    private initTile(displayTile: BasicTile, dLayer: Layer) {
        const index = dLayer.index;
        const display = this;

        if (dLayer.visible) {
            if (!displayTile.ready(index) && !displayTile.preview(index)) {
                display.preview(displayTile, dLayer.layer, index);
            }
        } else {
            // if layer is not visible displaytiles need to be marked as ready to stop renderloop.
            displayTile.ready(index, true);
        }
    }

    update(dirty?: boolean) {
        const display = this;

        if (!display.updating) {
            display.updating = true;

            requestAnimationFrame(() => {
                display.viewport(dirty);
                display.updating = false;
            });
        }
    }

    globalBgc: boolean = false;

    setBGColor(bgColor?: string) {
        var displ = this;

        if (bgColor) {
            displ.globalBgc = true;
        }

        bgColor = bgColor ||
            global.getComputedStyle(displ.canvas.parentElement, null)
                .getPropertyValue('background-color');

        if (
            !bgColor ||
            bgColor == 'rgba(0, 0, 0, 0)' || // webkit
            bgColor == 'transparent' // firefox, ie
        ) {
            bgColor = '#ffffff';
        }

        displ.render.setBackgroundColor(bgColor);
    }

    showGrid(show) {
        this.render.grid(!!show);
    }

    setTransform(scale, rotZ, rotX) {
        this.render.setScale(this.s = scale, 0, 0);
        this.render.setRotation(this.rz = rotZ, this.rx = rotX);
        this.render.applyTransform();
    }

    getLayers() {
        return this.layers;
    }

    destroy() {
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
}


export default Display;
