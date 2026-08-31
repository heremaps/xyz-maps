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

import {Tile, Layer as BasicLayer, TileLayer, TerrainTileLayer, LayerStyle} from '@here/xyz-maps-core';
import {Color, Expression, ExpressionParser} from '@here/xyz-maps-common';
import {parseColor, parseRGBA, parseStyleGroup} from './styleTools';
import {defaultLight, ProcessedLights} from './webgl/lights';
import {ViewportTile, DisplayTile} from './BasicDisplay';

const {toRGB} = Color;
type RGBA = Color.RGBA;


interface ResultCache<K, V> extends Map<K, V> {
    hits?: number;
}

export type StyleExpressionParser = ExpressionParser & {
    context: { [name: string]: any, _dynamicExpResultCache: ResultCache<Expression, any> },
    _dynamicExpCache: Map<Expression, any>
}


class Layer {
    id: number;
    ready: boolean = false;
    cnt: number = 0;
    layer: BasicLayer;
    error: boolean;
    index: number;
    visible: boolean;
    tiles: DisplayTile[] = [];
    // Uncapped, display-zoom terrain render-tiles (only set for the terrain layer).
    // Unlike `tiles` (capped at maxDataZoom for DEM loading), these follow the full
    // adaptive LOD grid and are used to partition the terrain mesh per display tile.
    terrainRenderTiles: DisplayTile[] = [];
    tileSize: number;
    handleTile: (tile: Tile) => void;
    z: { [zIndex: string]: number } = {};
    zLength: number = 0;

    private layers: Layers;
    private zd: boolean = false; // dirty
    private bgColor: [number, number, number, number?] | ((z: number) => [number, number, number, number?]);
    private bgColorRGBA: {
        zoomStamp: number,
        color: RGBA
    } = {zoomStamp: null, color: null};

    private expParser: StyleExpressionParser | undefined;
    skipDbgGrid: boolean; // do not render tile grid in debug mode

    constructor(layer: BasicLayer, layers: Layers) {
        this.layer = layer;
        this.tileSize = (<TileLayer>layer).tileSize || null;
        this.layers = layers;
        this.id = Math.floor(Math.random() * 1e16);
        this.initStyle();
    }

    initStyle() {
        this.expParser = (this.layer as TileLayer).getStyleManager?.().getExpressionParser?.() as StyleExpressionParser;
        this.invalidateBackgroundColor();
    }

    getExpressionParser(): StyleExpressionParser {
        return this.expParser;
    }

    getTerrainLayer(): Layer {
        return this.layers.getTerrainLayer();
    }

    getZ(z: number | string): number {
        const zSorted = this.z;
        if (this.zd) {
            let c = 0;
            for (let i in zSorted) {
                zSorted[i] = c++;
            }
            this.zLength = c;
            this.zd = false;

            this.z3d = zSorted[this._z3d];
        }
        return zSorted[z] || 0;
    }

    getAbsoluteZ(zIndex?: number) {
        const {index, layers} = this;
        let i = 0;
        let z = 0;
        while (i < index) {
            z += layers[i++].zLength;
        }
        if (zIndex != undefined) {
            z += this.getZ(zIndex);
        }
        return z;
    }

    addZ(z: number, is3d?: boolean) {
        const zSorted = this.z;
        if (zSorted[z] == undefined) {
            zSorted[z] = 0;
            this.zd = true;

            if (is3d && z < this._z3d) {
                this._z3d = z;
            }
        }
    }

    getZ3d() {
        const {layers} = this;
        let i = 0;
        let z = 0;
        let l;
        while (l = layers[i++]) {
            if (l._z3d >= 0) {
                return z + l.z3d;
            }
            z += l.zLength;
        }
        return z;
    }

    _z3d: number = Infinity;
    z3d: number;

    processStyleGroup(feature, tileGridZoom: number) {
        const styleGroup = (this.layer as TileLayer).getStyleGroup?.(feature, tileGridZoom);
        if (styleGroup) {
            parseStyleGroup(styleGroup, this.expParser);
        }
        return styleGroup;
    }

    getLights(lightSet?: string): { [p: string]: ProcessedLights } {
        const styleManager = (this.layer as TileLayer).getStyleManager?.();
        let lights = styleManager?.lights || {};
        if (!lights.defaultLight) {
            lights.defaultLight ||= defaultLight;
            if (styleManager) {
                styleManager.lights = lights;
            }
        }
        return lights as { [p: string]: ProcessedLights };
    }

