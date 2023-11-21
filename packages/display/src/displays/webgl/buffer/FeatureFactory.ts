/*
 * Copyright (C) 2019-2023 HERE Europe B.V.
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
import {FontStyle, GlyphTexture} from '../GlyphTexture';
import {toRGB} from '../color';
import {DashAtlas} from '../DashAtlas';
import {BBox, CollisionData, CollisionHandler} from '../CollisionHandler';
import {LineFactory} from './LineFactory';

import {TextBuffer} from './templates/TextBuffer';
import {SymbolBuffer} from './templates/SymbolBuffer';
import {PointBuffer} from './templates/PointBuffer';
import {PolygonBuffer} from './templates/PolygonBuffer';
import {ExtrudeBuffer} from './templates/ExtrudeBuffer';
import {toPresentationFormB} from '../arabic';
import {Tile, Feature, GeoJSONCoordinate, TextStyle, ImageStyle} from '@here/xyz-maps-core';
import {TemplateBuffer} from './templates/TemplateBuffer';
import {addVerticalLine} from './addVerticalLine';
import {BoxBuffer} from './templates/BoxBuffer';
import {addBox} from './addBox';
import {addSphere} from './addSphere';
import {SphereBuffer} from './templates/SphereBuffer';
import {TemplateBufferBucket} from './templates/TemplateBufferBucket';
import {ModelStyle} from '@here/xyz-maps-core';
import {ModelFactory} from './ModelFactory';
import {ModelBuffer} from './templates/ModelBuffer';
import {ImageInfo} from '../Atlas';
import {GradientFactory} from '../GradientFactory';
import {HeatmapBuffer} from './templates/HeatmapBuffer';
import {TextureAtlasManager} from '../TextureAtlasManager';
import {LineBuffer} from './templates/LineBuffer';

const DEFAULT_STROKE_WIDTH = 1;
const DEFAULT_LINE_CAP = 'round';
const DEFAULT_LINE_JOIN = 'round';
const DEFAULT_COLLISION_GRP = '0';
const NONE = '*';
let UNDEF;

export type CollisionGroup = {
    id: string;
    styleGrp: Style[];
    priority: number;
    repeat: number;
    bbox: number[];

    feature?: Feature;
    geomType?: string;
    coordinates?: any;

    offsetX?: number;
    offsetY?: number;
    width?: number;
    height?: number;
};

type DrawGroup = {
    type: string;
    zLayer: number;
    depthTest: boolean;
    shared: {
        unit: string;
        font: string;
        fill: Float32Array;
        // fill: Float32Array|LinearGradient;
        opacity: number;
        stroke: Float32Array;
        strokeWidth: number;
        strokeLinecap: string;
        strokeLinejoin: string;
        strokeDasharray: {pattern:number[], units:string[]};
        strokeDashimage: string;
        width: number;
        height: number;
        depth: number;
        rotation: number;
        offsetX: number;
        offsetY: number;
        offsetZ: number;
        offsetUnit: string;
        alignment: string;
        modelMode: number;
        scaleByAltitude: boolean;
    };
    buffer?: TemplateBuffer | TemplateBufferBucket<ModelBuffer>;
    extrudeStrokeIndex?: number[];
    pointerEvents?: boolean;
};

type ZDrawGroup = {
    index: { [grpId: string]: number };
    groups: DrawGroup[];
};

export type GroupMap = { [zIndex: string]: ZDrawGroup };

export class FeatureFactory {
    private readonly gl: WebGLRenderingContext;
    private atlasManager: TextureAtlasManager;
    private dpr: number;
    private dashes: DashAtlas;
    private tile: Tile;
    private groups: GroupMap;
    private tileSize: number;
    private lineFactory: LineFactory;
    private modelFactory: ModelFactory;
    collisions: CollisionHandler;
    pendingCollisions: CollisionGroup[] = [];
    z: number;
    private waitAndRefresh: (p: Promise<any>) => void;
    gradients: GradientFactory;

    constructor(gl: WebGLRenderingContext, collisionHandler, devicePixelRatio: number) {
        this.gl = gl;
        this.atlasManager = new TextureAtlasManager(gl);
        this.dpr = devicePixelRatio;
        this.dashes = new DashAtlas(gl);
        this.collisions = collisionHandler;
        this.lineFactory = new LineFactory(gl);
        this.modelFactory = new ModelFactory(gl);

        this.gradients = new GradientFactory(gl, 256, 1);

        var pixels = new Uint8Array(512 * 512 * 4);

        for (let i = 0; i < 512 * 512; i++) {
            pixels[i * 4] = 255;
            pixels[i * 4 + 1] = 0;
            pixels[i * 4 + 2] = 0;
            pixels[i * 4 + 3] = 255;
        }
    }

    init(tile, groups: GroupMap, tileSize: number, zoom: number, waitAndRefresh: (p: Promise<any>) => void) {
        this.tile = tile;
        this.groups = groups;
        this.tileSize = tileSize;
        this.z = zoom;
        this.lineFactory.initTile();
        this.pendingCollisions.length = 0;
        this.waitAndRefresh = waitAndRefresh;
    }

    createPoint(
        type: string,
        group: DrawGroup,
        x: number,
        y: number,
        z: number | null,
        style: Style,
        feature: Feature,
        collisionData: CollisionData,
        rotationZ: number = 0,
        rotationY: number | undefined,
        text?: string,
        defaultLineWrap?: number | boolean,
        textAnchor?: TextStyle['textAnchor']
    ) {
        const isFlat = z === null;
        const level = this.z;
        let positionBuffer;
        let collisionBufferStart;
        let collisionBufferStop;

        // make sure rotation is 0->360 deg
        rotationZ = (rotationZ + 360) % 360;

        if (type == 'Text') {
            if (!group.buffer) {
                group.buffer = new TextBuffer(isFlat, rotationY != UNDEF);
                group.buffer.addUniform('u_texture', new GlyphTexture(this.gl, group.shared));
            }
            // if (!group.texture) {
            //     group.texture = new GlyphTexture(this.gl, group.shared);
            //     group.buffer = new TextBuffer(isFlat, rotationY != undefined);
            // }
            // const texture = <GlyphTexture>group.texture;
            const texture = (<TextBuffer>group.buffer).uniforms.u_texture as GlyphTexture;
            const {flexAttributes} = group.buffer as TextBuffer;

            texture.addChars(text);

            const fontInfo = texture.getAtlas();
            let lineWrap = getValue('lineWrap', style, feature, level) ?? defaultLineWrap;

            const lines = wrapText(text, lineWrap);

            positionBuffer = flexAttributes.a_position;
            collisionBufferStart = positionBuffer.data.length;
            collisionBufferStop = collisionBufferStart + texture.bufferLength(text, isFlat ? 2 : 3);

            addText(
                x,
                y,
                z,
                lines,
                flexAttributes.a_point.data,
                flexAttributes.a_position.data,
                flexAttributes.a_texcoord.data,
                fontInfo,
                rotationZ,
                rotationY,
                textAnchor
            );
        } else {
            if (type == 'Model') {
                let model = getValue('model', style, feature, level);
                let modelId: string;
                if (!model) return;

                if (typeof model == 'string') {
                    modelId = model;
                    model = this.modelFactory.getModel(modelId);
                    // check if model has been loaded and processed already
                    if (model === UNDEF) {
                        if (modelId.endsWith('.obj')) {
                            this.waitAndRefresh(this.modelFactory.loadObj(modelId));
                        }
                        return;
                    }
                } else {
                    modelId = model.id ||= Math.random();
                    model = this.modelFactory.initModel(modelId, model);
                }

                if (model === false) {
                    // invalid model -> ignore
                    return;
                }

                let bucket = <TemplateBufferBucket<ModelBuffer>>group.buffer;

                let {scale, translate, rotate, transform, cullFace} = style as ModelStyle;

                if (!group.buffer) {
                    let faceCulling: number;

                    if (cullFace) {
                        // because default winding order is ccw and cullface set to front, we need to flip.
                        faceCulling = cullFace == 'Front' ? this.gl.BACK : this.gl.FRONT;
                    }

                    bucket = group.buffer = this.modelFactory.createModelBuffer(modelId, faceCulling);
                }

                this.modelFactory.addPosition(bucket, x, y, z, scale, translate, rotate, transform);
            } else if (type == 'Icon') {
                group.buffer ||= new SymbolBuffer(isFlat);

                const groupBuffer = group.buffer as SymbolBuffer;
                const {flexAttributes} = groupBuffer;
                const src = getValue('src', style, feature, level);
                const width = getValue('width', style, feature, level);
                const height = getValue('height', style, feature, level) || width;
                const atlas = (style as ImageStyle).atlas;
                const img = this.atlasManager.loadAtlas(src, atlas);

                if ((<Promise<ImageInfo>>img).then) {
                    return this.waitAndRefresh(<Promise<ImageInfo>>img);
                }

                positionBuffer = flexAttributes.a_position;

                addIcon(
                    x,
                    y,
                    z,
                    <ImageInfo>img,
                    width,
                    height,
                    flexAttributes.a_size.data,
                    positionBuffer.data,
                    flexAttributes.a_texcoord.data,
                    rotationZ
                );

                groupBuffer.addUniform('u_texture', this.atlasManager.getTexture(src));
            } else if (type == 'Circle' || type == 'Rect') {
                const pointBuffer = ((group.buffer as PointBuffer) ||= new PointBuffer(isFlat));
                positionBuffer = pointBuffer.flexAttributes.a_position;

                addPoint(x, y, z, positionBuffer.data);
            } else if (type == 'Heatmap') {
                const heatmapBuffer = ((group.buffer as HeatmapBuffer) ||= new HeatmapBuffer(isFlat));

                const weight = getValue('weight', style, feature, level);
                heatmapBuffer.addPoint(x, y, weight);
            } else if (type == 'Sphere') {
                let width = 2 * getValue('radius', style, feature, level);

                const sphereBuffer: SphereBuffer = ((group.buffer as SphereBuffer) ||= new SphereBuffer(isFlat));
                const {flexAttributes} = sphereBuffer;
                positionBuffer = flexAttributes.a_position;

                addSphere(x, y, z, width, positionBuffer.data, flexAttributes.a_point.data, flexAttributes.a_normal.data);
            } else if (type == 'Box') {
                let width = getValue('width', style, feature, level);
                let height = getValue('height', style, feature, level) || width;
                let depth = getValue('depth', style, feature, level) || width;

                const boxBuffer: BoxBuffer = ((group.buffer as BoxBuffer) ||= new BoxBuffer(isFlat));
                const {flexAttributes} = boxBuffer;
                positionBuffer = flexAttributes.a_position;

                addBox(x, y, z, width, height, depth, positionBuffer.data, flexAttributes.a_point.data, flexAttributes.a_normal.data);
            } else {
                if (z > 0 && type == 'VerticalLine') {
                    addVerticalLine(group, x, y, z);
                }
                // unknown style-type
                return;
            }

            collisionBufferStop = positionBuffer?.data.length;
            collisionBufferStart = collisionBufferStop - 12;
        }

        group.buffer.setIdOffset(feature.id);

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
        let style: Style;
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
        let strokeDashimage;
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
        let offsetZ;
        let text;
        let strokeScale;
        let alignment;
        let sizeUnit;
        let offsetUnit;
        let collisionGroups: { [key: string]: CollisionGroup } = {};
        let collisionData;

        this.lineFactory.initFeature(level, tileSize, collisionGroup?.id);

        if (priority === UNDEF && geomType === 'Point' && !tile.isInside(<GeoJSONCoordinate>coordinates)) {
            // not inside tile
            return;
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

            if (priority == UNDEF && ((type == 'Text' && !collide) || collide === false)) {
                let collisionGroupId = getValue('collisionGroup', style, feature, level) || DEFAULT_COLLISION_GRP;
                let collisionGrp = collisionGroups[collisionGroupId];

                const bbox = calcBBox(style, feature, level, this.dpr, collisionGrp?.bbox);

                if (bbox) {
                    if (!collisionGrp) {
                        collisionGrp = collisionGroups[collisionGroupId] = {
                            id: collisionGroupId,
                            bbox: null,
                            priority: Number.MAX_SAFE_INTEGER,
                            repeat: -Number.MAX_SAFE_INTEGER,
                            styleGrp: []
                        };
                    }

                    collisionGrp.bbox = bbox;
                    collisionGrp.styleGrp.push(style);

                    const priority = getValue('priority', style, feature, level);
                    if (priority < collisionGrp.priority) {
                        collisionGrp.priority = priority;
                    }

                    const repeat = getValue('repeat', style, feature, level);
                    if (repeat < collisionGrp.repeat) {
                        collisionGrp.repeat = repeat;
                    }
                    // the id is used to identify the repeatGroup
                    collisionGrp.id += `${type}${priority || '?'}${repeat || '?'}`;
                }
                continue;
            }

            if (
                opacity == UNDEF ||
                opacity >= 0.98 // no alpha visible -> no need to use more expensive alpha pass
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
            strokeDashimage = UNDEF;
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
            let depth;
            let pointerEvents = true;
            let processPointOffset = false;
            let modelMode = 0;

            rotation = getValue('rotation', style, feature, level) ^ 0;
            let altitude = getValue('altitude', style, feature, level);

            if (type == 'Model') {
                (style as ModelStyle).modelId ||= Math.random();
                modelMode = Number((style as any).terrain || 0);
                groupId = 'M' + (style as ModelStyle).modelId;
                processPointOffset = true;
            } else if (type == 'Icon') {
                alignment = getValue('alignment', style, feature, level) || 'viewport';

                groupId = (altitude ? 'AI' : 'I') + (alignment || '');
                processPointOffset = true;
            } else {
                stroke = getValue('stroke', style, feature, level);
                strokeWidth = getValue('strokeWidth', style, feature, level);

                if (type == 'VerticalLine') {
                    offsetZ = getValue('offsetZ', style, feature, level) || 0;
                    groupId = 'VL' + stroke + offsetZ;
                    if (altitude == UNDEF) {
                        altitude = true;
                    }
                } else if (type == 'Line') {
                    if (!stroke || !strokeWidth) continue;

                    const [value, unit] = parseSizeValue(strokeWidth, false);
                    strokeWidth = value;
                    sizeUnit = unit;

                    strokeLinecap = getValue('strokeLinecap', style, feature, level) || DEFAULT_LINE_CAP;
                    strokeLinejoin = getValue('strokeLinejoin', style, feature, level) || DEFAULT_LINE_JOIN;

                    const offset = getValue('offset', style, feature, level);
                    // store line offset/unit in shared offsetXY
                    [offsetX, offsetUnit] = parseSizeValue(offset);

                    groupId =
                        (altitude ? 'AL' : 'L') +
                        sizeUnit +
                        offsetX +
                        offsetUnit +
                        strokeLinecap +
                        strokeLinejoin;
                    strokeDasharray = getValue('strokeDasharray', style, feature, level);


                    if (Array.isArray(strokeDasharray) && strokeDasharray[0] ) {
                        let pattern = [];
                        let units = [];

                        for (let i=0; i< strokeDasharray.length; i++) {
                            const [size, unit] = parseSizeValue(strokeDasharray[i]);
                            pattern[i] = size;
                            units[i] = unit;

                            groupId += size+unit;
                        }

                        strokeDasharray = {pattern, units};

                        strokeDashimage = getValue('strokeDashimage', style, feature, level);

                        if (strokeDashimage) {
                            groupId += strokeDashimage.slice(-8);
                        }
                    } else {
                        strokeDasharray = UNDEF;
                    }
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

                            groupId = (altitude ? 'AC' : 'C') + sizeUnit + width || NONE;
                        } else if (type == 'Heatmap') {
                            width = getValue('radius', style, feature, level);
                            [width, sizeUnit] = parseSizeValue(width);

                            fillRGBA = fill;

                            const intensity = getValue('intensity', style, feature, level);

                            // TODO: refactor shared property usage..
                            height = intensity;

                            // if (fill?.type) {
                            //     fill._id = Math.random() * 1e6;
                            // }
                            groupId = 'H' + (width || NONE) + JSON.stringify(fill) + intensity;
                        } else if (type == 'Rect') {
                            width = getValue('width', style, feature, level);
                            [width, sizeUnit] = parseSizeValue(width);

                            height = getValue('height', style, feature, level);
                            height = !height ? width : parseSizeValue(height)[0];

                            groupId = (altitude ? 'AR' : 'R') + rotation + sizeUnit + width + height;
                        } else if (type == 'Box') {
                            // width = getValue('width', style, feature, level);
                            // [width, sizeUnit] = parseSizeValue(width);
                            // height = getValue('height', style, feature, level);
                            // depth = getValue('depth', style, feature, level);

                            pointerEvents = getValue('pointerEvents', style, feature, level);

                            groupId = 'B' + rotation + pointerEvents; // + sizeUnit + width + height;
                        } else if (type == 'Sphere') {
                            width = height = getValue('radius', style, feature, level);
                            [width, sizeUnit] = parseSizeValue(width);

                            pointerEvents = getValue('pointerEvents', style, feature, level);
                            groupId = 'S' + width + pointerEvents;
                        } else {
                            continue;
                        }

                        processPointOffset = true;

                        groupId += alignment || '';
                    }
                }


                if (!fillRGBA && fill) {
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

            if (processPointOffset) {
                offsetX = getValue('offsetX', style, feature, level);
                offsetY = getValue('offsetY', style, feature, level);
                offsetZ = getValue('offsetZ', style, feature, level);

                offsetUnit = new Array(3);

                [offsetX, offsetUnit[0]] = parseSizeValue(offsetX);
                [offsetY, offsetUnit[1]] = parseSizeValue(offsetY);
                [offsetZ, offsetUnit[2]] = parseSizeValue(offsetZ);

                groupId += offsetX + (offsetY << 8) + (offsetZ << 16) + offsetUnit[0] + offsetUnit[1] + offsetUnit[2];
            }

            groupId += (opacity * 100) ^ 0;

            zIndex = getValue('zIndex', style, feature, level);

            const zLayer = getValue('zLayer', style, feature, level);

            if (zLayer != UNDEF) {
                groupId = zLayer + ':' + groupId;
            }

            let depthTest;

            if (altitude) {
                depthTest = getValue('depthTest', style, feature, level);
                if (!depthTest) {
                    groupId = 'ND' + groupId;
                }
            }

            let scaleByAltitude: boolean = getValue('scaleByAltitude', style, feature, level);

            if (scaleByAltitude == UNDEF) {
                // scale xy by altitude is enable for meters by default.
                scaleByAltitude = sizeUnit == 'm';
            } else {
                scaleByAltitude = !!scaleByAltitude;
            }

            if (scaleByAltitude) {
                groupId += 'SA';
            }

            zGrouped = groups[zIndex] = groups[zIndex] || {index: {}, groups: []};
            index = zGrouped.index[groupId];

            if (index == UNDEF) {
                index = zGrouped.index[groupId] = zGrouped.groups.length;
                group = zGrouped.groups[index] = {
                    type,
                    zLayer,
                    depthTest,
                    pointerEvents,
                    shared: {
                        unit: sizeUnit,
                        font,
                        fill: fillRGBA, // && fillRGBA.slice(0, 3),
                        opacity,
                        stroke: strokeRGBA, // && strokeRGBA.slice(0, 3),
                        strokeWidth,
                        strokeLinecap,
                        strokeLinejoin,
                        strokeDasharray,
                        strokeDashimage,
                        width,
                        height,
                        depth,
                        rotation,
                        offsetX,
                        offsetY,
                        offsetZ,
                        offsetUnit,
                        alignment,
                        modelMode,
                        scaleByAltitude
                    }
                    // ,index: []
                };
            } else {
                group = zGrouped.groups[index];
            }

            if (geomType == 'Point') {
                if (type == 'VerticalLine') {
                    if (typeof altitude == 'number' || coordinates[2] > 0) {
                        const z = typeof altitude == 'number' ? altitude : <number>coordinates[2];
                        if (z > 0) {
                            const x = tile.lon2x((<GeoJSONCoordinate>coordinates)[0], tileSize);
                            const y = tile.lat2y((<GeoJSONCoordinate>coordinates)[1], tileSize);
                            addVerticalLine(group, x, y, z);
                        }
                    }
                } else {
                    const x = tile.lon2x((<GeoJSONCoordinate>coordinates)[0], tileSize);
                    const y = tile.lat2y((<GeoJSONCoordinate>coordinates)[1], tileSize);
                    const z = typeof altitude == 'number' ? altitude : altitude ? <number>coordinates[2] || 0 : null;
                    // const z = extrude ? <number>coordinates[2] || 0 : null;

                    if (collisionGroup) {
                        collisionData = this.collisions.insert(
                            x,
                            y,
                            z,
                            collisionGroup.offsetX,
                            collisionGroup.offsetY,
                            collisionGroup.width,
                            collisionGroup.height,
                            tile,
                            tileSize,
                            collisionGroup.priority
                        );

                        if (!collisionData) {
                            return;
                        }
                        // make sure collision is not check for following styles of stylegroup
                        collisionGroup = null;
                    }

                    this.createPoint(type, group, x, y, z, style, feature, collisionData, rotation, UNDEF, text, UNDEF,
                        type == 'Text' && getValue('textAnchor', style, feature, level)
                    );
                }
            } else if (geomType == 'LineString') {
                if (type == 'Line') {
                    if (strokeDashimage) {
                        const dashImgTexture = this.atlasManager.load(strokeDashimage, {mipMaps: false});
                        if ((<Promise<ImageInfo>>dashImgTexture).then) {
                            this.waitAndRefresh(<Promise<ImageInfo>>dashImgTexture);
                            return;
                        }
                    }

                    let vertexLength = this.lineFactory.createLine(
                        <GeoJSONCoordinate[]>coordinates,
                        group,
                        tile,
                        tileSize,
                        removeTileBounds,
                        strokeDasharray,
                        strokeLinecap,
                        strokeLinejoin,
                        strokeWidth,
                        altitude,
                        offsetX,
                        getValue('from', style, feature, level),
                        getValue('to', style, feature, level)
                    );

                    if (strokeDashimage) {
                        (group.buffer as LineBuffer).addUniform('u_dashTexture', this.atlasManager.getTexture(strokeDashimage));
                    }

                    group.buffer.setIdOffset(feature.id);
                } else {
                    let isText = type == 'Text';
                    let anchor = getValue('anchor', style, feature, level);
                    anchor ??= isText ? 'Line' : 'Coordinate';

                    const textAnchor = isText && getValue('textAnchor', style, feature, level);
                    const checkCollisions = isText ? !collide : collide === false;

                    let w;
                    let h;

                    const from = getValue('from', style, feature, level);
                    const to = getValue('to', style, feature, level);

                    if (anchor == 'Line') {
                        const applyRotation = alignment == 'map';

                        if (collisionGroup) {
                            w = collisionGroup.width * 2;
                            h = collisionGroup.height * 2;
                        } else if (type == 'Icon') {
                            w = getValue('width', style, feature, level);
                            h = getValue('height', style, feature, level) || width;
                        } else if (type == 'Text') {
                            if (!group.buffer) {
                                group.buffer = new TextBuffer(true, true);
                                group.buffer.addUniform('u_texture', new GlyphTexture(this.gl, style as FontStyle));
                            }
                            let texture = (group.buffer as TemplateBuffer).uniforms.u_texture as GlyphTexture;
                            // let {texture} = group;
                            // if (!texture) {
                            //     texture = group.texture = new GlyphTexture(this.gl, style);
                            //     group.buffer = new TextBuffer(true, true);
                            // }
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
              altitude,
              tile,
              tileSize,
              checkCollisions && this.collisions,
              priority,
              getValue('repeat', style, feature, level),
              offsetX,
              offsetY,
              w,
              h,
              applyRotation,
              checkLineSpace,
              from, to,
              (x, y, z, rotationZ, rotationY, collisionData) => {
                  this.createPoint(
                      type,
                      group,
                      x,
                      y,
                      z,
                      style,
                      feature,
                      collisionData,
                      rotationZ + rotation,
                      rotationY,
                      text,
                      false,
                      textAnchor
                  );
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
              altitude,
              tile,
              tileSize,
              checkCollisions && this.collisions,
              priority,
              w,
              h,
              offsetX,
              offsetY,
              from,
              to,
              (x, y, z, rotZ, rotY, collisionData) => {
                  this.createPoint(type, group, x, y, z, style, feature, collisionData, rotZ + rotation, UNDEF, text, UNDEF, textAnchor);
              }
                        );
                    }
                }
            } else {
                // Polygon geometry
                if (type == 'Polygon' || type == 'Extrude') {
                    if (!group.buffer) {
                        group.buffer = type == 'Polygon' ? new PolygonBuffer() : new ExtrudeBuffer();
                    }

                    const groupBuffer = group.buffer as PolygonBuffer | ExtrudeBuffer;
                    const vIndex = <number[]>groupBuffer.index();
                    const {flexAttributes} = groupBuffer;
                    const aPosition = flexAttributes.a_position.data;

                    flatPolyStart = aPosition.length;

                    if (type == 'Extrude') {
                        let strokeIndex;

                        if (stroke) {
                            strokeIndex = group.extrudeStrokeIndex = group.extrudeStrokeIndex || [];
                        }

                        flatPoly = addExtrude(
                            aPosition,
                            (group.buffer as ExtrudeBuffer).flexAttributes.a_normal.data,
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

                    group.buffer.setIdOffset(feature.id);

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


        for (let key in collisionGroups) {
            const collisionGrp = collisionGroups[key];
            const [x1, y1, x2, y2] = collisionGrp.bbox;
            const halfWidth = (x2 - x1) * 0.5;
            const halfHeight = (y2 - y1) * 0.5;

            collisionGrp.feature = feature;
            collisionGrp.geomType = geomType;
            collisionGrp.coordinates = coordinates;

            collisionGrp.offsetX = x1 + halfWidth;
            collisionGrp.offsetY = y1 + halfHeight;
            collisionGrp.width = halfWidth;
            collisionGrp.height = halfHeight;

            this.pendingCollisions.push(collisionGrp);
        }
        ;
    }

    destroy() {
        this.modelFactory.destroy();
    }
}
