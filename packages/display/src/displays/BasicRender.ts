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

import BasicTile from './BasicTile';
import {layers} from '@here/xyz-maps-core';
import BasicBucket from './BasicBucket';

type TileLayer = layers.TileLayer;
type Tile = any;

interface BasicRender {

    init(canvas: HTMLCanvasElement, devicePixelRation: number): void;

    setBackgroundColor(color: string): void;

    setScale(scale: number, sx: number, sy: number): void;

    setRotation(rz: number, rx?: number): void;

    prepare(INSTRUCTIONS: any, tile: Tile, layer: TileLayer, display: any, dTile: BasicTile, cb: () => void): void;

    clear(): void;

    grid(show: boolean): void;

    applyTransform(): void;

    destroy(): void

    // tile(dTile: BasicTile, x: number, y: number, tileBucket: BasicBucket): void;

    // preview(dTile: BasicTile, previewData: any[], layer: TileLayer, index: number);
}

export default BasicRender;