    reset(zoomlevel: number): number {
        const dLayer: Layer = this;
        const layer = dLayer.layer;
        dLayer.error = false;
        dLayer.cnt = 0;
        dLayer.tiles = [];
        dLayer.terrainRenderTiles = [];

        if (dLayer.visible = layer.isVisible(zoomlevel)) {
            dLayer.ready = false;

            if (layer.custom) return;

            return (<TileLayer>layer).tileSize;
            // tileSizes.add(layer.tileSize);
        } else {
            // if layer not visible viewportReady should be triggered..
            // changing this default behavior might make sense for future release
            dLayer.ready = true;
        }
    }

    getRenderIndex() {
        return this.index + 1;
    }

    setBackgroundColor(color: LayerStyle['backgroundColor']) {
        this.bgColor = parseColor(color);
    }

    getBackgroundColorRGBA(zoomLevel: number): RGBA {
        if (this.bgColorRGBA.zoomStamp === zoomLevel) return this.bgColorRGBA.color;
        this.bgColorRGBA.zoomStamp = zoomLevel;
        return this.bgColorRGBA.color = parseRGBA(this.bgColor, zoomLevel) ?? undefined;
    }

    invalidateBackgroundColor() {
        this.bgColorRGBA.zoomStamp = null;
        this.bgColorRGBA.color = null;
    }
}

class Layers extends Array<Layer> {
    constructor(...items: Layer[]) {
        super(...items);
        (<any>Object).setPrototypeOf(this, Layers.prototype);
    };

    _map: { [id: string]: Layer } = {};

    // tiles: TileMap = {};

    private _terrainLayer: Layer;

    // @ts-ignore
    indexOf(layer: BasicLayer) {
        let item = this._map[layer.id];
        return super.indexOf(item);
    }

    private fixZ() {
        for (let z = 0; z < this.length; z++) {
            this[z].index = z;
        }
    }

    add(layer: BasicLayer, index: number) {
        const id = layer.id;
        let displayLayer = this._map[id];
        let isNew;

        // it's already in ?
        if (displayLayer) {
            // ..remove it!
            this.splice(super.indexOf(displayLayer), 1);
            // ..and reinsert at desired postion
            this.splice(index, 0, displayLayer);

            displayLayer.invalidateBackgroundColor();

            isNew = false;
        } else {
            displayLayer = this._map[id] = new Layer(layer, this);

            if (layer instanceof TerrainTileLayer) {
                this._terrainLayer = displayLayer;
            }

            this.splice(index, 0, displayLayer);

            isNew = true;
        }

        this.invalidateTerrainColor();
        this.fixZ();
        return isNew;
    }

    remove(layer: BasicLayer) {
        let index = this.indexOf(layer);

        if (index !== -1) {
            if (this[index] === this._terrainLayer) {
                this._terrainLayer = null;
            }
            this.splice(index, 1);

            delete this._map[layer.id];
            this.fixZ();
        }

        return index;
    }

    getTerrainLayer(): Layer {
        return this._terrainLayer;
    }

    get(layer: string | BasicLayer) {
        if (typeof layer != 'string') {
            layer = layer.id;
        }
        return this._map[layer];
    }

    // clear(): TileMap {
    //     const _tiles = this.tiles;
    //     this.tiles = {};
    //     return _tiles;
    // }

    reset(zoomlevel: number): number[] {
        const tileSizes = new Set<number>();
        for (let dLayer of this) {
            let tileSize = dLayer.reset(zoomlevel);
            if (tileSize) {
                tileSizes.add(tileSize);
            }
        }
        return Array.from(tileSizes);
    }


    /**
     * Marks the cached terrain color state as invalid. Forces a re-evaluation on the next update.
     *
     * @hidden
     * @internal
     */
    private invalidateTerrainColor(): void {
        this._terrainColor.zoom = null;
    }

    private _terrainColor: { zoom: null | number, color: RGBA } = {zoom: null, color: null};

    getTerrainColor(zoomlevel: number) {
        if (this._terrainColor.zoom !== zoomlevel) {
            this._terrainColor.zoom = zoomlevel;
            const terrainLayer = this.getTerrainLayer();
            if (terrainLayer) {
                const colorSource = (terrainLayer.layer as TerrainTileLayer).getStyle().colorSource;

                switch (colorSource.type) {
                case 'material':
                    break;
                case 'solid':
                    this._terrainColor.color = toRGB(colorSource.color);
                    break;
                case 'layerBackground':
                    this._terrainColor.color = this.get(colorSource.layerId)?.getBackgroundColorRGBA(zoomlevel);
                    break;
                }
            }
        }
        return this._terrainColor.color;
    }
}

export {Layers, Layer};
