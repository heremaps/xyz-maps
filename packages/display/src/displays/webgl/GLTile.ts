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

import BasicTile from '../BasicTile';

import {TileLayer} from '@here/xyz-maps-core';
import {GeometryBuffer} from './buffer/GeometryBuffer';


let UNDEF;


type DropHandler = (data: GeometryBuffer[], layerIndex: number) => void;

class GLTile extends BasicTile {
    data = [];

    private onDrop: DropHandler;

    constructor(quadkey: string, layers: any[], onDrop?: DropHandler) {
        super();
        this.onDrop = onDrop;
        this.init(quadkey, layers);
    }

    clear(index: number) {
        this.setData(index, UNDEF);
        this.ready(index, false);
        this.preview(index, false);
    };

    init(quadkey: string, layers: TileLayer[]) {
        super.init(quadkey, layers);

        this.data.length = 0;
    }

    setData(layer: number | TileLayer, data: GeometryBuffer[]): number {
        const index = typeof layer == 'number'
            ? layer
            : this.layers.indexOf(layer);

        const _data = this.data[index];
        if (_data && _data.length) {
            if (this.onDrop) {
                this.onDrop(_data, index);
            }
        }
        this.data[index] = data;

        return index;
    };


    getData(index: number) {
        return this.data[index];
    }


    addLayer(index) {
        super.addLayer(index);
        this.data.splice(index, 0, UNDEF);
    };

    removeLayer(index) {
        super.removeLayer(index);
        this.setData(index, UNDEF);
        this.preview(index, UNDEF);
        this.data.splice(index, 1);
    };
}

export default GLTile;
