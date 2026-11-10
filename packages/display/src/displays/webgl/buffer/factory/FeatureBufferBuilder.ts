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

import {GeometryBuffer} from '../GeometryBuffer';
import {addPolygon, FlatPolygon} from '../geometry/addPolygon';
import {addExtrude} from '../geometry/addExtrude';
import {calcBBox, getTextString, getValue, parseSizeValue, type Style, type StyleGroup} from '../../../styleTools';
import {defaultFont, wrapText} from '../../../textUtils';
import {FontStyle, GlyphTexture} from '../../GlyphTexture';
import {BBox, CollisionData, CollisionHandler} from '../../CollisionHandler';
import {LineFactory, isDynamicProperty} from './LineFactory';
import {TextBuffer} from '../types/TextBuffer';
import {SymbolBuffer} from '../types/SymbolBuffer';
import {PointBuffer} from '../types/PointBuffer';
import {PolygonBuffer} from '../types/PolygonBuffer';
import {ExtrudeBuffer} from '../types/ExtrudeBuffer';
import {toPresentationFormB} from '../../arabic';
import {
    Tile,
    Feature,
    GeoJSONCoordinate,
    TextStyle,
    ImageStyle,
    ParsedStyleProperty,
    LayerStyle, TerrainTileFeature,
    ElevationQuadTree,
    triangulatePolygon
} from '@here/xyz-maps-core';

import {addVerticalLine} from '../geometry/addVerticalLine';
import {BoxBuffer} from '../types/BoxBuffer';
import {addBox} from '../geometry/addBox';
import {addSphere} from '../geometry/addSphere';
import {SphereBuffer} from '../types/SphereBuffer';
import {ModelStyle, ModelData, OBJModelSource, Color} from '@here/xyz-maps-core';
import {ModelBufferFactory} from './ModelBufferFactory';
import {ModelResourceCache} from './ModelResourceCache';
import {ModelBuffer} from '../types/ModelBuffer';
import {TerrainModelBuffer} from '../types/TerrainModelBuffer';
import {ImageInfo} from '../../Atlas';
import {HeatmapBuffer} from '../types/HeatmapBuffer';
import {TextureAtlasManager} from '../../TextureAtlasManager';
import {LineBuffer} from '../types/LineBuffer';
import {VerticalLineBuffer} from '../types/VerticalLineBuffer';
import {Color as ColorUtils, Expression, ExpressionMode} from '@here/xyz-maps-common';
import {TextureManager} from '../../TextureManager';
import {CullFace, GraphicsDevice} from '../../device/GraphicsDevice';
import {getTerrainRenderPolicy, TerrainOcclusionMode, TerrainRenderMode} from '../TerrainRenderPolicy';
import {getBatchStateKey, getPaintColorIdentity, getLightingColorIdentity} from '../batchKey';
import type {LightingColorIdentity} from '../batchKey';
import type {BufferBatch, BatchesByZIndex, ZIndexBatches} from './BufferBatch';

const {toRGB} = ColorUtils;
type RGBA = ColorUtils.RGBA;
type ResolvedModel = {source: string | ModelData | OBJModelSource; id: string};

const DEFAULT_SPECULAR_SHININESS = 32;
const DEFAULT_COLOR_INTENSITY = 1;
const DEFAULT_STROKE_WIDTH = 1;
const DEFAULT_LINE_CAP = 'round';
const DEFAULT_LINE_JOIN = 'round';
const DEFAULT_COLLISION_GRP = '0';
let UNDEF;

const featureBoundsIntersectTile = (featureBounds: number[], tile: Tile): boolean => {
    const tileBounds = tile.getContentBounds();
    return featureBounds[0] <= tileBounds[2] && featureBounds[2] >= tileBounds[0] &&
        featureBounds[1] <= tileBounds[3] && featureBounds[3] >= tileBounds[1];
};

const normalizeDebugColor = (value: boolean | Color | undefined): boolean | number[] | undefined => {
    if (typeof value === 'boolean') return value;
    if (value == null) return undefined;
    return toRGB(value).slice(0, 3);
};

export type CollisionGroup = {
    id: string;
    styleGrp: Style[];
    priority: number;
    repeat: number;
    bbox: number[];

    feature?: Feature;
    geomType?: string;
    coordinates?: any;
    pointCoverageBounds?: number[];

    offsetX?: number;
    offsetY?: number;
    width?: number;
    height?: number;
};

const DYNAMIC_MODE = ExpressionMode.dynamic;
const PIXEL_UNITS = ['px', 'px'];

export class FeatureBufferBuilder {
    private atlasManager: TextureAtlasManager;
    private dpr: number;
    private tile: Tile;
    private batchesByZIndex: BatchesByZIndex;
    private tileSize: number;
    private lineFactory: LineFactory;
    private modelBufferFactory: ModelBufferFactory;
    private modelResources: ModelResourceCache;
    collisions: CollisionHandler;
    pendingCollisions: CollisionGroup[] = [];
    zoom: number;
    private waitAndRefresh: (p: Promise<any>) => void;
    textureManager: TextureManager;
    private zLayer: number;
    private layerStyleDefaultAltitude: number | boolean | 'terrain';

