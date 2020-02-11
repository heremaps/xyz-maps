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

import {addText} from './addText';
import {addLineText} from './addLineText';
import {addPoint} from './addPoint';
import {addLineString} from './addLineString';
import {addPolygon, FlatPolygon} from './addPolygon';
import {addExtrude} from './addExtrude';
import {addIcon} from './addIcon';

import earcut from 'earcut';

import {getValue} from '../../styleTools';
import {defaultFont} from '../../fontCache';
import {GlyphTexture} from '../GlyphTexture';
import {toRGB} from '../color';
import {IconManager} from '../IconManager';
import {DashAtlas} from '../DashAtlas';

import {TextBuffer} from './templates/TextBuffer';
import {SymbolBuffer} from './templates/SymbolBuffer';
import {PointBuffer} from './templates/PointBuffer';
import {LineBuffer} from './templates/LineBuffer';
import {PolygonBuffer} from './templates/PolygonBuffer';
import {ExtrudeBuffer} from './templates/ExtrudeBuffer';

const DEFAULT_STROKE_WIDTH = 1;
const DEFAULT_LINE_CAP = 'round';
const DEFAULT_LINE_JOIN = 'round';
const NONE = '*';
let UNDEF;


const textRefCache = new Map();


const getTextString = (style, feature, level: number) => {
    let text = getValue('text', style, feature, level);

    if (!text && style.textRef) {
        text = textRefCache.get(style.textRef);
        if (text == UNDEF) {
            text = new Function('f', 'return f.' + style.textRef);
            textRefCache.set(style.textRef, text);
        }
        text = text(feature, level);
    }

    if (text != '') {
        if (text !== UNDEF && typeof text != 'string') {
            text = String(text);
        }
        return text;
    }
};

export class FeatureFactory {
    private gl: WebGLRenderingContext;
    private icons: IconManager;
    private dpr: number;

    private dashes: DashAtlas;

    constructor(gl: WebGLRenderingContext, iconManager: IconManager, devicePixelRatio: number) {
        this.gl = gl;
        this.icons = iconManager;
        this.dpr = devicePixelRatio;
        this.dashes = new DashAtlas(gl);
    }

