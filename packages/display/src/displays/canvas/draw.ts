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

import LineTextDrawer from './LineTextDrawer';
import LineSymbolDrawer from './LineSymbolDrawer';
import {measure, defaultFont} from '../fontCache';
import {getValue} from '../styleTools';
import CanvasTile from './CanvasTile';
import drawLine from './drawLine';
import drawPoint from './drawPoint';

import {tile} from '@here/xyz-maps-core';

const DEFAULT_LINE_JOIN_CAP = 'round';
const DEFAULT_TEXT_ALIGN = 'center';
const DEFAULT_TEXT_BASELINE = 'middle';
const DEFAULT_STROKE_WIDTH = 1;
const NO_LINE_DASH = [];
let UNDEF;


let labeler = new LineTextDrawer(
    measure(defaultFont)
);

let drawOnLine = new LineSymbolDrawer();

const init = (tileCtx: CanvasRenderingContext2D, renderStyle, zoomLevelScaling: number) => {
    tileCtx.globalAlpha = renderStyle['opacity'] == UNDEF ? 1 : renderStyle['opacity'];


    const font = renderStyle['font'];
    const stroke = renderStyle['stroke'];
    let strokeWidth;
    let strokeDasharray;


    if (stroke) {
        tileCtx.strokeStyle = stroke;
        strokeWidth = renderStyle['strokeWidth'];

        if (font) {
            // don't apply strokescaling to text rendering
            zoomLevelScaling = 1;
        }

        if (!strokeWidth || typeof strokeWidth != 'number') {
            strokeWidth = DEFAULT_STROKE_WIDTH;
        }

        tileCtx.lineWidth = strokeWidth * zoomLevelScaling;
    }

    if (renderStyle.fill) {
        tileCtx.fillStyle = renderStyle.fill;
    }


    if (font) {
        let font = renderStyle['font'] || defaultFont;

        labeler.setCharWidth(
            measure(font)
        );

        tileCtx.font = font;

        tileCtx.textAlign = renderStyle['textAlign'] || DEFAULT_TEXT_ALIGN;

        tileCtx.textBaseline = renderStyle['textBaseline'] || DEFAULT_TEXT_BASELINE;
    } else {
        tileCtx.lineCap = renderStyle['strokeLinecap'] || DEFAULT_LINE_JOIN_CAP;

        tileCtx.lineJoin = renderStyle['strokeLinejoin'] || DEFAULT_LINE_JOIN_CAP;

        strokeDasharray = renderStyle['strokeDasharray'];

        if (strokeDasharray instanceof Array) {
            tileCtx.setLineDash(strokeDasharray);
        } else {
            tileCtx.setLineDash(NO_LINE_DASH);
        }

        if (renderStyle.fill || renderStyle.stroke) {
            tileCtx.beginPath();
        }
    }

    return true;
};

const feature = (tile: tile.Tile, tileCtx: CanvasRenderingContext2D, feature, text: string, renderStyle, displayTile: CanvasTile, layer, pmap: {}, display, devicePixelRatio: number) => {
    // let coords = feature.geometry.coordinates;
    let coords = feature.getProvider().decCoord(feature);
    let geometryType = feature.geometry.type;
    const zoom = tile.z;
    let symbol = getValue('type', renderStyle, feature, zoom);

    if (geometryType == 'LineString') {
        if (symbol == 'Circle' || symbol == 'Rect' || symbol == 'Image') {
            const offset = getValue('offset', renderStyle, feature, zoom);

            if (offset != UNDEF) {
                drawOnLine.init(offset);
                drawOnLine.place(coords, tile, tileCtx, feature, renderStyle, displayTile, layer, pmap, display, devicePixelRatio);
                return;
            } else {
                geometryType = 'MultiPoint';
            }
        }
    } else if ((geometryType == 'Polygon' || geometryType == 'MultiPolygon') && symbol != 'Polygon' && symbol != 'Line') {
        const bbox = feature.bbox;

        return drawPoint(
            symbol,
            tile.lon2x(bbox[0] + (bbox[2] - bbox[0]) / 2),
            tile.lat2y(bbox[1] + (bbox[3] - bbox[1]) / 2),
            renderStyle,
            feature,
            text,
            tile,
            displayTile,
            tileCtx,
            layer,
            pmap,
            display
            /* , tileX, tileY, tileScale*/
        );
    }

    if (geometryType == 'Point') {
        drawPoint(
            symbol,
            tile.lon2x(coords[0]),
            tile.lat2y(coords[1]),
            renderStyle,
            feature,
            text,
            tile,
            displayTile,
            tileCtx,
            layer,
            pmap,
            display
            /* , tileX, tileY, tileScale*/
        );
    } else {
        // if( isTextStyle != UNDEF )


        if (symbol == 'Text') {
            if (!labeler.init(text)) {
                return;
            }

            if (geometryType == 'MultiLineString') {
                for (var c = 0; c < coords.length; c++) {
                    labeler.place(coords[c], tile, tileCtx, feature, renderStyle, displayTile, layer, pmap, display, devicePixelRatio);
                }
            } else if (geometryType == 'LineString') {
                labeler.place(coords, tile, tileCtx, feature, renderStyle, displayTile, layer, pmap, display, devicePixelRatio);
            }
        } else {
            if (geometryType == 'LineString') {
                drawLine(coords, tileCtx, tile); // , tileX, tileY, tileScale )
            } else if (geometryType == 'Polygon' || geometryType == 'MultiLineString') {
                for (var ext = 0; ext < coords.length; ext++) {
                    drawLine(coords[ext], tileCtx, tile);
                }
            } else if (geometryType == 'MultiPolygon') {
                for (var c = 0; c < coords.length; c++) {
                    for (var ext = 0; ext < coords[c].length; ext++) {
                        drawLine(coords[c][ext], tileCtx, tile);
                    }
                }
            } else if (geometryType == 'MultiPoint') {
                let pnts = coords.length;

                while (pnts--) {
                    drawPoint(
                        symbol,
                        tile.lon2x(coords[pnts][0]),
                        tile.lat2y(coords[pnts][1]),
                        renderStyle,
                        feature,
                        text,
                        tile,
                        displayTile,
                        tileCtx,
                        layer,
                        pmap,
                        display
                        /* , tileX, tileY, tileScale */
                    );
                }
            }
        }
    }
};

export default {init, feature};