    constructor(private device: GraphicsDevice, collisionHandler, devicePixelRatio: number) {
        this.atlasManager = new TextureAtlasManager(device);
        this.textureManager = new TextureManager(device);
        this.dpr = devicePixelRatio;
        this.collisions = collisionHandler;
        this.lineFactory = new LineFactory(device);
        this.modelResources = new ModelResourceCache(device);
        this.modelBufferFactory = new ModelBufferFactory(this.modelResources);
    }

    toRGBA(color: Color, alpha: number = 1, premultiplyAlpha: boolean = true): RGBA {
        const rgba = Array.isArray(color)
            ? [color[0], color[1], color[2], typeof color[3] == 'number' ? color[3] : 1] as RGBA
            : toRGB(color);
        if (rgba) {
            alpha = rgba[3] *= alpha;
            if (premultiplyAlpha) {
                rgba[0] *= alpha;
                rgba[1] *= alpha;
                rgba[2] *= alpha;
            }
        }
        return rgba || null;
    }

    init(tile: Tile, batchesByZIndex: BatchesByZIndex, tileSize: number, zoom: number, layerStyles: LayerStyle, waitAndRefresh: (p: Promise<any>) => void) {
        this.tile = tile;
        this.batchesByZIndex = batchesByZIndex;
        this.tileSize = tileSize;
        this.zoom = zoom;
        this.zLayer = layerStyles.zLayer;
        this.layerStyleDefaultAltitude = layerStyles.altitude;
        this.lineFactory.initTile();
        this.pendingCollisions.length = 0;
        this.waitAndRefresh = waitAndRefresh;
    }

    private isModelStyle(type: string): boolean {
        return type === 'Model' || type === 'Terrain';
    }

    private createTextBuffer(isFlat: boolean, batch: BufferBatch<'Text'>, rotationY): TextBuffer {
        const buffer = new TextBuffer(isFlat, this.tileSize, rotationY != UNDEF);
        buffer.addUniform('u_texture', TextBuffer.createGlyphTexture(this.device, batch.resolvedStyle));
        return buffer;
    }

