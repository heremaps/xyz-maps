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

import {Color as Colors, TaskManager} from '@here/xyz-maps-common';
import {GeometryBuffer} from './GeometryBuffer';
import {getPolygonCenter, getValue} from '../../styleTools';
import {
    Feature, LayerStyle,
    LinearGradient,
    StyleGroup,
    Tile,
    TileLayer,
    webMercator
} from '@here/xyz-maps-core';
import {Layer} from '../../Layers';
import {CollisionGroup, FeatureFactory, GroupMap, isDynamicProperty} from './FeatureFactory';
import {GlyphTexture} from '../GlyphTexture';
import {TemplateBufferBucket} from './templates/TemplateBufferBucket';
import {Texture} from '../Texture';
import {ModelBuffer} from './templates/ModelBuffer';
import {PASS} from '../program/GLStates';
import {DEFAULT_HEATMAP_GRADIENT, HeatmapBuffer} from './templates/HeatmapBuffer';
import {DisplayTileTask} from '../../BasicTile';

const PROCESS_FEATURE_CHUNK_SIZE = 16;
const EXCLUSIVE_TIME_MS = 4;
const PRIORITY = 4;

const taskManager = TaskManager.getInstance();
const TO_RAD = Math.PI / 180;
const COLOR_UNDEFINED = new Float32Array([-1.0, -1.0, -1.0, -1.0]);

let UNDEF;

const handlePolygons = (
    factory: FeatureFactory,
    feature: Feature,
    coordinates: number[][],
    styleGroup: StyleGroup,
    lsScale: number,
    tile: Tile,
    multiIndex: number = 0
): boolean => {
    const zoom = factory.z;

    for (let style of styleGroup) {
        const type = getValue('type', style, feature, zoom);
        if (type == 'Polygon' || type == 'Line') {
            const {type: orgType, stroke: orgStroke, strokeWidth: orgStrokwWidth} = style;
            let stroke = getValue('stroke', style, feature, zoom);
            let strokeWidth = getValue('strokeWidth', style, feature, zoom);
            if (stroke && strokeWidth) {
                style.type = 'Line';
                style.stroke = stroke;
                style.strokeWidth = strokeWidth;

                for (let linestring of coordinates) {
                    factory.create(feature, 'LineString', linestring, [style], lsScale, tile.clipped, undefined, undefined,
                        style.fill ? strokeWidth > 3 : true // ignore pointerevents for polygon outlines if fill is used
                    );
                }
                style.type = orgType;
                style.stroke = orgStroke;
                style.strokeWidth = strokeWidth;
            }
        } else if (multiIndex == 0) {
            const {bounds} = tile;
            const center = getPolygonCenter(style, feature, zoom);
            const [cx, cy] = center;

            if (cx >= bounds[0] && cy >= bounds[1] && cx < bounds[2] && cy < bounds[3]) {
                factory.create(feature, 'Point', center, [style], lsScale);
            }
        }
    }
    return;
};

type TaskData = {
    tile: Tile,
    data: Feature[],
    zoomScale: number,
    featureIndex: number,
    chunkSize: number,
    layer: Layer,
    zoom: number,
    collisions: null | CollisionGroup[],
    groups: GroupMap,
    showWireframe: LayerStyle['showWireframe']
};


