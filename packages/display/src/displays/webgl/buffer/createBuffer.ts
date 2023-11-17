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

import {geometry, TaskManager} from '@here/xyz-maps-common';
import {GeometryBuffer} from './GeometryBuffer';
import {getValue, parseStyleGroup} from '../../styleTools';
import {Feature, LinearGradient, StyleGroup, Tile, TileLayer, webMercator} from '@here/xyz-maps-core';
import {Layer} from '../../Layers';
import {CollisionGroup, FeatureFactory, GroupMap} from './FeatureFactory';
import {GlyphTexture} from '../GlyphTexture';
import {TemplateBufferBucket} from './templates/TemplateBufferBucket';
import {Texture} from '../Texture';
import {ModelBuffer} from './templates/ModelBuffer';
import {PASS} from '../program/GLStates';
import {DEFAULT_HEATMAP_GRADIENT, HeatmapBuffer} from './templates/HeatmapBuffer';

const {centroid} = geometry;

const PROCESS_FEATURE_BUNDLE_SIZE = 16;
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
        const styleType = style.type;
        const type = getValue('type', style, feature, zoom);
        if (type == 'Polygon' || type == 'Line') {
            if (getValue('stroke', style, feature, zoom)) {
                style.type = 'Line';
                for (let linestring of coordinates) {
                    factory.create(feature, 'LineString', linestring, [style], lsScale, tile.clipped);
                }
                style.type = styleType;
            }
        } else if (multiIndex == 0) {
            const {bounds} = tile;
            const {bbox} = feature;
            const anchor = getValue('anchor', style, feature, zoom);
            let center;

            if (anchor == 'Centroid') {
                const {geometry} = feature;
                center = geometry._c = geometry._c || centroid(geometry.type == 'Polygon' ? geometry.coordinates : geometry.coordinates[0]);
            } else {
                center = [bbox[0] + (bbox[2] - bbox[0]) / 2, bbox[1] + (bbox[3] - bbox[1]) / 2];
            }

            const [cx, cy] = center;

            if (cx >= bounds[0] && cy >= bounds[1] && cx < bounds[2] && cy < bounds[3]) {
                factory.create(feature, 'Point', center, [style], lsScale);
            }
        }
    }
    return;
};

type TaskData = [Tile, Feature[], number, number, number, TileLayer, number, boolean | CollisionGroup[]];