    private addPoint(
        batch: BufferBatch,
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
        textAnchor?: ParsedStyleProperty<TextStyle['textAnchor']> | string,
        terrainRenderMode?: TerrainRenderMode,
        resolvedModel?: ResolvedModel,
        fragmentTileClip: boolean = false
    ) {
        const isFlat = z === null;
        const level = this.zoom;
        let positionBuffer;
        let collisionBufferStart;
        let collisionBufferStop;

        // make sure rotation is 0->360 deg
        rotationZ = (rotationZ + 360) % 360;

        if (batch.type == 'Text') {
            batch.buffer ||= this.createTextBuffer(isFlat, batch, rotationY);

            const texture = batch.buffer.uniforms.u_texture as GlyphTexture;
            const {flexAttributes} = batch.buffer;

            texture.addChars(text);

            const fontInfo = texture.getAtlas();
            let lineWrap = getValue('lineWrap', style, feature, level) ?? defaultLineWrap;

            const lines = wrapText(text, lineWrap);

            positionBuffer = flexAttributes.a_position;
            collisionBufferStart = positionBuffer.data.length;
            collisionBufferStop = collisionBufferStart + texture.bufferLength(text, isFlat ? 2 : 3);

            batch.buffer.addText(
                x,
                y,
                z,
                lines,
                fontInfo,
                rotationZ,
                rotationY,
                textAnchor
                // !!this.collisionGroup
            );
        } else {
            if (batch.type === 'Model' || batch.type === 'Terrain') {
                const source = resolvedModel.source;
                const modelId = resolvedModel.id;
                let model = this.modelResources.getModel(modelId);

                if (typeof source == 'string') {
                    // check if model has been loaded and processed already
                    if (model === UNDEF) {
                        if (modelId.endsWith('.obj')) {
                            this.waitAndRefresh(this.modelResources.loadObj(modelId));
                        }
                        return;
                    }
                } else if ('format' in source && source.format === 'obj') {
                    if (model === UNDEF) {
                        this.waitAndRefresh(this.modelResources.loadInline(source));
                        return;
                    }
                } else {
                    model = this.modelResources.initModel(modelId, source as ModelData);
                }

                if (model === false) {
                    // invalid model -> ignore
                    return;
                }

                let bucket = batch.buffer;

                // let {rotate, transform, cullFace} = style as ModelStyle;
                const {rotate, cullFace} = style as ModelStyle;
                const transform = getValue('transform', style, feature, level);
                const scale = getValue('scale', style, feature, level);
                const translate = getValue('translate', style, feature, level);

                if (!batch.buffer) {
                    let faceCulling: number;

                    if (cullFace) {
                        faceCulling = cullFace == 'Front' ? CullFace.FRONT : CullFace.BACK;
                    }

                    const {resolvedStyle} = batch;
                    const alphaOptions = {
                        alphaMode: (style as ModelStyle).alphaMode,
                        alphaCutoff: (style as ModelStyle).alphaCutoff,
                        materialOverrides: (style as ModelStyle).materialOverrides
                    };
                    if (batch.type === 'Terrain') {
                        batch.buffer = this.modelBufferFactory.createModelBuffer(
                            modelId, resolvedStyle.specular, resolvedStyle.shininess, resolvedStyle.emissive,
                            faceCulling, TerrainModelBuffer, alphaOptions, fragmentTileClip
                        );
                    } else {
                        batch.buffer = this.modelBufferFactory.createModelBuffer(
                            modelId, resolvedStyle.specular, resolvedStyle.shininess, resolvedStyle.emissive,
                            faceCulling, ModelBuffer, alphaOptions, fragmentTileClip
                        );
                    }
                    bucket = batch.buffer;
                    const properties = feature.properties as TerrainTileFeature['properties'];

                    if (batch.type == 'Terrain' && properties.useHeightMap) {
                        const terrainBuffer = batch.buffer.get(0);
                        const heightMap = properties.heightMap;

                        terrainBuffer.heightMap = {
                            tileSize: this.tileSize,
                            size: Math.sqrt(heightMap.length),
                            data: heightMap as Float32Array,
                            padding: properties.heightMapPadding || 0,
                            min: properties.minAltitude,
                            max: properties.maxAltitude,
                            elevationTree: properties.elevationTree
                                ? ElevationQuadTree.deserialize(properties.elevationTree)
                                : undefined,
                            texture: terrainBuffer.getHeightMapTexture(),
                            skirtHeight: properties.skirtHeight || 0
                        };
                    }
                }

                this.modelBufferFactory.addPosition(bucket, x, y, z, scale, translate, rotate, transform);
            } else if (batch.type == 'Icon') {
                batch.buffer ||= new SymbolBuffer(isFlat, this.tileSize);

                const groupBuffer = batch.buffer;
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

                groupBuffer.addIcon(x, y, z, <ImageInfo>img, width, height, rotationZ);

                groupBuffer.addUniform('u_texture', this.atlasManager.getTexture(src));
            } else if (batch.type == 'Circle' || batch.type == 'Rect') {
                batch.buffer ||= new PointBuffer(isFlat, this.tileSize);
                const pointBuffer = batch.buffer;
                positionBuffer = pointBuffer.flexAttributes.a_position;
                pointBuffer.addPoint(x, y, z/* !!this.collisionGroup*/);
            } else if (batch.type == 'Heatmap') {
                batch.buffer ||= new HeatmapBuffer(isFlat, this.tileSize);
                const heatmapBuffer = batch.buffer;

                const weight = getValue('weight', style, feature, level);
                heatmapBuffer.addPoint(x, y, weight);
            } else if (batch.type == 'Sphere') {
                batch.buffer ||= new SphereBuffer(isFlat);
                const sphereBuffer = batch.buffer;
                const {flexAttributes} = sphereBuffer;
                positionBuffer = flexAttributes.a_position;

                addSphere(x, y, z, positionBuffer.data, flexAttributes.a_point.data, flexAttributes.a_normal.data);
            } else if (batch.type == 'Box') {
                let width = getValue('width', style, feature, level);
                let height = getValue('height', style, feature, level) || width;
                let depth = getValue('depth', style, feature, level) || width;

                batch.buffer ||= new BoxBuffer(isFlat);
                const boxBuffer = batch.buffer;
                const {flexAttributes} = boxBuffer;
                positionBuffer = flexAttributes.a_position;

                addBox(x, y, z, width, height, depth, positionBuffer.data, flexAttributes.a_point.data, flexAttributes.a_normal.data);
            } else {
                if (batch.type == 'VerticalLine' && (z > 0
                    // with altitude terrain, VerticalLines can use terrain as their base without a coordinate z
                    || batch.resolvedStyle.altitude === 'terrain'
                )) {
                    addVerticalLine(batch, x, y, z);
                }
                // unknown style-type
                return;
            }

            collisionBufferStop = positionBuffer?.data.length;
            collisionBufferStart = collisionBufferStop - 12;
        }

        if (terrainRenderMode === TerrainRenderMode.ONSCREEN) {
            batch.buffer.setRequiresHeightMap(true);
        }

        batch.buffer.setIdOffset(feature.id);

        if (collisionData && positionBuffer) {
            collisionData.attrs.push({
                attr: positionBuffer,
                start: collisionBufferStart,
                stop: collisionBufferStop
            });
        }
    }