    create(feature, geomType, coordinates, styleGroups, strokeWidthScale, tile, groups, tileSize: number): boolean {
        const level = tile.z;
        let vertex; // = vertexGroups[geomType];
        let extrudeDataAdded: FlatPolygon;
        let polygonDataAdded: FlatPolygon;
        let flatPoly: FlatPolygon;
        let triangles;
        let style;
        let zIndex;
        let type;
        let opacity;
        let font;
        let fill;
        let fillRGBA;
        let fillAlpha;
        let rotation;
        let stroke;
        let strokeRGBA;
        let strokeAlpha;
        let strokeWidth;
        let strokeDasharray;
        let strokeLinecap;
        let strokeLinejoin;
        let extrude;
        let radius;
        let width;
        let height;
        let zGrouped;
        let groupId;
        let group;
        let index;
        let offsetX;
        let offsetY;
        let text;
        let strokeScale;
        let allReady = true;

        if (!vertex) {
            // if (geomType != 'LineString') console.warn('NO VERTEXGROUPS:', geomType);
            // return true;
        }

        for (let i = 0, iLen = styleGroups.length; i < iLen; i++) {
            style = styleGroups[i];

            opacity = getValue('opacity', style, feature, level);

            if (opacity === 0) continue;

            if (opacity == UNDEF ||
                opacity >= .98 // no alpha visible -> no need to use more expensive alpha pass
            ) {
                opacity = 1;
            }

            type = getValue('type', style, feature, level);

            if (type == 'Image') {
                type = 'Icon';
            }

            // // posId = (x/4)<<16 | (y/4);
            // // if(pmap[posId]){
            // //     continue;
            // // }
            // // pmap[posId] = 1;
            //
            font = UNDEF;
            fill = UNDEF;
            stroke = UNDEF;
            fillRGBA = UNDEF;
            strokeRGBA = UNDEF;
            fillAlpha = 1;
            strokeAlpha = 1;
            strokeWidth = UNDEF;
            strokeDasharray = UNDEF;
            strokeLinecap = UNDEF;
            strokeLinejoin = UNDEF;
            radius = UNDEF;
            width = UNDEF;
            height = UNDEF;
            offsetX = UNDEF;
            offsetY = UNDEF;
            text = UNDEF;
            strokeScale = strokeWidthScale;


            if (type == 'Icon') {
                offsetX = getValue('offsetX', style, feature, level) ^ 0;
                offsetY = getValue('offsetY', style, feature, level) ^ 0;

                groupId = 'I' + offsetX + offsetY;
            } else {
                fill = getValue('fill', style, feature, level);
                stroke = getValue('stroke', style, feature, level);
                strokeWidth = getValue('strokeWidth', style, feature, level);

                if (type == 'Line') {
                    if (!stroke) continue;

                    strokeLinecap = getValue('strokeLinecap', style, feature, level) || DEFAULT_LINE_CAP;
                    strokeLinejoin = getValue('strokeLinejoin', style, feature, level) || DEFAULT_LINE_JOIN;
                    strokeDasharray = getValue('strokeDasharray', style, feature, level);

                    if (strokeDasharray instanceof Array) {
                        if (!strokeDasharray.length || !strokeDasharray[0]) {
                            strokeDasharray = UNDEF;
                        }
                    } else {
                        strokeDasharray = UNDEF;
                    }

                    groupId = 'L' + strokeLinecap + strokeLinejoin + (strokeDasharray || NONE);
                } else if (type == 'Polygon') {
                    if (geomType != 'Polygon' && geomType != 'MultiPolygon') {
                        // console.log('skip', geomType, 'for', type);
                        continue;
                    }
                    extrude = getValue('extrude', style, feature, level);

                    if (extrude) {
                        groupId = 'E';
                        type = 'Extrude';
                    } else {
                        // if (stroke) {
                        // groupId = 'PS';
                        // } else
                        {
                            groupId = 'P';
                        }
                    }
                } else {
                    if (geomType == 'Polygon' || geomType == 'MultiPolygon') {
                        continue;
                    }

                    if (type == 'Text') {
                        text = getTextString(style, feature, level);

                        if (!text) {
                            continue;
                        }

                        font = getValue('font', style, feature, level) || defaultFont;

                        groupId = 'T' + (font || NONE);
                    } else if (type == 'Circle') {
                        radius = getValue('radius', style, feature, level);
                        groupId = 'C' + radius || NONE;
                    } else if (type == 'Rect') {
                        width = getValue('width', style, feature, level);
                        height = getValue('height', style, feature, level) || width;

                        groupId = 'R' + width + height;
                    } else {
                        continue;
                    }

                    offsetX = getValue('offsetX', style, feature, level) ^ 0;
                    offsetY = getValue('offsetY', style, feature, level) ^ 0;

                    groupId += offsetX + offsetY;
                }

                if (fill) {
                    fillRGBA = toRGB(fill);
                    fillRGBA[3] *= opacity;
                }

                if (stroke) {
                    strokeRGBA = toRGB(stroke);
                    strokeRGBA[3] *= opacity;

                    if (type == 'Text') {
                        // don't apply stroke-scale to text rendering
                        strokeScale = 1;
                    }

                    if (typeof strokeWidth != 'number') {
                        strokeWidth = DEFAULT_STROKE_WIDTH;
                    } else {
                        strokeWidth *= strokeScale;

                        if (strokeWidth <= 0) {
                            strokeWidth = DEFAULT_STROKE_WIDTH;
                        }
                    }
                }

                groupId += (stroke || NONE) + (strokeWidth || NONE) + (fill || NONE);
            }


            groupId += opacity * 100 ^ 0;


            if (rotation = getValue('rotation', style, feature, level) ^ 0) {
                groupId += 'R' + rotation;
            }

            zIndex = getValue('zIndex', style, feature, level);

            zGrouped = groups[zIndex] = groups[zIndex] || [];
            index = zGrouped[groupId];

            // console.log(groups);

            if (index == UNDEF) {
                index = zGrouped[groupId] = zGrouped.length;
                group = zGrouped[index] = {
                    type: type,
                    shared: {
                        font: font,
                        fill: fillRGBA, // && fillRGBA.slice(0, 3),
                        opacity: opacity,
                        stroke: strokeRGBA, // && strokeRGBA.slice(0, 3),
                        strokeWidth: strokeWidth,
                        strokeLinecap: strokeLinecap,
                        strokeLinejoin: strokeLinejoin,
                        strokeDasharray: strokeDasharray,
                        width: width,
                        height: height,
                        radius: radius,
                        rotation: rotation,
                        offsetX: offsetX,
                        offsetY: offsetY
                    }
                    // ,index: []
                };
            } else {
                group = zGrouped[index];
            }

            if (geomType == 'Point') {
                if (type == 'Text') {
                    let glyphs = group.glyphs;

                    if (!glyphs) {
                        // console.time('create Glyph Tex');
                        glyphs = group.glyphs = new GlyphTexture(this.gl, style);
                        // console.timeEnd('create Glyph Tex');
                        // group.first = 0;
                        // group.data = new SymbolData(false);
                        group.buffer = new TextBuffer();
                    }

                    let groupBuffer = group.buffer;

                    let aPosition = groupBuffer.attributes.a_position;
                    // vertex = group.data.vertex;
                    vertex = aPosition.data;

                    const collision = style.collide;

                    addText(
                        text,
                        groupBuffer.attributes.a_point.data,
                        vertex,
                        groupBuffer.attributes.a_texcoord.data,
                        coordinates,
                        glyphs,
                        tile,
                        collision == UNDEF
                            ? true
                            : collision,
                        tileSize,
                        offsetX,
                        offsetY
                    );
                } else {
                    if (type == 'Icon') {
                        let src = getValue('src', style, feature, level);
                        let width = getValue('width', style, feature, level);
                        let height = getValue('height', style, feature, level) || width;

                        if (!group.buffer) {
                            group.buffer = new SymbolBuffer();
                        }
                        const groupBuffer = group.buffer;

                        let img = this.icons.get(src, width, height);

                        if (!img) {
                            allReady = false;
                            continue;
                        }

                        addIcon(
                            img,
                            width,
                            height,
                            groupBuffer.attributes.a_point.data,
                            groupBuffer.attributes.a_position.data,
                            groupBuffer.attributes.a_texcoord.data,
                            coordinates,
                            tile,
                            tileSize
                        );
                        group.texture = this.icons.getTexture();
                    } else if (type == 'Circle' || type == 'Rect') {
                        if (!group.buffer) {
                            group.buffer = new PointBuffer();
                        }

                        let groupBuffer = group.buffer;

                        if (!addPoint(groupBuffer.attributes.a_position.data, coordinates, tile, tileSize)) {
                            // in case of point has not been added because it's not inside tile
                            // -> we can skip it.
                            return allReady;
                        }
                    }
                }
            } else {
                if (geomType == 'LineString') {
                    if (type == 'Line') {
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
                            coordinates,
                            tile,
                            tileSize,
                            strokeLinecap,
                            strokeLinejoin,
                            strokeWidth,
                            strokeDasharray && groupBuffer.attributes.a_lengthSoFar.data
                        );
                    } else if (type == 'Circle' || type == 'Rect') {
                        if (!group.buffer) {
                            group.buffer = new PointBuffer();
                        }

                        const positionBuffer = group.buffer.attributes.a_position.data;

                        for (let coord of coordinates) {
                            addPoint(positionBuffer, coord, tile, tileSize);
                        }
                    } else if (type == 'Text') {
                        let {glyphs} = group;

                        if (!glyphs) {
                            // console.time('create Glyph Tex');
                            glyphs = group.glyphs = new GlyphTexture(this.gl, style);
                            // console.timeEnd('create Glyph Tex');
                            group.buffer = new TextBuffer();
                        }

                        const attributes = group.buffer.attributes;

                        addLineText(
                            text,
                            attributes.a_point.data,
                            attributes.a_position.data,
                            attributes.a_texcoord.data,
                            coordinates,
                            glyphs,
                            tile,
                            tileSize,
                            offsetX,
                            offsetY
                        );
                    }
                } else {
                    // Polygon geometry

                    if (type == 'Line') {
                        if (strokeDasharray) {
                            group.texture = this.dashes.get(strokeDasharray);
                        }

                        if (!group.buffer) {
                            group.buffer = new LineBuffer();
                        }

                        const groupBuffer = group.buffer;
                        const positionBuffer = groupBuffer.attributes.a_position.data;
                        const normalBuffer = groupBuffer.attributes.a_normal.data;
                        const dashBuffer = strokeDasharray && groupBuffer.attributes.a_lengthSoFar.data;

                        for (let ls of coordinates) {
                            addLineString(
                                positionBuffer,
                                normalBuffer,
                                ls,
                                tile,
                                tileSize,
                                strokeLinecap,
                                strokeLinejoin,
                                strokeWidth,
                                dashBuffer
                            );
                        }
                    } else {
                        if (!group.buffer) {
                            group.buffer = type == 'Polygon'
                                ? new PolygonBuffer()
                                : new ExtrudeBuffer();
                        }

                        const groupBuffer = group.buffer;
                        const index = groupBuffer.index();

                        vertex = groupBuffer.attributes.a_position.data;


                        if (type == 'Extrude') {
                            // if (!extrudeDataAdded) {
                            extrudeDataAdded = addExtrude(
                                vertex,
                                group.buffer.attributes.a_normal.data,
                                index,
                                coordinates,
                                tile,
                                tileSize,
                                extrude
                            );
                            flatPoly = extrudeDataAdded;
                            // }
                        } else if (type == 'Polygon') {
                            // if (!polygonDataAdded) {
                            polygonDataAdded = <FlatPolygon>addPolygon(vertex, coordinates, tile, tileSize);
                            flatPoly = polygonDataAdded;
                            // }
                        }

                        if (!triangles) {
                            triangles = feature.geometry._xyz ||
                                earcut(flatPoly.vertices, flatPoly.holes, flatPoly.dimensions);
                        }

                        for (let t = 0, s = flatPoly.start; t < triangles.length; t++) {
                            index.push(s + triangles[t]);
                        }
                    }
                }
            }
        }
        return allReady;
    }
}
