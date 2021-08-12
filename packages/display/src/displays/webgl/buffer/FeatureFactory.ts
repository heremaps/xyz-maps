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
import {calcBBox, getTextString, getValue, parseSizeValue, Style, StyleGroup} from '../../styleTools';
import {defaultFont, wrapText} from '../../textUtils';
import {GlyphTexture} from '../GlyphTexture';
import {toRGB} from '../color';
import {IconManager} from '../IconManager';
import {DashAtlas} from '../DashAtlas';
import {CollisionData, CollisionHandler} from '../CollisionHandler';
import {LineFactory} from './LineFactory';

import {TextBuffer} from './templates/TextBuffer';
import {SymbolBuffer} from './templates/SymbolBuffer';
import {PointBuffer} from './templates/PointBuffer';
import {PolygonBuffer} from './templates/PolygonBuffer';
import {ExtrudeBuffer} from './templates/ExtrudeBuffer';
import {toPresentationFormB} from '../arabic';
import {Feature, GeoJSONCoordinate as Coordinate, GeoJSONCoordinate} from '@here/xyz-maps-core';
import {Texture} from '../Texture';
import {TemplateBuffer} from './templates/TemplateBuffer';


const DEFAULT_STROKE_WIDTH = 1;
const DEFAULT_LINE_CAP = 'round';
const DEFAULT_LINE_JOIN = 'round';
const NONE = '*';
let UNDEF;

export type CollisionGroup = {
    id: string,
    feature: Feature,
    styleGrp: Style,
    priority: number,
    repeat: number,
    geomType: string,
    coordinates: any,
    offsetX?: number;
    offsetY?: number;
    width?: number;
    height?: number;
};

type DrawGroup = {
    type: string
    zLayer: number
    shared: {
        unit: string,
        font: string,
        fill: Float32Array,
        opacity: number,
        stroke: Float32Array,
        strokeWidth: number,
        strokeLinecap: string,
        strokeLinejoin: string,
        strokeDasharray: number[],
        width: number,
        height: number,
        rotation: number,
        offsetX: number,
        offsetY: number,
        offsetUnit: string,
        alignment: string
    }
    texture?: Texture,
    buffer?: TemplateBuffer,
    extrudeStrokeIndex?: number []
};

type ZDrawGroup = {
    index: { [grpId: string]: number },
    groups: DrawGroup[]
}

export type GroupMap = { [zIndex: string]: ZDrawGroup };


export class FeatureFactory {
    private readonly gl: WebGLRenderingContext;
    private icons: IconManager;
    private dpr: number;
    private dashes: DashAtlas;
    private tile: any;
    private groups: GroupMap;
    private tileSize: number;
    private lineFactory: LineFactory;
    private iconsLoaded: boolean;

    collisions: CollisionHandler;
    pendingCollisions: CollisionGroup[] = [];
    z: number;

    constructor(gl: WebGLRenderingContext, iconManager: IconManager, collisionHandler, devicePixelRatio: number) {
        this.gl = gl;
        this.icons = iconManager;
        this.dpr = devicePixelRatio;
        this.dashes = new DashAtlas(gl);
        this.collisions = collisionHandler;
        this.lineFactory = new LineFactory(gl);
    }

    init(tile, groups: GroupMap, tileSize: number, zoom: number) {
        this.tile = tile;
        this.groups = groups;
        this.tileSize = tileSize;
        this.z = zoom;
        this.lineFactory.initTile();
        this.pendingCollisions.length = 0;
    }


