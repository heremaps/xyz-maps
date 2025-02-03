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

import {Tile, Layer as BasicLayer, TileLayer} from '@here/xyz-maps-core';
import {Expression, ExpressionParser} from '@here/xyz-maps-common';
import {parseStyleGroup} from './styleTools';
import {defaultLight, ProcessedLights} from './webgl/lights';
import {ViewportTile} from './BasicDisplay';


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
    tiles: ViewportTile[] = [];
    tileSize: number;
    handleTile: (tile: Tile) => void;
    z: { [zIndex: string]: number } = {};
    zLength: number = 0;

    private layers: Layers;
    private zd: boolean = false; // dirty
    bgColor: any;

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
    }

    getExpressionParser(): StyleExpressionParser {
        return this.expParser;
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
}

class Layers extends Array<Layer> {
    constructor(...items: Layer[]) {
        super(...items);
        (<any>Object).setPrototypeOf(this, Layers.prototype);
    };

    _map: { [id: string]: Layer } = {};

    // tiles: TileMap = {};

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
        let data = this._map[id];
        let isNew;

        // it's already in ?
        if (data) {
            // ..remove it!
            this.splice(super.indexOf(data), 1);
            // ..and reinsert at desired postion
            this.splice(index, 0, data);

            isNew = false;
        } else {
            data = this._map[id] = new Layer(layer, this);

            this.splice(index, 0, data);

            isNew = true;
        }
        this.fixZ();
        return isNew;
    }

    remove(layer: BasicLayer) {
        let index = this.indexOf(layer);

        if (index !== -1) {
            this.splice(index, 1);
            delete this._map[layer.id];
            this.fixZ();
        }

        return index;
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
}

export {Layers, Layer};
