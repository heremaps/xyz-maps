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
import {addPoint} from './addPoint';
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
import {CollisionHandler} from '../CollisionHandler';
import {LineFactory} from './LineFactory';

import {TextBuffer} from './templates/TextBuffer';
import {SymbolBuffer} from './templates/SymbolBuffer';
import {PointBuffer} from './templates/PointBuffer';
import {PolygonBuffer} from './templates/PolygonBuffer';
import {ExtrudeBuffer} from './templates/ExtrudeBuffer';

const DEFAULT_STROKE_WIDTH = 1;
const DEFAULT_LINE_CAP = 'round';
const DEFAULT_LINE_JOIN = 'round';
const NONE = '*';
let UNDEF;

type BBox = [number, number, number, number];

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

    collisions: CollisionHandler;
    private tile: any;
    private groups: any;
    private tileSize: number;
    z: number;
    private lineFactory: LineFactory;

    pendingCollisions: { feature: any, style: any, priority: number, geomType: string, coordinates: any }[] = [];


    constructor(gl: WebGLRenderingContext, iconManager: IconManager, collisionHandler, devicePixelRatio: number) {
        this.gl = gl;
        this.icons = iconManager;
        this.dpr = devicePixelRatio;
        this.dashes = new DashAtlas(gl);
        this.collisions = collisionHandler;
        this.lineFactory = new LineFactory(gl);
    }

    init(tile, groups, tileSize: number, zoom: number) {
        this.tile = tile;
        this.groups = groups;
        this.tileSize = tileSize;
        this.z = zoom;

        this.pendingCollisions.length = 0;
    }

    create(feature, geomType: string, coordinates, styleGroups, strokeWidthScale, removeTileBounds?: boolean, priority?: number): boolean {
        const {tile, groups, tileSize} = this;
        const level = this.z;
        let flatPolyStart: number;
        let flatPoly: FlatPolygon[];
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
        let alignment;
        let allReady = true;

        this.lineFactory.init();

        for (let i = 0, iLen = styleGroups.length; i < iLen; i++) {
            style = styleGroups[i];

            type = getValue('type', style, feature, level);

            if (!type) continue;

            opacity = getValue('opacity', style, feature, level);

            if (opacity === 0) continue;


            if (priority == UNDEF && type == 'Text' && !style.collide) {
                this.pendingCollisions.push({
                    feature: feature,
                    style: style,
                    geomType: geomType,
                    coordinates: coordinates,
                    priority: getValue('priority', style, feature, level) || Number.MAX_SAFE_INTEGER
                });
                continue;
            }

            if (opacity == UNDEF ||
                opacity >= .98 // no alpha visible -> no need to use more expensive alpha pass
            ) {
                opacity = 1;
            }

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
            offsetX = 0;
            offsetY = 0;
            text = UNDEF;
            alignment = UNDEF;
            strokeScale = strokeWidthScale;


            if (type == 'Icon') {
                offsetX = getValue('offsetX', style, feature, level) ^ 0;
                offsetY = getValue('offsetY', style, feature, level) ^ 0;

                alignment = getValue('alignment', style, feature, level) || 'viewport';

                groupId = 'I' + offsetX + offsetY;
            } else {
                fill = getValue('fill', style, feature, level);
                stroke = getValue('stroke', style, feature, level);
                strokeWidth = getValue('strokeWidth', style, feature, level);

                if (type == 'Line') {
                    if (!stroke || !strokeWidth) continue;

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
                    if (!fill || geomType != 'Polygon' && geomType != 'MultiPolygon') {
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

                    alignment = getValue('alignment', style, feature, level);

                    if (type == 'Text') {
                        text = getTextString(style, feature, level);

                        if (!text) {
                            continue;
                        }

                        font = getValue('font', style, feature, level) || defaultFont;

                        if (alignment == UNDEF) {
                            alignment = geomType == 'Point' ? 'viewport' : 'map';
                        }

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
                    if (fillRGBA) {
                        fillRGBA[3] *= opacity;
                    } else {
                        fill = null;
                    }
                }

                if (stroke) {
                    strokeRGBA = toRGB(stroke);
                    if (strokeRGBA) {
                        strokeRGBA[3] *= opacity;
                    } else {
                        stroke = null;
                    }

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
                        offsetY: offsetY,
                        alignment: alignment
                    }
                    // ,index: []
                };
            } else {
                group = zGrouped[index];
            }

            if (geomType == 'Point') {
                if (type == 'Text') {
                    if (!tile.isInside(coordinates)) continue;

                    let {texture} = group;

                    if (!texture) {
                        // console.time('create Glyph Tex');
                        texture = group.texture = new GlyphTexture(this.gl, group.shared);
                        // console.timeEnd('create Glyph Tex');
                        // group.first = 0;
                        // group.data = new SymbolData(false);
                        group.buffer = new TextBuffer();
                    }

                    const {attributes} = group.buffer;
                    const {dpr} = this;
                    const cx = tile.lon2x(coordinates[0], tileSize);
                    const cy = tile.lat2y(coordinates[1], tileSize);

                    texture.addChars(text);

                    const fontInfo = texture.getAtlas();
                    const estimatedTextWidth = fontInfo.avgCharWidth * text.length / 2;
                    const ty = fontInfo.baselineOffset - offsetY;
                    // collides(cx,cy,width,height,tile, tileSize, fontInfo, bufferIndex: number) {
                    const bufferStart = attributes.a_point.data.length;
                    let glyphCnt = 0;
                    for (let c of text) {
                        if (c != ' ') glyphCnt++;
                    }

                    if (style.collide || !this.collisions.collides(
                        cx, cy,
                        estimatedTextWidth, ty,
                        tile, tileSize,
                        bufferStart, bufferStart + glyphCnt * 6 * 3,
                        attributes.a_point,
                        priority
                    )) {
                        addText(
                            text,
                            attributes.a_point.data,
                            attributes.a_position.data,
                            attributes.a_texcoord.data,
                            fontInfo,
                            cx,
                            cy,
                            offsetX * dpr,
                            offsetY * dpr
                        );
                    }
                } else {
                    if (type == 'Icon') {
                        if (!group.buffer) {
                            group.buffer = new SymbolBuffer();
                        }

                        const src = getValue('src', style, feature, level);
                        const width = getValue('width', style, feature, level);
                        const height = getValue('height', style, feature, level) || width;
                        const groupBuffer = group.buffer;
                        const {attributes} = groupBuffer;
                        const img = this.icons.get(src, width, height);

                        if (!img) {
                            allReady = false;
                            continue;
                        }

                        addIcon(
                            img,
                            width,
                            height,
                            attributes.a_point.data,
                            attributes.a_position.data,
                            attributes.a_texcoord.data,
                            coordinates,
                            tile,
                            tileSize
                        );
                        group.texture = this.icons.getTexture();
                    } else if (type == 'Circle' || type == 'Rect') {
                        if (!group.buffer) {
                            group.buffer = new PointBuffer();
                        }

                        const groupBuffer = group.buffer;

                        if (!addPoint(groupBuffer.attributes.a_position.data, coordinates, tile, tileSize)) {
                            // in case of point has not been added because it's not inside tile
                            // -> we can skip it.
                            return allReady;
                        }
                    }
                }
            } else if (geomType == 'LineString') {
                if (type == 'Line') {
                    this.lineFactory.createLine(
                        coordinates,
                        group,
                        tile,
                        tileSize,
                        removeTileBounds,
                        strokeDasharray,
                        strokeLinecap,
                        strokeLinejoin,
                        strokeWidth
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
                    this.lineFactory.createText(
                        text,
                        coordinates,
                        group,
                        tile,
                        tileSize,
                        !style.collide && this.collisions,
                        priority,
                        getValue('repeat', style, feature, level),
                        offsetX,
                        offsetY,
                        style
                    );
                }
            } else {
                // Polygon geometry
                if (type == 'Polygon' || type == 'Extrude') {
                    if (!group.buffer) {
                        group.buffer = type == 'Polygon'
                            ? new PolygonBuffer()
                            : new ExtrudeBuffer();
                    }

                    const groupBuffer = group.buffer;
                    const vIndex = groupBuffer.index();
                    const {attributes} = groupBuffer;
                    const aPosition = attributes.a_position.data;

                    flatPolyStart = aPosition.length;

                    if (type == 'Extrude') {
                        flatPoly = addExtrude(
                            aPosition,
                            attributes.a_normal.data,
                            vIndex,
                            coordinates,
                            tile,
                            tileSize,
                            extrude
                        );
                    } else if (type == 'Polygon') {
                        flatPoly = addPolygon(aPosition, coordinates, tile, tileSize);
                    }

                    if (!triangles) {
                        const geom = feature.geometry;

                        if (geom._xyz) {
                            triangles = geom._xyz;
                        } else {
                            triangles = [];

                            for (let flat of flatPoly) {
                                let d = flat.dimensions;
                                let coords = aPosition.data.subarray(flat.start, flat.stop);
                                let tri = earcut(coords, flat.holes, d);
                                let i = (flat.start - flatPolyStart) / d;

                                for (let t of tri) {
                                    triangles.push(i + t);
                                }
                            }

                            if (!tile.clipped) {
                                // cache for reuse
                                geom._xyz = triangles;
                            }
                        }
                    }

                    for (let t = 0, s = flatPolyStart / flatPoly[0].dimensions, i; t < triangles.length; t++) {
                        i = s + triangles[t];
                        groupBuffer.i32 = groupBuffer.i32 || i > 0xffff;
                        vIndex.push(i);
                    }
                }
            }
        }
        return allReady;
    }
}
