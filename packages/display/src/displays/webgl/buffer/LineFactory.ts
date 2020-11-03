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

import {LineBuffer} from './templates/LineBuffer';
import {addLineString} from './addLineString';
import {DashAtlas} from '../DashAtlas';
import {GlyphTexture} from '../GlyphTexture';
import {TextBuffer} from './templates/TextBuffer';
import {addLineText} from './addLineText';
import {tile} from '@here/xyz-maps-core';

type Tile = tile.Tile;

const DEFAULT_MIN_TEXT_REPEAT = 256;

export type PixelCoordinateCache = { data: Float32Array, length: number };

export class LineFactory {
    private dashes: DashAtlas;
    private gl: WebGLRenderingContext;
    private prjCoords: PixelCoordinateCache = null; // coordinate cache
    private pixels: Float32Array;
    private decimals: number; // increase precision for tile scaling

    constructor(gl: WebGLRenderingContext) {
        this.dashes = new DashAtlas(gl);
        this.gl = gl;
        // reused pixel coordinate cache
        this.pixels = new Float32Array(262144); // -> 1MB;
    }

    private projectLine(coordinates: [number, number, number?][], tile: Tile, tileSize: number): PixelCoordinateCache {
        const {pixels, decimals} = this;
        if (!this.prjCoords) {
            let t = 0;
            for (let c = 0, length = coordinates.length, x, y, _x, _y; c < length; c++) {
                x = tile.lon2x(coordinates[c][0], tileSize);
                y = tile.lat2y(coordinates[c][1], tileSize);

                if (!c ||
                    (Math.round(_x * decimals) - Math.round(x * decimals)) ||
                    (Math.round(_y * decimals) - Math.round(y * decimals))
                ) {
                    pixels[t++] = x;
                    pixels[t++] = y;
                }
                _x = x;
                _y = y;
            }
            this.prjCoords = {
                data: pixels,
                length: t
            };
        }
        return this.prjCoords;
    }

    init(zoom: number, tileSize: number) {
        // allow more precision in case tiles are getting zoomed very close (zoomlevel 20+)
        this.decimals = zoom >= 20 - Number(tileSize == 512) ? 1e2 : 1;
        // clear projected coordinate cache
        this.prjCoords = null;
    }

    createLine(
        coordinates: [number, number, number?][],
        group,
        tile: Tile,
        tileSize: number,
        removeTileBounds: boolean,
        strokeDasharray,
        strokeLinecap,
        strokeLinejoin,
        strokeWidth
    ) {
        if (strokeDasharray) {
            group.texture = this.dashes.get(strokeDasharray);
        }

        if (!group.buffer) {
            group.buffer = new LineBuffer();
        }

        const groupBuffer = group.buffer;

        addLineString(
            groupBuffer.attributes.a_position.data,
            groupBuffer.attributes.a_normal.data,
            this.projectLine(coordinates, tile, tileSize),
            tile,
            tileSize,
            removeTileBounds,
            strokeLinecap,
            strokeLinejoin,
            strokeWidth,
            strokeDasharray && groupBuffer.attributes.a_lengthSoFar.data
        );
    }

    createText(
        text: string,
        coordinates: [number, number, number?][],
        group,
        tile: Tile,
        tileSize: number,
        collisions,
        priority: number,
        repeat: number,
        offsetX: number,
        offsetY: number,
        style
    ) {
        let {texture} = group;

        if (!texture) {
            texture = group.texture = new GlyphTexture(this.gl, style);
            group.buffer = new TextBuffer();
        }

        const attributes = group.buffer.attributes;

        addLineText(
            text,
            attributes.a_point,
            attributes.a_position.data,
            attributes.a_texcoord.data,
            this.projectLine(coordinates, tile, tileSize),
            texture,
            tile,
            tileSize,
            collisions,
            priority,
            repeat || DEFAULT_MIN_TEXT_REPEAT,
            offsetX,
            offsetY
        );
    }
}
