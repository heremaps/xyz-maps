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
import {addText, wrapText} from './addText';
import {addPoint} from './addPoint';
import {addPolygon, FlatPolygon} from './addPolygon';
import {addExtrude} from './addExtrude';
import {addIcon} from './addIcon';
import earcut from 'earcut';
import {getValue, parseSizeValue, StyleGroup} from '../../styleTools';
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
import {toPresentationFormB} from '../arabic';
import {Feature, GeoJSONCoordinate} from '@here/xyz-maps-core';


const DEFAULT_STROKE_WIDTH = 1;
const DEFAULT_LINE_CAP = 'round';
const DEFAULT_LINE_JOIN = 'round';
const NONE = '*';
let UNDEF;

const textRefCache = new Map();

const getTextString = (style, feature: Feature, level: number) => {
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

    create(
        feature: Feature,
        geomType: string,
        coordinates: GeoJSONCoordinate | GeoJSONCoordinate[] | GeoJSONCoordinate[][],
        styleGroups: StyleGroup,
        strokeWidthScale: number,
        removeTileBounds?: boolean,
        priority?: number
    ): boolean {
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
        let sizeUnit;
        let allReady = true;

        this.lineFactory.init(level, tileSize);

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
            sizeUnit = 'px';

            if (type == 'Icon') {
                offsetX = getValue('offsetX', style, feature, level) ^ 0;
                offsetY = getValue('offsetY', style, feature, level) ^ 0;

                alignment = getValue('alignment', style, feature, level) || 'viewport';

                groupId = 'I' + offsetX + offsetY;
            } else {
                stroke = getValue('stroke', style, feature, level);
                strokeWidth = getValue('strokeWidth', style, feature, level);

                if (type == 'Line') {
                    if (!stroke || !strokeWidth) continue;

                    const {value, unit} = parseSizeValue(strokeWidth);
                    strokeWidth = value;
                    sizeUnit = unit;

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

                    let offset = getValue('offset', style, feature, level);
                    offset = parseSizeValue(offset);
                    // store line offset/unit in shared offsetXY
                    offsetX = Math.round((offset.value || 0) * 10) / 10;
                    offsetY = offset.unit;

                    groupId = 'L' + sizeUnit + offsetX + offsetY + strokeLinecap + strokeLinejoin + (strokeDasharray || NONE);
                } else {
                    fill = getValue('fill', style, feature, level);

                    if (type == 'Polygon') {
                        if (!fill || geomType != 'Polygon' && geomType != 'MultiPolygon') {
                            continue;
                        }
                        extrude = getValue('extrude', style, feature, level);

                        if (extrude) {
                            groupId = 'E';
                            type = 'Extrude';
                        } else {
                            groupId = 'P';
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

                            text = toPresentationFormB(text);

                            font = getValue('font', style, feature, level) || defaultFont;

                            if (alignment == UNDEF) {
                                alignment = geomType == 'Point' ? 'viewport' : 'map';
                            }

                            groupId = 'T' + (font || NONE);
                        } else if (type == 'Circle') {
                            radius = getValue('radius', style, feature, level);
                            const {value, unit} = parseSizeValue(radius);
                            radius = value;
                            sizeUnit = unit;

                            groupId = 'C' + sizeUnit + radius || NONE;
                        } else if (type == 'Rect') {
                            width = getValue('width', style, feature, level);
                            const {value, unit} = parseSizeValue(width);
                            width = value;
                            sizeUnit = unit;
                            height = getValue('height', style, feature, level);
                            height = !height ? width : parseSizeValue(height).value;

                            groupId = 'R' + sizeUnit + width + height;
                        } else {
                            continue;
                        }

                        offsetX = getValue('offsetX', style, feature, level) ^ 0;
                        offsetY = getValue('offsetY', style, feature, level) ^ 0;

                        groupId += offsetX + offsetY;
                    }
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

                        if (strokeWidth < 0) {
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

            const zLayer = getValue('zLayer', style, feature, level);

            if (zLayer != undefined) {
                groupId = zLayer + ':' + groupId;
            }

            zGrouped = groups[zIndex] = groups[zIndex] || [];
            index = zGrouped[groupId];

            if (index == UNDEF) {
                index = zGrouped[groupId] = zGrouped.length;
                group = zGrouped[index] = {
                    type: type,
                    zLayer: zLayer,
                    shared: {
                        unit: sizeUnit,
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


                        texture = group.texture = /* window._glt = window._glt ||*/ new GlyphTexture(this.gl, group.shared);
                        // console.timeEnd('create Glyph Tex');
                        // group.first = 0;
                        // group.data = new SymbolData(false);
                        group.buffer = new TextBuffer();
                    }

                    const {attributes} = group.buffer;
                    const cx = tile.lon2x(coordinates[0], tileSize);
                    const cy = tile.lat2y(coordinates[1], tileSize);

                    texture.addChars(text);

                    const fontInfo = texture.getAtlas();
                    const lineWrap = getValue('lineWrap', style, feature, level);
                    const lines = wrapText(text, lineWrap);

                    let maxLineLength = 0;
                    for (let {length} of lines) {
                        if (length > maxLineLength) {
                            maxLineLength = length;
                        }
                    }

                    const estimatedTextWidth = fontInfo.avgCharWidth * (maxLineLength + 1);
                    const estimatedTextHeight = lines.length * fontInfo.letterHeight;

                    const bufferStart = attributes.a_texcoord.data.length;
                    const bufferLength = texture.bufferLength(text);

                    if (style.collide || this.collisions.insert(
                        cx + offsetX,
                        cy + offsetY,
                        estimatedTextWidth / 2,
                        estimatedTextHeight / 2,
                        tile, tileSize,
                        bufferStart, bufferStart + bufferLength,
                        attributes.a_texcoord,
                        priority
                    )) {
                        addText(
                            lines,
                            attributes.a_point.data,
                            attributes.a_position.data,
                            attributes.a_texcoord.data,
                            fontInfo,
                            cx,
                            cy,
                            lineWrap
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
                            attributes.a_size.data,
                            attributes.a_position.data,
                            attributes.a_texcoord.data,
                            <GeoJSONCoordinate>coordinates,
                            tile,
                            tileSize
                        );
                        group.texture = this.icons.getTexture();
                    } else if (type == 'Circle' || type == 'Rect') {
                        if (!group.buffer) {
                            group.buffer = new PointBuffer();
                        }

                        const groupBuffer = group.buffer;

                        if (!addPoint(groupBuffer.attributes.a_position.data, <GeoJSONCoordinate>coordinates, tile, tileSize)) {
                            // in case of point has not been added because it's not inside tile
                            // -> we can skip it.
                            return allReady;
                        }
                    }
                }
            } else if (geomType == 'LineString') {
                if (type == 'Line') {
                    this.lineFactory.createLine(
                        <GeoJSONCoordinate[]>coordinates,
                        group,
                        tile,
                        tileSize,
                        removeTileBounds,
                        strokeDasharray,
                        strokeLinecap,
                        strokeLinejoin,
                        strokeWidth,
                        offsetX,
                        getValue('from', style, feature, level),
                        getValue('to', style, feature, level)
                    );
                } else if (type == 'Circle' || type == 'Rect') {
                    if (!group.buffer) {
                        group.buffer = new PointBuffer();
                    }

                    const positionBuffer = group.buffer.attributes.a_position.data;

                    for (let coord of <GeoJSONCoordinate[]>coordinates) {
                        addPoint(positionBuffer, coord, tile, tileSize);
                    }
                } else if (type == 'Text') {
                    this.lineFactory.createText(
                        text,
                        <GeoJSONCoordinate[]>coordinates,
                        group,
                        tile,
                        tileSize,
                        !style.collide && this.collisions,
                        priority,
                        getValue('repeat', style, feature, level),
                        offsetX,
                        offsetY,
                        group.shared
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
                            <GeoJSONCoordinate[][]>coordinates,
                            tile,
                            tileSize,
                            extrude
                        );
                    } else if (type == 'Polygon') {
                        flatPoly = addPolygon(aPosition, <GeoJSONCoordinate[][]>coordinates, tile, tileSize);
                    }

                    if (!triangles) {
                        const geom = <any>feature.geometry;

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
