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

import {layers, tile} from '@here/xyz-maps-core';
import BasicTile from './BasicTile';

type Tile = tile.Tile;
type TileLayer = layers.TileLayer;

class TilePosition {
    x: number;
    y: number;
    tile: BasicTile;
    lrTs: number | false = false;

    constructor(x, y, tile) {
        this.x = x;
        this.y = y;
        this.tile = tile;
    }
}

class Layer {
    ready: boolean = false;
    cnt: number = 0;
    layer: TileLayer;
    error: boolean;
    index: number;
    visible: boolean;
    tiles: TilePosition[];
    tileSize: number;

    handleTile: (tile: Tile) => void;

    private zd: boolean = false; // dirty
    z: { [zIndex: string]: number } = {};
    zLength: number;

    constructor(layer: TileLayer) {
        this.layer = layer;
        this.tileSize = layer.tileSize;
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
        }
        return zSorted[z] || 0;
    }

    addZ(z: number | string) {
        const zSorted = this.z;
        if (zSorted[z] == undefined) {
            zSorted[z] = 0;
            this.zd = true;
        }
    }
}


type TileMap = { [quadkey: string]: [number, number] };

// type TileMap = { [quadkey: string]: { x: number, y: number, tile: Tile } };

class Layers extends Array<Layer> {
    constructor(...items: Layer[]) {
        super(...items);
        (<any>Object).setPrototypeOf(this, Layers.prototype);
    };

    _map: { [id: string]: Layer } = {};

    // tiles: TileMap = {};

    // @ts-ignore
    indexOf(layer: TileLayer) {
        let item = this._map[layer.id];
        return super.indexOf(item);
    }

    private fixZ() {
        for (let z = 0; z < this.length; z++) {
            this[z].index = z;
        }
    }

    add(layer: TileLayer, index: number) {
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
            data = this._map[id] = new Layer(layer);

            this.splice(index, 0, data);

            isNew = true;
        }
        this.fixZ();
        return isNew;
    }

    remove(layer: TileLayer) {
        let index = this.indexOf(layer);

        if (index !== -1) {
            this.splice(index, 1);
            delete this._map[layer.id];
            this.fixZ();
        }

        return index;
    }

    get(layer: string | TileLayer) {
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
        let layer;
        for (let dLayer of this) {
            layer = dLayer.layer;
            dLayer.error = false;
            dLayer.cnt = 0;
            dLayer.tiles = [];

            if (dLayer.visible = zoomlevel >= layer['min'] && zoomlevel <= layer['max']) {
                dLayer.ready = false;
                tileSizes.add(layer.tileSize);
            } else {
                // if layer not visible viewportReady should be triggered..
                // changing this default behaviour might make sense for future release
                dLayer.ready = true;
            }
        }

        return Array.from(tileSizes);

        // const _tiles = this.tiles;
        // this.tiles = {};
        // return _tiles;
    }
}

export {Layers, Layer, TilePosition};