    createPoint(
        type: string,
        group,
        x: number,
        y: number,
        style: Style,
        feature: Feature,
        collisionData: CollisionData,
        alpha: number = 0,
        text?: string,
        defaultLineWrap?: number | boolean
    ) {
        const level = this.z;
        let positionBuffer;
        let collisionBufferStart;
        let collisionBufferStop;

        // make sure rotation is 0->360 deg
        alpha = (alpha + 360) % 360;

        if (type == 'Text') {
            if (!group.texture) {
                group.texture = new GlyphTexture(this.gl, group.shared);
                group.buffer = new TextBuffer();
            }
            const {texture} = group;
            const {attributes} = group.buffer;

            texture.addChars(text);

            const fontInfo = texture.getAtlas();
            let lineWrap = getValue('lineWrap', style, feature, level);

            if (lineWrap == UNDEF) {
                lineWrap = defaultLineWrap;
            }
            const lines = wrapText(text, lineWrap);

            positionBuffer = attributes.a_position;
            collisionBufferStart = attributes.a_texcoord.data.length;
            collisionBufferStop = collisionBufferStart + texture.bufferLength(text);

            addText(
                x, y,
                lines,
                attributes.a_point.data,
                attributes.a_position.data,
                attributes.a_texcoord.data,
                fontInfo,
                alpha
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
                    this.iconsLoaded = false;
                    return;
                }

                addIcon(
                    x, y,
                    img,
                    width, height,
                    attributes.a_size.data,
                    positionBuffer.data,
                    attributes.a_texcoord.data,
                    alpha
                );
                group.texture = this.icons.getTexture();
            } else if (type == 'Circle' || type == 'Rect') {
                if (!group.buffer) {
                    group.buffer = new PointBuffer();
                }
                positionBuffer = group.buffer.attributes.a_position;

                addPoint(x, y, positionBuffer.data);
            } else {
                // unknown style-type
                return;
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
    }


    create(
        feature: Feature,
        geomType: string,
        coordinates: GeoJSONCoordinate | GeoJSONCoordinate[] | GeoJSONCoordinate[][],
        styleGroups: StyleGroup,
        strokeWidthScale: number,
        removeTileBounds?: boolean,
        priority?: number,
        collisionGroup?: CollisionGroup
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
        let extrudeBase;
        let width;
        let height;
        let zGrouped: ZDrawGroup;
        let groupId;
        let group: DrawGroup;
        let index;
        let offsetX;
        let offsetY;
        let text;
        let strokeScale;
        let alignment;
        let sizeUnit;
        let offsetUnit;
        let collisionPriority = Number.MAX_SAFE_INTEGER;
        let collisionRepeat = -Number.MAX_SAFE_INTEGER;
        let collisionStyleGroup;
        let collisionGroupId = '';
        let collisionBox;

        this.iconsLoaded = true;

        this.lineFactory.initFeature(level, tileSize, collisionGroup?.id);

        if (priority === UNDEF && geomType === 'Point' && !tile.isInside(coordinates)) {
            return this.iconsLoaded;
        }

        for (let i = 0, iLen = styleGroups.length; i < iLen; i++) {
            style = styleGroups[i];

            type = getValue('type', style, feature, level);

            if (!type) continue;

            opacity = getValue('opacity', style, feature, level);

            if (opacity === 0) continue;

            let collide = geomType == 'Polygon'
                ? true // no collision detection support for polygons
                : getValue('collide', style, feature, level);

            if (
                priority == UNDEF && (
                    type == 'Text' && !collide ||
                    collide === false
                )) {
                let bbox = calcBBox(style, feature, level, this.dpr, collisionBox);

                if (bbox) {
                    collisionBox = bbox || collisionBox;
                    collisionStyleGroup = collisionStyleGroup || [];
                    collisionStyleGroup.push(style);

                    const priority = getValue('priority', style, feature, level);

                    if (priority < collisionPriority) {
                        collisionPriority = priority;
                    }

                    const repeat = getValue('repeat', style, feature, level);

                    if (repeat > collisionRepeat) {
                        collisionRepeat = repeat;
                    }
                    collisionGroupId += type + (priority || '?') + (repeat || '?');
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

            rotation = getValue('rotation', style, feature, level) ^ 0;

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
                        if (!fill || geomType != 'Polygon') {
                            continue;
                        }
                        extrude = getValue('extrude', style, feature, level);
                        extrudeBase = getValue('extrudeBase', style, feature, level);

                        if (typeof extrude == 'number' || extrudeBase) {
                            groupId = 'E';
                            type = 'Extrude';
                        } else {
                            groupId = 'P';
                        }
                    } else {
                        if (geomType == 'Polygon') {
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

                            groupId = 'R' + rotation + sizeUnit + width + height;
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

            zIndex = getValue('zIndex', style, feature, level);

            const zLayer = getValue('zLayer', style, feature, level);

            if (zLayer != undefined) {
                groupId = zLayer + ':' + groupId;
            }

            zGrouped = groups[zIndex] = groups[zIndex] || {index: {}, groups: []};
            index = zGrouped.index[groupId];

            if (index == UNDEF) {
                index = zGrouped.index[groupId] = zGrouped.groups.length;
                group = zGrouped.groups[index] = {
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
                group = zGrouped.groups[index];
            }

            if (geomType == 'Point') {
                const x = tile.lon2x(coordinates[0], tileSize);
                const y = tile.lat2y(coordinates[1], tileSize);
                let collisionData;

                if (collisionGroup) {
                    collisionData = this.collisions.insert(
                        x, y,
                        collisionGroup.offsetX,
                        collisionGroup.offsetY,
                        collisionGroup.width,
                        collisionGroup.height,
                        tile, tileSize,
                        collisionGroup.priority
                    );

                    if (!collisionData) {
                        return this.iconsLoaded;
                    }
                    // make sure collision is not check for following styles of stylegroup
                    collisionGroup = null;
                }
                this.createPoint(type, group, x, y, style, feature, collisionData, rotation, text);
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
                } else {
                    let anchor = getValue('anchor', style, feature, level);
                    if (anchor == UNDEF) {
                        anchor = type == 'Text' ? 'Line' : 'Coordinate';
                    }

                    const checkCollisions = type == 'Text'
                        ? !collide
                        : collide === false;

                    let w;
                    let h;

                    if (anchor == 'Line') {
                        const applyRotation = alignment == 'map';

                        if (collisionGroup) {
                            w = collisionGroup.width * 2;
                            h = collisionGroup.height * 2;
                        } else if (type == 'Icon') {
                            w = getValue('width', style, feature, level);
                            h = getValue('height', style, feature, level) || width;
                        } else if (type == 'Text') {
                            let {texture} = group;
                            if (!texture) {
                                texture = group.texture = new GlyphTexture(this.gl, style);
                                group.buffer = new TextBuffer();
                            }
                            const glyphAtlas = (<GlyphTexture>texture).getAtlas();
                            w = glyphAtlas.getTextWidth(text);
                            h = glyphAtlas.letterHeight;
                        } else {
                            w = width;
                            h = height;
                            if (type == 'Circle') {
                                w *= 2;
                                h *= 2;
                            }
                        }

                        let checkLineSpace = getValue('checkLineSpace', style, feature, level);

                        if (checkLineSpace == UNDEF) {
                            // checkLineSpace is active by default
                            checkLineSpace = true;
                        }

                        this.lineFactory.placeAtSegments(
                            <GeoJSONCoordinate[]>coordinates,
                            tile, tileSize,
                            checkCollisions && this.collisions,
                            priority,
                            getValue('repeat', style, feature, level),
                            offsetX, offsetY,
                            w, h,
                            applyRotation,
                            checkLineSpace,
                            (x, y, alpha, collisionData) => {
                                this.createPoint(type, group, x, y, style, feature, collisionData, alpha + rotation, text, false);
                            }
                        );
                    } else {
                        if (collisionGroup) {
                            w = collisionGroup.width;
                            h = collisionGroup.height;
                        } else {
                            w = width / 2;
                            h = height / 2;
                        }

                        this.lineFactory.placeAtPoints(
                            <GeoJSONCoordinate[]>coordinates,
                            tile, tileSize,
                            checkCollisions && this.collisions,
                            priority,
                            w, h,
                            offsetX, offsetY,
                            (x, y, alpha, collisionData) => {
                                this.createPoint(type, group, x, y, style, feature, collisionData, alpha + rotation, text);
                            }
                        );
                    }
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
                        let strokeIndex;

                        if (stroke) {
                            strokeIndex = group.extrudeStrokeIndex = group.extrudeStrokeIndex || [];
                        }

                        flatPoly = addExtrude(
                            aPosition,
                            attributes.a_normal.data,
                            vIndex,
                            <GeoJSONCoordinate[][]>coordinates,
                            tile,
                            tileSize,
                            extrude,
                            extrudeBase,
                            strokeIndex
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

        if (collisionStyleGroup) {
            const id = collisionGroupId;
            let cData: CollisionGroup = {
                id,
                priority: collisionPriority,
                repeat: collisionRepeat,
                styleGrp: collisionStyleGroup,
                feature,
                geomType,
                coordinates
            };


            const [x1, y1, x2, y2] = collisionBox;
            const halfWidth = (x2 - x1) * .5;
            const halfHeight = (y2 - y1) * .5;

            cData.offsetX = x1 + halfWidth;
            cData.offsetY = y1 + halfHeight;
            cData.width = halfWidth;
            cData.height = halfHeight;

            this.pendingCollisions.push(cData);
        }

        return this.iconsLoaded;
    }
}