const createBuffer = (
    displayLayer: Layer,
    tileSize: number,
    tile: Tile,
    factory: FeatureFactory,
    onInit: () => void,
    onDone: (data: GeometryBuffer[], pendingResources: Promise<any>[]) => void
): DisplayTileTask => {
    const layer = <TileLayer>displayLayer.layer;
    // const groups: GroupMap = {};
    const pendingResources = [];
    const waitAndRefresh = (promise: Promise<any>) => {
        pendingResources.push(promise);
    };

    const task = <DisplayTileTask>taskManager.create({

        time: EXCLUSIVE_TIME_MS,

        priority: PRIORITY,

        init: function(): TaskData {
            const zoom = tile.z + layer.levelOffset;
            const layerStyles = layer.getStyle();
            let lsZoomScale = 1; // DEFAULT_STROKE_WIDTH_ZOOM_SCALE;

            if (layerStyles) {
                const layerScale = layerStyles['strokeWidthZoomScale'] || layerStyles['LineStringZoomScale'];
                if (layerScale) {
                    lsZoomScale = layerScale(zoom);
                }
            }

            onInit?.();

            const groups: GroupMap = {};

            factory.init(tile, groups, tileSize, zoom, layerStyles.zLayer, waitAndRefresh);

            const {showWireframe} = layerStyles;

            return {
                tile,
                data: tile.data || [],
                zoomScale: lsZoomScale,
                featureIndex: 0, // featureIndex
                chunkSize: PROCESS_FEATURE_CHUNK_SIZE,
                layer: displayLayer,
                zoom,
                collisions: null,
                groups,
                showWireframe: (showWireframe && typeof showWireframe != 'boolean') ? Colors.toRGB(showWireframe) : showWireframe
            };
        },

        name: 'createBuffer',

        onDone: function(taskData: TaskData) {
            const zoomLevel = taskData.zoom;
            const meterToPixel = 1 / webMercator.getGroundResolution(zoomLevel);
            let buffers = [];
            let zIndex: string | number;
            const groups = taskData.groups;

            for (zIndex in groups) {
                const zGroup = groups[zIndex];

                if (zGroup) {
                    for (let grp of zGroup.groups) {
                        let type = grp.type;
                        let shared = grp.shared;
                        let stroke = shared.stroke;
                        let strokeWidth = shared.strokeWidth;
                        let vertexType = type;
                        // grpBuffer = grp.buffer;

                        if (!grp.buffer || grp.buffer.isEmpty()) {
                            // if (!grpBuffer || grpBuffer.isEmpty()) {
                            // nothing to render..no need to create empty buffers -> skip.
                            continue;
                        }

                        const grpBuffers = grp.buffer instanceof TemplateBufferBucket ? grp.buffer.toArray() : [grp.buffer];
                        for (let grpBuffer of grpBuffers) {
                            // geoBuffer = grpBuffer.finalize(type);
                            const geoBuffer: GeometryBuffer = GeometryBuffer.fromTemplateBuffer(type, grpBuffer, shared.light);

                            if (geoBuffer == null) continue;

                            // let hasAlphaColor = false;
                            const fillOpacity = shared.fill?.[3];
                            const strokeOpacity = shared.stroke?.[3];
                            const hasFillAlpha = fillOpacity < 1;
                            const hasAlphaColor = hasFillAlpha || strokeOpacity < 1;

                            geoBuffer.flat = grpBuffer.isFlat();
                            geoBuffer.addUniform('u_scaleByAltitude', shared.scaleByAltitude);
                            geoBuffer.pointerEvents = grp.pointerEvents;

                            if (vertexType == 'VerticalLine') {
                                geoBuffer.groups[0].mode = GeometryBuffer.MODE_GL_LINES;
                                geoBuffer.type = 'Polygon';
                                geoBuffer.addUniform('u_fill', shared.stroke);
                                geoBuffer.addUniform('u_offsetZ', [shared.offsetZ, 0]);
                            }

                            buffers.push(geoBuffer);

                            if (type == 'Line') {
                                if (shared.strokeDasharray) {
                                    geoBuffer.type = 'DashedLine';

                                    geoBuffer.addUniform('u_dashUnit', [
                                        shared.strokeDasharray.units[0] == 'm' ? meterToPixel : 0,
                                        shared.strokeDasharray.units[1] == 'm' ? meterToPixel : 0
                                    ]);
                                }
                                // scissor un-clipped geometry in any case...(huge geometry possible)
                                // otherwise clipping can be skipped to avoid strokeWidth cutoffs close to tile edges
                                geoBuffer.clip = !tile.clipped;

                                geoBuffer.addUniform('u_fill', stroke);

                                // if (isDynamicProperty(shared.strokeWidth)) debugger;

                                geoBuffer.addUniform('u_strokeWidth', [strokeWidth, shared.unit == 'm' ? meterToPixel : 0]);
                                // geoBuffer.addUniform('u_strokeWidth', [strokeWidth * .5, shared.unit == 'm' ? meterToPixel : 0]);

                                geoBuffer.addUniform('u_offset', [shared.offsetX,
                                    shared.offsetUnit == 'm' ? meterToPixel : 0
                                ]);

                                geoBuffer.addUniform('u_no_antialias', false);
                                // geoBuffer.addUniform('u_no_antialias', !grpBuffer.isFlat());

                                geoBuffer.pass = PASS.ALPHA;
                                if (!geoBuffer.isFlat() || shared.strokeDasharray || hasAlphaColor) {
                                    geoBuffer.pass |= PASS.POST_ALPHA;
                                }
                                geoBuffer.depth = geoBuffer.blend = true;
                            } else {
                                if (type == 'Polygon' || type == 'Extrude') {
                                    geoBuffer.addUniform('u_fill', shared.fill);
                                    geoBuffer.addUniform('u_fillIntensity', shared.fillIntensity);

                                    if (type == 'Extrude') {
                                        geoBuffer.addUniform('u_strokePass', 0);

                                        if (shared.stroke) {
                                            const indexGroup = geoBuffer.addGroup(grp.extrudeStrokeIndex, grpBuffer.i32, 1);
                                            indexGroup.uniforms = {
                                                'u_strokePass': 1,
                                                'u_stroke': shared.stroke
                                            };
                                        }
                                    }
                                    if (hasAlphaColor) {
                                        geoBuffer.pass = PASS.ALPHA;
                                        if (type == 'Extrude') {
                                            geoBuffer.pass |= PASS.POST_ALPHA;
                                        }
                                        geoBuffer.depth = geoBuffer.blend = true;
                                    }
                                } else {
                                    if (type == 'Text' || type == 'Icon') {
                                        if (type == 'Text') {
                                            (geoBuffer.uniforms.u_texture as GlyphTexture).sync();
                                            geoBuffer.addUniform('u_fillColor', shared.fill || COLOR_UNDEFINED);
                                            geoBuffer.addUniform('u_strokeColor', shared.stroke || COLOR_UNDEFINED);
                                        } else {
                                            geoBuffer.addUniform('u_opacity', shared.opacity);
                                        }

                                        const texture = geoBuffer.uniforms.u_texture as Texture;
                                        geoBuffer.addUniform('u_texSize', [texture.width, texture.height]);

                                        geoBuffer.addUniform('u_alignMap', shared.alignment == 'map');

                                        geoBuffer.pass = PASS.ALPHA;
                                        geoBuffer.depth = geoBuffer.blend = true;
                                        // geoBuffer.addUniform('u_offset', [shared.offsetX, shared.offsetY]);
                                    } else if (type == 'Rect' || type == 'Circle' || type == 'Box' || type == 'Sphere') {
                                        const fill = shared.fill || COLOR_UNDEFINED;

                                        geoBuffer.addUniform('u_fill', fill);
                                        geoBuffer.addUniform('u_fillIntensity', shared.fillIntensity);

                                        if (stroke) {
                                            geoBuffer.addUniform('u_stroke', stroke);
                                            if (strokeWidth == UNDEF) strokeWidth = 1;
                                        }
                                        geoBuffer.addUniform('u_strokeWidth', strokeWidth ^ 0);

                                        const toPixel = shared.unit == 'm' ? meterToPixel : 0;


                                        if (type == 'Circle' || type == 'Sphere') {
                                            // geoBuffer.addUniform('u_radius', shared.radius);
                                            geoBuffer.addUniform('u_radius', [shared.width, toPixel]);
                                        } else {
                                            if (fill == COLOR_UNDEFINED) {
                                                // use blend to enable shader to not use discard (faster)
                                                geoBuffer.pass = PASS.ALPHA;
                                                geoBuffer.blend = true;
                                            }
                                            if (type == 'Rect') {
                                                geoBuffer.addUniform('u_size', [shared.width, toPixel, shared.height, toPixel]);
                                            }
                                            geoBuffer.addUniform('u_rotation', shared.rotation * TO_RAD);
                                        }

                                        if (hasAlphaColor) {
                                            geoBuffer.pass = PASS.ALPHA;
                                            geoBuffer.depth = geoBuffer.blend = true;
                                        }

                                        geoBuffer.addUniform('u_alignMap', shared.alignment == 'map');
                                    } else if (type == 'Heatmap') {
                                        geoBuffer.addUniform('u_radius', [shared.width, 0]);
                                        geoBuffer.addUniform('u_weight', 1.);
                                        geoBuffer.addUniform('u_intensity', typeof shared.height == 'number' ? shared.height : 1);
                                        geoBuffer.addUniform('u_opacity', shared.opacity);
                                        geoBuffer.pass = PASS.ALPHA | PASS.POST_ALPHA;
                                        geoBuffer.flat = true;
                                        geoBuffer.depth = false;
                                        geoBuffer.blend = false;

                                        const gradient = (<unknown>shared.fill as LinearGradient)?.stops || DEFAULT_HEATMAP_GRADIENT.stops;

                                        const gradientTexture = factory.textureManager.getGradientTexture(gradient, HeatmapBuffer.verifyAndFixGradient);
                                        geoBuffer.addUniform('u_gradient', gradientTexture);
                                    }

                                    if (shared.offsetUnit) {
                                        geoBuffer.addUniform('u_offset', [
                                            shared.offsetX, shared.offsetUnit[0] == 'm' ? meterToPixel : 0,
                                            shared.offsetY, shared.offsetUnit[1] == 'm' ? meterToPixel : 0
                                        ]);
                                        geoBuffer.addUniform('u_offsetZ', [shared.offsetZ, shared.offsetUnit[2] == 'm' ? meterToPixel : 0]);
                                    }

                                    if (type == 'Model') {
                                        if (shared.modelMode) {
                                            // terrain model -> scale xy in pixel
                                            geoBuffer.addUniform('u_zMeterToPixel', 1);
                                        }

                                        if (!geoBuffer.attributes.a_normal) {
                                            geoBuffer.addAttribute('a_normal', {
                                                data: geoBuffer.computeNormals(),
                                                size: 3,
                                                normalized: true
                                            });
                                        }
                                        geoBuffer.bbox = (grpBuffer as ModelBuffer).bbox;
                                        geoBuffer.id = (grpBuffer as ModelBuffer).id;
                                        geoBuffer.zRange = shared.modelMode || null;
                                        geoBuffer.destroy = (grpBuffer as ModelBuffer).destroy || geoBuffer.destroy;
                                        geoBuffer.depth = true;

                                        const {showWireframe} = taskData;
                                        if (showWireframe) {
                                            const wireFrame = geoBuffer.addGroup(
                                                (grpBuffer as ModelBuffer).generateWireframeIndices(),
                                                grpBuffer.i32,
                                                GeometryBuffer.MODE_GL_LINES
                                            );
                                            wireFrame.uniforms = {
                                                // invert diffuse color for wireframe
                                                diffuse: ((showWireframe === true ? geoBuffer.getUniform('diffuse') : showWireframe) as number[])
                                                    .slice(0, 3)
                                                    .map((c) => 1 - c)
                                            };
                                        }

                                        if (geoBuffer.uniforms.pointSize) {
                                            geoBuffer.groups[0].mode = GeometryBuffer.MODE_GL_POINTS;
                                        }

                                        if (geoBuffer.uniforms.opacity < 1.0) {
                                            geoBuffer.pass = PASS.ALPHA;
                                            geoBuffer.blend = true;
                                        }
                                    }
                                }
                                geoBuffer.clip = grpBuffer.clip;


                                // model emissive/specular lightning uniforms have already been merged with material.
                                if (type != 'Model') {
                                    if (shared.emissive) {
                                        geoBuffer.addUniform('u_emissive.color', shared.emissive);
                                    }
                                    if (shared.specular) {
                                        geoBuffer.addUniform('specular', shared.specular);
                                        geoBuffer.addUniform('shininess', shared.shininess);
                                    }
                                }
                            }

                            let {zLayer} = grp;
                            // convert zIndex:'top' (deprecated) to zLayer
                            if (zIndex == 'top') {
                                zLayer = Infinity;
                                zIndex = 0;
                            }

                            zIndex = Number(zIndex);

                            if (!geoBuffer.flat) {
                                geoBuffer.clip = false;
                                // geoBuffer.depth = true;
                                // geoBuffer.alpha = true;

                                const {depthTest} = grp;
                                if (depthTest != UNDEF) {
                                    geoBuffer.depth = depthTest;
                                    if (!geoBuffer.pass || !depthTest) {
                                        // Ensure this buffer is rendered last so it remains visible
                                        // and is not obscured by transparent geometry
                                        geoBuffer.pass = PASS.ALPHA;
                                    }
                                }
                            }

                            displayLayer.addZ(zIndex, !geoBuffer.flat);
                            geoBuffer.zIndex = zIndex;
                            geoBuffer.zLayer = typeof zLayer == 'number' ? Math.ceil(zLayer) : null;

                            // scissoring is slow. we can skip if source data is already clipped on tile edges.
                            geoBuffer.clip ??= !tile.clipped || layer.getMargin() > 0 || hasAlphaColor;
                        }
                    }
                }
            }
            // console.log('buffers', buffers);
            onDone(buffers.reverse(), pendingResources);
        },

        exec: function(taskData: TaskData) {
            const {tile, data, layer, zoomScale: lsScale, zoom: level} = taskData;
            let dataLen = data.length;
            let styleGroups;
            let feature;
            let geom;
            let geomType;
            let notDone;

            if (!taskData.collisions) {
                notDone ||= false;
                while (taskData.chunkSize--) {
                    if (feature = data[taskData.featureIndex++]) {
                        styleGroups = layer.processStyleGroup(feature, level);

                        if (styleGroups) {
                            geom = feature.geometry;
                            geomType = geom.type;

                            if (!styleGroups.length) {
                                styleGroups = [styleGroups];
                            }

                            const coordinates = feature.getProvider().decCoord(feature);

                            if (geomType == 'MultiLineString' || geomType == 'MultiPoint') {
                                const simpleType = geomType == 'MultiPoint' ? 'Point' : 'LineString';

                                for (let coords of coordinates) {
                                    factory.create(feature, simpleType, coords, styleGroups, lsScale);
                                }
                            } else if (geomType == 'MultiPolygon') {
                                factory.create(feature, 'Polygon', coordinates, styleGroups, lsScale);

                                for (let p = 0; p < coordinates.length; p++) {
                                    handlePolygons(factory, feature, coordinates[p], styleGroups, lsScale, tile, p);
                                }
                            } else {
                                factory.create(feature, geomType, coordinates, styleGroups, lsScale);

                                if (geomType == 'Polygon') {
                                    handlePolygons(factory, feature, coordinates, styleGroups, lsScale, tile);
                                }
                            }
                            // if (task.paused) {
                            // awaiting asynchronous operation...
                            // return notDone = true;
                            // }
                        }
                    } else {
                        // feature count < bundle size -> next
                        break;
                    }
                }

                notDone = taskData.featureIndex < dataLen;
            }

            // handle pending collisions...
            if (!notDone && factory.pendingCollisions.length) {
                if (!taskData.collisions) {
                    // sort collision data by priority
                    taskData.collisions = factory.pendingCollisions.sort((a, b) => a.priority - b.priority);
                    // reset/reuse feature index
                    taskData.featureIndex = 0;
                }
                let cData = taskData.collisions;
                let candidate;

                if (taskData.chunkSize >= 0) {
                    while (taskData.chunkSize--) {
                        if (candidate = cData[taskData.featureIndex++]) {
                            const {coordinates, priority, geomType} = candidate;

                            if (geomType == 'Point' || geomType == 'LineString') {
                                factory.create(
                                    candidate.feature,
                                    geomType,
                                    coordinates,
                                    candidate.styleGrp,
                                    lsScale,
                                    false,
                                    priority,
                                    candidate
                                );
                            }
                        } else {
                            break;
                        }
                    }
                }
                notDone = taskData.featureIndex < (<CollisionGroup[]>cData).length;
            }

            taskData.chunkSize = PROCESS_FEATURE_CHUNK_SIZE;

            return notDone;
        }
        // icb(groups);
    });

    task.outdated = false;
    taskManager.start(task);
    return task;
};

export {createBuffer};
