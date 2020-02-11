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

import {getValue} from '../styleTools';
import ImgResourceHandler from '../ImageResourceHandler';

const imgResources = new ImgResourceHandler();
const PI2 = 2 * Math.PI;
const TO_RAD = Math.PI / 180;
const MAX_CANVAS_SIZE = 512;

const BIT_X = Math.log(MAX_CANVAS_SIZE * 4 /* take caee of unclipped geometry */) / Math.log(2);

const BIT_ROTATION = BIT_X + 9;


const drawPoint = (type: string, x: number, y: number, renderStyle, feature, text, tile, displayTile, tileCtx, layer, pmap, display /* tileX, tileY, tileScale*/) => {
    const zoom = tile.z;
    const ox = getValue('offsetX', renderStyle, feature, zoom) ^ 0;
    const oy = getValue('offsetY', renderStyle, feature, zoom) ^ 0;
    x = x /* * tileScale - tileX*/ + ox;
    y = y /* * tileScale - tileY*/ + oy;
    let rotation = getValue('rotation', renderStyle, feature, zoom);
    let pid = ((x + MAX_CANVAS_SIZE) << BIT_X) | ((y + MAX_CANVAS_SIZE) ^ 0) | (rotation+360)%360<<BIT_ROTATION;

    let src;
    let r;
    let w;
    let h;
    let tx;
    let ty;

    if (pmap[pid]) {
        return;
    }
    pmap[pid] = 1;


    if (rotation ) {
        rotation *= TO_RAD;
        tileCtx.translate(x, y);
        tileCtx.rotate(rotation);
        tx = x;
        ty = y;
        x = 0;
        y = 0;
    }


    if (type == 'Text') {
        if (renderStyle.stroke && renderStyle.strokeWidth != 0) {
            tileCtx.strokeText(text, x, y);
        }

        if (renderStyle.fill) {
            tileCtx.fillText(text, x, y);
        }
    } else {
        if (type == 'Circle') {
            r = getValue('radius', renderStyle, feature, zoom);
            tileCtx.moveTo(x + r, y);
            tileCtx.arc(x, y, r, 0, PI2, false);
        } else {
            w = getValue('width', renderStyle, feature, zoom);
            h = getValue('height', renderStyle, feature, zoom) || w;
            x = x - w / 2;
            y = y - h / 2;

            if (type == 'Image') {
                src = getValue('src', renderStyle, feature, zoom);

                if (imgResources.isReady(src)) {
                    tileCtx.drawImage(imgResources.get(src), x, y, w, h);
                } else {
                    imgResources.get(src,
                        () => display.updateTile(tile, displayTile, layer),
                        tile.quadkey
                    );
                }
            } else if (type == 'Rect') {
                tileCtx.rect(x, y, w, h);
            }
        }
    }

    if (rotation) {
        tileCtx.rotate(-rotation);
        tileCtx.translate(-tx, -ty);
        // tileCtx.setTransform(1,0,0,1,0,0);
    }
};

export default drawPoint;