    addFeature(
        feature: Feature,
        renderGeometryType: 'Point' | 'LineString' | 'Polygon',
        coordinates: GeoJSONCoordinate | GeoJSONCoordinate[] | GeoJSONCoordinate[][],
        styleGroups: StyleGroup,
        strokeWidthScale: number,
        removeTileBounds?: boolean,
        priority?: number,
        collisionGroup?: CollisionGroup,
        allowPointerEvents: boolean = true,
        // [minLon, minLat, maxLon, maxLat] bounds for cross-tile point placement and clipping (currently Model-only).
        pointCoverageBounds?: number[],
        // Polygon outlines reuse resolved paint without mutating the source style or reevaluating its callbacks.
        outlineStroke?: Color,
        outlineStrokeWidth?: number | string
    ): boolean {
        const {tile, batchesByZIndex, tileSize} = this;
        // this.collisionGroup = collisionGroup;
        const level = this.zoom;
        let flatPolyStart: number;
        let flatPoly: FlatPolygon[];
        let triangles;
        let zIndex;
        let type: BufferBatch['type'] | 'Image';
        let opacity;
        let font;
        let fill;
        let fillRGBA;
        let rotation;
        let stroke;
        let strokeRGBA;
        let strokeWidth;
        let strokeDasharray;
        let strokeDashimage;
        let strokeLinecap;
        let strokeLinejoin;
        let extrude;
        let extrudeBase;
        let width;
        let height;
        let zBatches: ZIndexBatches;
        let geometryKey: string;
        let batchKey: string;
        let batch: BufferBatch;
        let index;
        let offsetX;
        let offsetY;
        let offsetZ;
        let text;
        let strokeScale;
        let alignment;
        let sizeUnit;
        let offsetUnit;
        let offsetUnitX: string;
        let offsetUnitY: string;
        let offsetUnitZ: string;
        let collisionGroups: { [key: string]: CollisionGroup } = {};
        let collisionData;

        this.lineFactory.initFeature(level, tileSize, collisionGroup?.id);

        const isPointRenderGeometry = renderGeometryType === 'Point';


        // A defined priority marks the deferred collision pass. do not reapply anchor-tile filtering there.
        const pointOutsideTile = priority === UNDEF
            && isPointRenderGeometry && !tile.isInside(<GeoJSONCoordinate>coordinates);

        const hasModelCoverage = isPointRenderGeometry
            && !!pointCoverageBounds
            && featureBoundsIntersectTile(pointCoverageBounds, tile);

        // Outside-anchor points can only render here when their feature coverage reaches this tile.
        if (pointOutsideTile && !hasModelCoverage) return;


        for (let i = 0, iLen = styleGroups.length; i < iLen; i++) {
            const style: Style = styleGroups[i];

            type = outlineStrokeWidth === UNDEF ? getValue('type', style, feature, level) : 'Line';
            if (!type) continue;

            if (pointOutsideTile && type !== 'Model') continue;

            opacity = getValue('opacity', style, feature, level);
            if (opacity === 0) continue;

            let altitude = getValue('altitude', style, feature, level) ?? this.layerStyleDefaultAltitude;
            const fragmentTileClip = type === 'Model' && !!pointCoverageBounds && altitude !== 'terrain';

            // Terrain-height sampling requires the anchor tile, so terrain-relative models cannot use neighboring tiles yet.
            if (pointOutsideTile && !fragmentTileClip) {
                continue;
            }

            let collide = renderGeometryType == 'Polygon'
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
            let widthId: number | string;
            let strokeIdentity: string;
            let fillIdentity: string;
            let pointerEvents = allowPointerEvents;
            let processPointOffset = false;
            let modelMode = null;
            let resolvedModel: ResolvedModel;
            let emissive;
            let emissiveIdentity: LightingColorIdentity;
            let shininess: number;
            let specular;
            let specularIdentity: LightingColorIdentity;
            let light: string;
            let processAdvancedLight = false;
            let colorIntensity = 1;
            let modelShowWireframe: boolean | number[] | undefined;
            let modelShowBBox: boolean | number[] | undefined;

            rotation = getValue('rotation', style, feature, level) ^ 0;

            if (this.isModelStyle(type)) {
                const source = getValue('model', style, feature, level);
                if (!source) continue;
                const id = this.modelResources.getSourceId(source);
                resolvedModel = {source, id};
                if (type === 'Terrain') {
                    modelMode = [feature.properties.minHeight, feature.properties.maxHeight];
                }
                const modelStyle = style as ModelStyle;
                modelShowWireframe = normalizeDebugColor(getValue('showWireframe', style, feature, level));


                modelShowBBox = normalizeDebugColor(getValue('showBBox', style, feature, level));
                geometryKey = (type === 'Terrain' ? TerrainModelBuffer : ModelBuffer).getGeometryKey(
                    modelStyle, id, modelShowWireframe, modelShowBBox, fragmentTileClip
                );
                processPointOffset = true;
                processAdvancedLight = true;
            } else if (type == 'Icon') {
                alignment = getValue('alignment', style, feature, level) || 'viewport';

                geometryKey = SymbolBuffer.getGeometryKey(altitude, alignment);
                processPointOffset = true;
            } else {
                stroke = outlineStrokeWidth === UNDEF ? getValue('stroke', style, feature, level) : outlineStroke;

                if (type == 'Line') {
                    if (!stroke) continue;

                    strokeWidth = outlineStrokeWidth === UNDEF
                        ? getValue('strokeWidth', style, feature, level, DYNAMIC_MODE) : outlineStrokeWidth;

                    if (!strokeWidth) continue;

                    if (isDynamicProperty(strokeWidth)) {
                        widthId = GeometryBuffer.getSizeBatchKey(strokeWidth);
                    } else {
                        [strokeWidth, sizeUnit] = parseSizeValue(strokeWidth);
                        widthId = strokeWidth;
                    }

                    strokeLinecap = getValue('strokeLinecap', style, feature, level) || DEFAULT_LINE_CAP;
                    strokeLinejoin = getValue('strokeLinejoin', style, feature, level) || DEFAULT_LINE_JOIN;

                    const offset = getValue('offset', style, feature, level);
                    // store line offset/unit in shared offsetXY
                    [offsetX, offsetUnit] = parseSizeValue(offset);

                    strokeDasharray = getValue('strokeDasharray', style, feature, level, DYNAMIC_MODE);

                    if (isDynamicProperty(strokeDasharray)) {
                        strokeDasharray = {
                            pattern: strokeDasharray,
                            units: PIXEL_UNITS
                        };
                    } else if (Array.isArray(strokeDasharray) && strokeDasharray[0]) {
                        let pattern = [];
                        let units = [];

                        for (let i = 0; i < strokeDasharray.length; i++) {
                            const [size, unit] = parseSizeValue(strokeDasharray[i]);
                            pattern[i] = size;
                            units[i] = unit;
                        }
                        strokeDasharray = {pattern, units};
                    } else {
                        strokeDasharray = UNDEF;
                    }

                    geometryKey = LineBuffer.getGeometryKey(
                        altitude, sizeUnit, offsetX, offsetUnit, strokeLinecap, strokeLinejoin, strokeDasharray
                    );
                    if (strokeDasharray) {
                        strokeDashimage = getValue('strokeDashimage', style, feature, level);
                    }
                } else {
                    strokeWidth = getValue('strokeWidth', style, feature, level);
                    widthId = strokeWidth;

                    if (type == 'VerticalLine') {
                        offsetZ = getValue('offsetZ', style, feature, level) || 0;
                        geometryKey = VerticalLineBuffer.getGeometryKey(offsetZ);

                        [offsetZ, offsetUnit] = parseSizeValue(offsetZ);
                        if (altitude == UNDEF) {
                            altitude = true;
                        }
                    } else {
                        fill = getValue('fill', style, feature, level);

                        if (type == 'Polygon') {
                            if (!fill || renderGeometryType != 'Polygon') {
                                continue;
                            }
                            extrude = getValue('extrude', style, feature, level);
                            extrudeBase = getValue('extrudeBase', style, feature, level);

                            processAdvancedLight = true;

                            if (extrude > 0 || extrudeBase > 0) {
                                geometryKey = ExtrudeBuffer.getGeometryKey();
                                type = 'Extrude';
                            } else {
                                geometryKey = PolygonBuffer.getGeometryKey();
                            }
                        } else {
                            if (renderGeometryType == 'Polygon') {
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
                                    alignment = renderGeometryType == 'Point' ? 'viewport' : 'map';
                                }
                                geometryKey = TextBuffer.getGeometryKey(font);
                            } else if (type == 'Circle') {
                                width = height = getValue('radius', style, feature, level, DYNAMIC_MODE);

                                if (!isDynamicProperty(width)) {
                                    [width, sizeUnit] = parseSizeValue(width);
                                }

                                geometryKey = PointBuffer.getCircleGeometryKey(altitude, sizeUnit, width);
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
                                geometryKey = HeatmapBuffer.getGeometryKey(width, fill, intensity);
                            } else if (type == 'Rect') {
                                width = getValue('width', style, feature, level);
                                [width, sizeUnit] = parseSizeValue(width);

                                height = getValue('height', style, feature, level);
                                height = !height ? width : parseSizeValue(height)[0];

                                geometryKey = PointBuffer.getRectangleGeometryKey(altitude, rotation, sizeUnit, width, height);
                            } else if (type == 'Box' || type == 'Sphere') {
                                if (type == 'Box') {
                                    geometryKey = BoxBuffer.getGeometryKey(rotation);
                                } else {
                                    width = height = getValue('radius', style, feature, level);
                                    [width, sizeUnit] = parseSizeValue(width);
                                    geometryKey = SphereBuffer.getGeometryKey(width, sizeUnit);
                                }

                                alignment = 'map';
                                processAdvancedLight = true;
                            } else {
                                continue;
                            }

                            const allowEvents = getValue('pointerEvents', style, feature, level);
                            if (typeof allowEvents == 'boolean') {
                                pointerEvents = allowEvents;
                            }
                            processPointOffset = true;
                        }
                    }
                }

                if (!fillRGBA && fill) {
                    fillRGBA = this.toRGBA(fill, opacity);
                }

                if (stroke) {
                    strokeRGBA = this.toRGBA(stroke, opacity);
                    if (type == 'Text') {
                        // don't apply stroke-scale to text rendering
                        strokeScale = 1;
                    }

                    if (!isDynamicProperty(strokeWidth)) {
                        if (typeof strokeWidth != 'number') {
                            strokeWidth = DEFAULT_STROKE_WIDTH;
                        } else {
                            strokeWidth *= strokeScale;
                            if (strokeWidth < 0) {
                                strokeWidth = DEFAULT_STROKE_WIDTH;
                            }
                        }
                    }
                }
                // Snapshot mutable raw colors before later style callbacks can change them.
                strokeIdentity = getPaintColorIdentity(stroke);
                fillIdentity = fillRGBA ? getPaintColorIdentity(fill) : '';
            }

            const terrainPolicy = getTerrainRenderPolicy(type, renderGeometryType, alignment, altitude);
            const terrainRenderMode = terrainPolicy.renderMode;
            const terrainOcclusion = terrainPolicy.occlusion;

            if (processPointOffset) {
                offsetX = getValue('offsetX', style, feature, level);
                offsetY = getValue('offsetY', style, feature, level);
                offsetZ = getValue('offsetZ', style, feature, level);

                const offsetXData = parseSizeValue(offsetX);
                offsetX = offsetXData[0];

                const offsetYData = parseSizeValue(offsetY);
                offsetY = offsetYData[0];

                const offsetZData = parseSizeValue(offsetZ);
                offsetZ = offsetZData[0];

                offsetUnitX = offsetXData[1];
                offsetUnitY = offsetYData[1];
                offsetUnitZ = offsetZData[1];
            }

            if (processAdvancedLight) {
                light = getValue('light', style, feature, level);
                emissive = getValue('emissive', style, feature, level);
                const emissiveColor = emissive;
                if (emissive) {
                    emissive = this.toRGBA(emissive).slice(0, 3);
                }
                specular = getValue('specular', style, feature, level);
                const specularColor = specular;

                if (specular) {
                    shininess = getValue('shininess', style, feature, level) ?? DEFAULT_SPECULAR_SHININESS;
                    specular = this.toRGBA(specular).slice(0, 3);
                }
                emissiveIdentity = getLightingColorIdentity(emissiveColor);
                specularIdentity = getLightingColorIdentity(specularColor);
                colorIntensity = getValue('fillIntensity', style, feature, level) ?? DEFAULT_COLOR_INTENSITY;
            }

            zIndex = getValue('zIndex', style, feature, level);

            let zLayer = getValue('zLayer', style, feature, level);
            if (zLayer == UNDEF) {
                zLayer = this.zLayer;
            }
            let depthTest;

            if (altitude) {
                depthTest = getValue('depthTest', style, feature, level);
            }

            let scaleByAltitude: boolean = getValue('scaleByAltitude', style, feature, level);

            if (scaleByAltitude == UNDEF) {
                // scale xy by altitude is enable for meters by default.
                // For terrain-altitude features, disable per-vertex altitude compensation:
                // the pivotScaleFactor is skipped at render time and the perspective matrix
                // already projects the feature at the correct size on the terrain surface.
                scaleByAltitude = sizeUnit == 'm' || altitude === 'terrain';
            } else {
                scaleByAltitude = !!scaleByAltitude;
            }

            const stateKey = getBatchStateKey(terrainRenderMode, terrainOcclusion, opacity, zLayer, altitude, depthTest, scaleByAltitude);
            // Geometry keys are prepared earlier to preserve lazy expression-ID assignment order.
            switch (type) {
            case 'Circle':
            case 'Rect':
                batchKey = PointBuffer.getPointBatchKey(strokeIdentity, widthId, fillIdentity, pointerEvents, alignment,
                    offsetX, offsetY, offsetZ, offsetUnitX, offsetUnitY, offsetUnitZ, stateKey, geometryKey);
                break;
            case 'Text':
                batchKey = TextBuffer.getBatchKey(strokeIdentity, widthId, fillIdentity, pointerEvents, alignment,
                    offsetX, offsetY, offsetZ, offsetUnitX, offsetUnitY, offsetUnitZ, stateKey, geometryKey);
                break;
            case 'Box':
            case 'Sphere':
                batchKey = (type === 'Box' ? BoxBuffer : SphereBuffer).getBatchKey(
                    geometryKey, stateKey, strokeIdentity, widthId, fillIdentity, pointerEvents, alignment,
                    offsetX, offsetY, offsetZ, offsetUnitX, offsetUnitY, offsetUnitZ,
                    light, emissiveIdentity, specularIdentity, shininess, colorIntensity);
                break;
            case 'Heatmap':
                batchKey = HeatmapBuffer.getBatchKey(geometryKey, stateKey, strokeIdentity, widthId, pointerEvents, alignment,
                    offsetX, offsetY, offsetZ, offsetUnitX, offsetUnitY, offsetUnitZ);
                break;
            case 'Icon':
                batchKey = SymbolBuffer.getBatchKey(offsetX, offsetY, offsetZ, offsetUnitX, offsetUnitY, offsetUnitZ, stateKey, geometryKey);
                break;
            case 'Model':
            case 'Terrain':
                batchKey = (type === 'Model' ? ModelBuffer : TerrainModelBuffer).getBatchKey(geometryKey, stateKey,
                    offsetX, offsetY, offsetZ, offsetUnitX, offsetUnitY, offsetUnitZ,
                    light, emissiveIdentity, specularIdentity, shininess, colorIntensity);
                break;
            case 'Polygon':
            case 'Extrude':
                batchKey = (type === 'Polygon' ? PolygonBuffer : ExtrudeBuffer).getBatchKey(
                    geometryKey, stateKey, strokeIdentity, widthId, fillIdentity, light, emissiveIdentity, specularIdentity, shininess, colorIntensity);
                break;
            case 'Line':
                batchKey = LineBuffer.getBatchKey(geometryKey, stateKey, strokeIdentity, widthId, !!strokeDasharray, strokeDashimage);
                break;
            case 'VerticalLine':
                batchKey = VerticalLineBuffer.getBatchKey(geometryKey, stateKey, strokeIdentity, widthId);
                break;
            default:
                throw new Error(`Unsupported batch buffer type: ${type}`);
            }

            zBatches = batchesByZIndex[zIndex] = batchesByZIndex[zIndex] || {index: {}, batches: []};
            index = zBatches.index[batchKey];

            if (index == UNDEF) {
                index = zBatches.index[batchKey] = zBatches.batches.length;
                const resolvedStyle = {
                    altitude,
                    terrainRenderMode,
                    terrainOcclusion,
                    unit: sizeUnit,
                    font,
                    fill: fillRGBA,
                    fillIntensity: colorIntensity,
                    opacity,
                    stroke: strokeRGBA,
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
                    offsetUnit: processPointOffset ? [offsetUnitX, offsetUnitY, offsetUnitZ] : offsetUnit,
                    alignment,
                    modelMode,
                    scaleByAltitude,
                    emissive,
                    shininess,
                    specular,
                    light,
                    showWireframe: modelShowWireframe,
                    showBBox: modelShowBBox
                };
                batch = zBatches.batches[index] = {
                    type,
                    zLayer,
                    depthTest,
                    pointerEvents,
                    collision: typeof priority === 'number',
                    resolvedStyle
                };
            } else {
                batch = zBatches.batches[index];
            }

            if (renderGeometryType == 'Point') {
                const requiresTerrain = altitude === 'terrain';
                const terrainRenderMode = batch.resolvedStyle.terrainRenderMode;

                if (batch.type == 'VerticalLine') {
                    const z = typeof altitude == 'number' ? altitude : <number>coordinates[2];
                    if (requiresTerrain || (Number.isFinite(z) && z > 0)) {
                        const x = tile.lon2x((<GeoJSONCoordinate>coordinates)[0], tileSize);
                        const y = tile.lat2y((<GeoJSONCoordinate>coordinates)[1], tileSize);
                        addVerticalLine(batch, x, y, z);
                    }
                } else {
                    const x = tile.lon2x((<GeoJSONCoordinate>coordinates)[0], tileSize);
                    const y = tile.lat2y((<GeoJSONCoordinate>coordinates)[1], tileSize);
                    const z = typeof altitude == 'number'
                        ? altitude
                        : requiresTerrain
                            ? null
                            : altitude
                                ? <number>coordinates[2] || 0
                                : null;

                    if (collisionGroup) {
                        collisionData = this.collisions.insert(
                            x,
                            y,
                            altitude === 'terrain' || typeof altitude == 'number' ?
                                altitude
                                : (altitude && <number>coordinates[2]) || 0,
                            collisionGroup.offsetX,
                            collisionGroup.offsetY,
                            collisionGroup.width,
                            collisionGroup.height,
                            collisionGroup.priority,
                            alignment === 'map'
                        );

                        if (!collisionData) {
                            return;
                        }
                        // make sure collision is not check for following styles of stylegroup
                        collisionGroup = null;
                    }

                    this.addPoint(batch, x, y, z, style, feature, collisionData, rotation, UNDEF, text, UNDEF,
                        (type == 'Text' && getValue('textAnchor', style, feature, level)) as ParsedStyleProperty<TextStyle['textAnchor']>,
                        terrainRenderMode, resolvedModel, fragmentTileClip
                    );
                }
            } else if (renderGeometryType == 'LineString') {
                const requiresTerrain = altitude === 'terrain';
                const terrainRenderMode = batch.resolvedStyle.terrainRenderMode;


                if (batch.type == 'Line') {
                    if (strokeDashimage) {
                        const dashImgTexture = this.atlasManager.load(strokeDashimage, {mipMaps: false});
                        if ((<Promise<ImageInfo>>dashImgTexture).then) {
                            this.waitAndRefresh(<Promise<ImageInfo>>dashImgTexture);
                            return;
                        }
                    }

                    if (requiresTerrain) {
                        altitude = null;
                    }

                    let vertexLength = this.lineFactory.createLine(
                        <GeoJSONCoordinate[]>coordinates,
                        batch,
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
                        batch.buffer.addUniform('u_dashTexture', this.atlasManager.getTexture(strokeDashimage));
                    }

                    batch.buffer.setIdOffset(feature.id);
                } else {
                    let isText = type == 'Text';
                    let anchor = getValue('anchor', style, feature, level);
                    anchor ??= isText ? 'Line' : 'Coordinate';

                    const textAnchor = isText && getValue('textAnchor', style, feature, level) as ParsedStyleProperty<TextStyle['textAnchor']>;
                    const checkCollisions = isText ? !collide : collide === false;

                    let w;
                    let h;

                    const from = getValue('from', style, feature, level);
                    const to = getValue('to', style, feature, level);

                    const isMapAligned = alignment == 'map';
                    // Let terrain VerticalLines use the feature coordinate z as their top altitude.
                    const placementAltitude = type == 'VerticalLine' && requiresTerrain ? true : altitude;

                    if (anchor == 'Line') {
                        if (collisionGroup) {
                            w = collisionGroup.width * 2;
                            h = collisionGroup.height * 2;
                        } else if (type == 'Icon') {
                            w = getValue('width', style, feature, level);
                            h = getValue('height', style, feature, level) || width;
                        } else if (batch.type == 'Text') {
                            if (!batch.buffer) {
                                const z = requiresTerrain ? null :
                                    typeof altitude == 'number' ?
                                        altitude : altitude ? <number>coordinates[2] || 0 : null;

                                batch.buffer = this.createTextBuffer(z === null, batch, true);
                            }
                            let texture = batch.buffer.uniforms.u_texture;
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
                            placementAltitude,
                            tile,
                            tileSize,
                            checkCollisions && this.collisions,
                            priority,
                            getValue('repeat', style, feature, level),
                            offsetX,
                            offsetY,
                            w,
                            h,
                            isMapAligned,
                            checkLineSpace,
                            from, to,
                            (x, y, z, rotationZ, rotationY, collisionData) => {
                                this.addPoint(
                                    batch,
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
                                    textAnchor,
                                    terrainRenderMode, resolvedModel
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
                            placementAltitude,
                            tile,
                            tileSize,
                            checkCollisions && this.collisions,
                            priority,
                            w,
                            h,
                            offsetX,
                            offsetY,
                            isMapAligned,
                            from,
                            to,
                            (x, y, z, rotZ, rotY, collisionData) => {
                                this.addPoint(
                                    batch,
                                    x,
                                    y,
                                    z,
                                    style,
                                    feature,
                                    collisionData,
                                    rotZ + rotation,
                                    UNDEF,
                                    text,
                                    UNDEF,
                                    textAnchor,
                                    terrainRenderMode, resolvedModel
                                );
                            }
                        );
                    }
                }
            } else {
                // Polygon geometry
                if (batch.type == 'Polygon' || batch.type == 'Extrude') {
                    if (!batch.buffer) {
                        const terrainRenderMode = batch.resolvedStyle.terrainRenderMode;
                        const requiresTerrain = altitude === 'terrain';
                        if (batch.type == 'Polygon') {
                            const flat = requiresTerrain || !altitude;
                            batch.buffer = new PolygonBuffer(flat);
                        } else {
                            batch.buffer = new ExtrudeBuffer();
                            if (terrainRenderMode === TerrainRenderMode.ONSCREEN) {
                                batch.buffer.setRequiresHeightMap(true);
                            }
                        }
                    }

                    const groupBuffer = batch.buffer;
                    const vIndex = <number[]>groupBuffer.index();
                    const positionAttribute = groupBuffer.getPositionAttribute();
                    const aPosition = positionAttribute.data;

                    flatPolyStart = aPosition.length;

                    if (batch.type == 'Extrude') {
                        let strokeIndex;

                        if (stroke) {
                            strokeIndex = batch.buffer.extrudeStrokeIndex ||= [];
                        }

                        flatPoly = addExtrude(
                            aPosition,
                            batch.buffer.flexAttributes.a_normal.data,
                            vIndex,
                            <GeoJSONCoordinate[][]>coordinates,
                            tile,
                            tileSize,
                            extrude,
                            extrudeBase,
                            strokeIndex
                        );
                    } else if (type == 'Polygon') {
                        flatPoly = addPolygon(
                            aPosition,
                            <GeoJSONCoordinate[][]>coordinates,
                            tile,
                            tileSize,
                            (typeof altitude === 'number' && altitude !== 0)
                                ? altitude
                                : positionAttribute.size === 3
                        );
                    }

                    batch.buffer.setIdOffset(feature.id);

                    if (!triangles) {
                        const geom = <any>feature.geometry;

                        if (geom._xyz) {
                            triangles = geom._xyz;
                        } else {
                            triangles = [];

                            for (let flat of flatPoly) {
                                let d = flat.dimensions;
                                let coords = aPosition.data.subarray(flat.start, flat.stop);
                                let tri = triangulatePolygon(coords, flat.holes, d);
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
            collisionGrp.geomType = renderGeometryType;
            collisionGrp.coordinates = coordinates;
            collisionGrp.pointCoverageBounds = pointCoverageBounds;

            collisionGrp.offsetX = x1 + halfWidth;
            collisionGrp.offsetY = y1 + halfHeight;
            collisionGrp.width = halfWidth;
            collisionGrp.height = halfHeight;

            this.pendingCollisions.push(collisionGrp);
        }
    }

    destroy() {
        this.modelResources.destroy();
    }
}
