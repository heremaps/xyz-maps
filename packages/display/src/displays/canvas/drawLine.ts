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

const drawLine = (coords: number[][], tileCtx: CanvasRenderingContext2D, tile /* ,tileX,tileY,tileScale*/) => {
    let coordLen = coords.length - 1;
    let x;
    let y;
    let _x;
    let _y;

    tileCtx.moveTo(
        _x = Math.round(tile.lon2x(coords[coordLen][0])),
        _y = Math.round(tile.lat2y(coords[coordLen][1]))
    );

    while (coordLen--) {
        x = Math.round(tile.lon2x(coords[coordLen][0]));
        y = Math.round(tile.lat2y(coords[coordLen][1]));

        if (_x - x || _y - y) {
            tileCtx.lineTo(
                _x = x,
                _y = y
            );
        }
    }
};

export default drawLine;
