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
import {addText} from './addText';
import {addPoint} from './addPoint';
import {addPolygon, FlatPolygon} from './addPolygon';
import {addExtrude} from './addExtrude';
import {addIcon} from './addIcon';
import earcut from 'earcut';
import {getBBox, getTextString, getValue, parseSizeValue, Style, StyleGroup} from '../../styleTools';
import {defaultFont, wrapText} from '../../textUtils';
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

export type CollisionCandidate = {
    feature: Feature,
    styleGrp: Style,
    priority: number,
    geomType: string,
    coordinates: any,
    offsetX: number;
    offsetY: number;
    width: number;
    height: number;
};

export class FeatureFactory {
    private readonly gl: WebGLRenderingContext;
    private icons: IconManager;
    private dpr: number;

    private dashes: DashAtlas;

    collisions: CollisionHandler;
    private tile: any;
    private groups: any;
    private tileSize: number;
    z: number;
    private lineFactory: LineFactory;

    pendingCollisions: CollisionCandidate[] = [];

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
        priority?: number,
        collisionData?: any
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
        let offsetUnit;
        let allReady = true;

        this.lineFactory.init(level, tileSize);

        let collisionPriority = Number.MAX_SAFE_INTEGER;
        let collisionStyleGroup;
        let collisionBox;

        for (let i = 0, iLen = styleGroups.length; i < iLen; i++) {
            style = styleGroups[i];

            type = getValue('type', style, feature, level);

            if (!type) continue;

            opacity = getValue('opacity', style, feature, level);

            if (opacity === 0) continue;

            if (
                priority == UNDEF && (
                    (type == 'Text' && !style.collide) ||
                (geomType == 'Point' && style.collide === false))
            ) {
                let priority = getValue('priority', style, feature, level);

                collisionBox = getBBox(style, feature, level, collisionBox);

                collisionStyleGroup = collisionStyleGroup || [];
                collisionStyleGroup.push(style);

                if (priority < collisionPriority) {
                    collisionPriority = priority;
                }
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
            width = UNDEF;
            height = UNDEF;
            offsetX = 0;
            offsetY = 0;
            text = UNDEF;
            alignment = UNDEF;
            strokeScale = strokeWidthScale;
            sizeUnit = 'px';
            offsetUnit = UNDEF;

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

                    const [value, unit] = parseSizeValue(strokeWidth);
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

                    const offset = getValue('offset', style, feature, level);
                    // store line offset/unit in shared offsetXY
                    [offsetX, offsetUnit] = parseSizeValue(offset);

                    groupId = 'L' + sizeUnit + offsetX + offsetUnit + strokeLinecap + strokeLinejoin + (strokeDasharray || NONE);
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
                            width = height = getValue('radius', style, feature, level);
                            [width, sizeUnit] = parseSizeValue(width);

                            groupId = 'C' + sizeUnit + width || NONE;
                        } else if (type == 'Rect') {
                            width = getValue('width', style, feature, level);
                            [width, sizeUnit] = parseSizeValue(width);

                            height = getValue('height', style, feature, level);
                            height = !height ? width : parseSizeValue(height)[0];

                            groupId = 'R' + sizeUnit + width + height;
                        } else {
                            continue;
                        }

                        offsetX = getValue('offsetX', style, feature, level);
                        offsetY = getValue('offsetY', style, feature, level);

                        offsetUnit = new Array(2);

                        [offsetX, offsetUnit[0]] = parseSizeValue(offsetX);
                        [offsetY, offsetUnit[1]] = parseSizeValue(offsetY);

                        groupId += offsetX + offsetUnit[0] + offsetY + offsetUnit[1];
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
                        rotation: rotation,
                        offsetX: offsetX,
                        offsetY: offsetY,
                        offsetUnit: offsetUnit,
                        alignment: alignment
                    }
                    // ,index: []
                };
            } else {
                group = zGrouped[index];
            }

            if (geomType == 'Point') {
                let positionBuffer;
                let collisionBufferStart;
                let collisionBufferStop;

                // collision detection already tested if the coordinates are inside the tile.
                if (!collisionData && !tile.isInside(coordinates)) {
                    continue;
                }

                if (type == 'Text') {
                    let {texture} = group;

                    if (!texture) {
                        texture =
                            group.texture = new GlyphTexture(this.gl, group.shared);
                        group.buffer = new TextBuffer();
                    }

                    const {attributes} = group.buffer;
                    const cx = tile.lon2x(coordinates[0], tileSize);
                    const cy = tile.lat2y(coordinates[1], tileSize);

                    texture.addChars(text);

                    const fontInfo = texture.getAtlas();
                    const lineWrap = getValue('lineWrap', style, feature, level);
                    const lines = wrapText(text, lineWrap);

                    positionBuffer = attributes.a_texcoord;
                    collisionBufferStart = attributes.a_texcoord.data.length;
                    collisionBufferStop = collisionBufferStart + texture.bufferLength(text);

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
                } else {
                    if (type == 'Icon') {
                        if (!group.buffer) {
                            group.buffer = new SymbolBuffer();
                        }
                        positionBuffer = group.buffer.attributes.a_position;
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
                            positionBuffer.data,
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
                        positionBuffer = group.buffer.attributes.a_position;

                        addPoint(positionBuffer.data, <GeoJSONCoordinate>coordinates, tile, tileSize);
                    } else {
                        continue;
                    }

                    collisionBufferStop = positionBuffer.data.length;
                    collisionBufferStart = collisionBufferStop - 12;
                }

                if (collisionData && positionBuffer) {
                    collisionData.attrs.push({
                        buffer: positionBuffer,
                        start: collisionBufferStart,
                        stop: collisionBufferStop
                    });
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
                        if (tile.isInside(coord)) {
                            addPoint(positionBuffer, coord, tile, tileSize);
                        }
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
                } else if (type == 'Icon') {
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
                    for (let coord of <GeoJSONCoordinate[]>coordinates) {
                        if (tile.isInside(coord)) {
                            addIcon(img,
                                width, height,
                                attributes.a_size.data,
                                attributes.a_position.data,
                                attributes.a_texcoord.data,
                                coord,
                                tile, tileSize
                            );
                        }
                    }
                    group.texture = this.icons.getTexture();
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

        if (collisionBox && collisionBox[0] != Infinity) {
            const [x1, y1, x2, y2] = collisionBox;
            const halfWidth = (x2 - x1) * .5;
            const halfHeight = (y2 - y1) * .5;

            this.pendingCollisions.push({
                offsetX: x1 + halfWidth,
                offsetY: y1 + halfHeight,
                width: halfWidth,
                height: halfHeight,
                styleGrp: collisionStyleGroup,
                feature,
                geomType,
                coordinates,
                priority: collisionPriority
            });
        }

        return allReady;
    }
}