const createBuffer = (
    data: Feature[],
    renderLayer: Layer,
    tileSize: number,
    tile: Tile,
    factory: FeatureFactory,
    onInit: () => void,
    onDone: (data: GeometryBuffer[], pendingResources: Promise<any>[]) => void
) => {
    const layer = <TileLayer>renderLayer.layer;
    const groups: GroupMap = {};
    const pendingResources = [];
    const waitAndRefresh = (promise: Promise<any>) => {
        pendingResources.push(promise);
    };

    const task = taskManager.create({

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

            if (onInit) {
                onInit();
            }

            factory.init(tile, groups, tileSize, zoom, waitAndRefresh);

            return [
                tile,
                data,
                lsZoomScale,
                0, // featureIndex
                PROCESS_FEATURE_BUNDLE_SIZE,
                layer,
                zoom,
                false
            ];
        },

        name: 'createBuffer',

        onDone: function(taskData: TaskData) {
            const zoomLevel = taskData[6];
            const meterToPixel = 1 / webMercator.getGroundResolution(zoomLevel);
            let buffers = [];
            let zIndex: string | number;

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
                            const geoBuffer: GeometryBuffer = GeometryBuffer.fromTemplateBuffer(type, grpBuffer);

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
                                    geoBuffer.addUniform('u_hasDashTexture', !!(geoBuffer.uniforms.u_dashTexture));

                                    geoBuffer.addUniform('u_dashUnit', [
                                        shared.strokeDasharray.units[0] == 'm' ? meterToPixel : 0,
                                        shared.strokeDasharray.units[1] == 'm' ? meterToPixel : 0
                                    ]);
                                }
                                // scissor un-clipped geometry in any case...(huge geometry possible)
                                // otherwise clipping can be skipped to avoid strokeWidth cutoffs close to tile edges
                                geoBuffer.clip = !tile.clipped;

                                geoBuffer.addUniform('u_fill', stroke);

                                geoBuffer.addUniform('u_strokeWidth', [strokeWidth * .5, shared.unit == 'm' ? meterToPixel : 0]);

                                geoBuffer.addUniform('u_offset', [shared.offsetX,
                                    shared.offsetUnit == 'm' ? meterToPixel : 0
                                ]);

                                geoBuffer.addUniform('u_no_antialias', false);
                                // geoBuffer.addUniform('u_no_antialias', !grpBuffer.isFlat());

                                geoBuffer.pass = PASS.ALPHA;
                                if ( !geoBuffer.isFlat() || shared.strokeDasharray || hasAlphaColor) {
                                    geoBuffer.pass |= PASS.POST_ALPHA;
                                }
                                geoBuffer.depth = geoBuffer.blend = true;
                            } else {
                                if (type == 'Polygon' || type == 'Extrude') {
                                    geoBuffer.addUniform('u_fill', shared.fill);

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

                                            geoBuffer.addUniform('u_size', [shared.width, toPixel, shared.height, toPixel]);
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

                                        const gradientTexture = factory.gradients.getTexture(gradient, HeatmapBuffer.verifyAndFixGradient);
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
                                        geoBuffer.addUniform('u_meterToPixel', meterToPixel);
                                        if (shared.modelMode) {
                                            // terrain model -> scale xy in pixel
                                            geoBuffer.addUniform('u_groundResolution', 1);
                                        }

                                        if (!geoBuffer.attributes.a_normal) {
                                            const normals = geoBuffer.computeNormals();
                                            geoBuffer.addAttribute('a_normal', {
                                                data: normals,
                                                size: 3,
                                                normalized: true
                                            });
                                        }
                                        geoBuffer.bbox = (grpBuffer as ModelBuffer).bbox;
                                        geoBuffer.id = (grpBuffer as ModelBuffer).id;
                                        geoBuffer.hitTest = shared.modelMode || 0;
                                        geoBuffer.destroy = (grpBuffer as ModelBuffer).destroy || geoBuffer.destroy;
                                        geoBuffer.depth = true;

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

                                if (grp.depthTest != UNDEF) {
                                    geoBuffer.depth = grp.depthTest;
                                    if (!geoBuffer.pass) geoBuffer.pass = PASS.ALPHA;
                                }
                            }

                            renderLayer.addZ(zIndex, !geoBuffer.flat);
                            geoBuffer.zIndex = zIndex;
                            geoBuffer.zLayer = typeof zLayer == 'number' ? Math.ceil(zLayer) : null;

                            if (geoBuffer.clip == UNDEF) {
                                // scissoring is slow. we can skip if source data is already clipped on tile edges.
                                geoBuffer.clip = !tile.clipped || layer.getMargin() > 0 || hasAlphaColor;
                            }
                        }
                    }
                }
            }

            onDone(buffers.reverse(), pendingResources);
        },

        exec: function(taskData: TaskData) {
            let tile = taskData[0];
            let data = taskData[1];
            const lsScale = taskData[2];
            let displayLayer = taskData[5];
            let dataLen = data.length;

            const level = taskData[6];
            let styleGroups;
            let feature;
            let geom;
            let geomType;
            let notDone;

            if (!taskData[7]) {
                notDone ||= false;
                while (taskData[4]--) {
                    if (feature = data[taskData[3]++]) {
                        styleGroups = displayLayer.getStyleGroup(feature, level);

                        if (styleGroups) {
                            geom = feature.geometry;
                            geomType = geom.type;

                            if (!styleGroups.length) {
                                styleGroups = [styleGroups];
                            }

                            parseStyleGroup(styleGroups);

                            // const coordinates = geom.coordinates;
                            const coordinates = feature.getProvider().decCoord(feature);

                            if (geomType == 'MultiLineString' || geomType == 'MultiPoint') {
                                const simpleType = geomType == 'MultiPoint' ? 'Point' : 'LineString';

                                for (let coords of coordinates) {
                                    factory.create(feature, simpleType, coords, styleGroups, lsScale);
                                }
                            } else if (geomType == 'MultiPolygon') {
                                factory.create(feature, 'Polygon', coordinates, styleGroups, lsScale);

                                for (let p = 0; p < coordinates.length; p++) {
                                    let polygon = coordinates[p];
                                    // for (let polygon of coordinates) {
                                    handlePolygons(factory, feature, polygon, styleGroups, lsScale, tile, p);
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

                notDone = taskData[3] < dataLen;
            }

            // handle pending collisions...
            if (!notDone && factory.pendingCollisions.length) {
                if (!taskData[7]) {
                    // sort collision data by priority
                    taskData[7] = factory.pendingCollisions.sort((a, b) => a.priority - b.priority);
                    // reset/reuse feature index
                    taskData[3] = 0;
                }
                let cData = taskData[7];
                let candidate;

                if (taskData[4] >= 0) {
                    while (taskData[4]--) {
                        if (candidate = cData[taskData[3]++]) {
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
                notDone = taskData[3] < (<CollisionGroup[]>cData).length;
            }

            taskData[4] = PROCESS_FEATURE_BUNDLE_SIZE;

            return notDone;
        }
        // icb(groups);
    });

    taskManager.start(task);
    return task;
};

export {createBuffer};
