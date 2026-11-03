/*
 * Copyright (C) 2019-2025 HERE Europe B.V.
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

import {GeometryBuffer} from './../GeometryBuffer';
import {Task} from '@here/xyz-maps-common';

import {getPolygonCenter, getValue} from '../../../styleTools';
import {Feature, StyleGroup, Tile, TileLayer, webMercator} from '@here/xyz-maps-core';
import {Layer} from '../../../Layers';
import {CollisionGroup, FeatureBufferBuilder} from './FeatureBufferBuilder';
import type {BatchesByZIndex} from './BufferBatch';
import {GeometryBufferBucket} from '../GeometryBufferBucket';
import {PASS} from '../../RenderPass';

const PROCESS_FEATURE_CHUNK_SIZE = 16;
const EXCLUSIVE_TIME_MS = 4;
let UNDEF;

const handlePolygons = (
    builder: FeatureBufferBuilder,
    feature: Feature,
    coordinates: number[][],
    styleGroup: StyleGroup,
    lsScale: number,
    tile: Tile,
    multiIndex: number = 0
): boolean => {
    const zoom = builder.zoom;

    for (let style of styleGroup) {
        const type = getValue('type', style, feature, zoom);
        if (type == 'Polygon' || type == 'Line') {
            if (getValue('extrude', style, feature, zoom)) {
                continue;
            }
            const stroke = getValue('stroke', style, feature, zoom);
            const strokeWidth = getValue('strokeWidth', style, feature, zoom);
            if (stroke && strokeWidth) {
                for (let linestring of coordinates) {
                    builder.addFeature(feature, 'LineString', linestring, [style], lsScale, tile.clipped, undefined, undefined,
                        style.fill ? strokeWidth > 3 : true, // ignore pointerevents for polygon outlines if fill is used
                        undefined, stroke, strokeWidth
                    );
                }
            }
        } else if (multiIndex == 0) {
            const center = getPolygonCenter(style, feature, zoom);
            // A building model can span its polygon footprint, so emit it in every covered tile,
            // even when its anchor is elsewhere. clipping then limits each instance to its tile.
            if (type === 'Model' || tile.isInside(center)) {
                builder.addFeature(feature, 'Point', center, [style], lsScale,
                    undefined, undefined, undefined, undefined,
                    // Use the polygon bounds as the model's tile coverage, independently of its anchor.
                    type === 'Model' ? feature.bbox : undefined
                );
            }
        }
    }
    return;
};

export type FeatureBufferBuildResult = { buffers: GeometryBuffer[], pendingResources: Promise<any>[] };

type TaskData = {
    tile: Tile,
    data: Feature[],
    zoomScale: number,
    featureIndex: number,
    chunkSize: number,
    layer: Layer,
    zoom: number,
    collisions: null | CollisionGroup[],
    batchesByZIndex: BatchesByZIndex,
    onDone: (buffers: GeometryBuffer[]) => FeatureBufferBuildResult
};

type TaskInput = {
    tile: Tile,
    displayLayer: Layer,
    onInit?: () => void,
    onDone?: (result: FeatureBufferBuildResult) => void
}


export class FeatureBufferBuildTask extends Task<TaskInput, TaskData, FeatureBufferBuildResult> {
    name = 'FeatureBufferBuildTask';
    time = EXCLUSIVE_TIME_MS;

    private builder: FeatureBufferBuilder;

    constructor(options: { priority?: number, builder: FeatureBufferBuilder }) {
        super(options);
        this.builder = options.builder;
    }

    init(data: TaskInput): TaskData {
        const {tile, displayLayer, onInit, onDone} = data;
        const layer = <TileLayer>displayLayer.layer;
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

        const batchesByZIndex: BatchesByZIndex = {};

        const pendingResources = [];
        const waitAndRefresh = (promise: Promise<any>) => {
            pendingResources.push(promise);
        };

        this.builder.init(tile, batchesByZIndex, layer.tileSize, zoom, layerStyles, waitAndRefresh);

        return {
            tile,
            data: tile.data || [],
            zoomScale: lsZoomScale,
            featureIndex: 0, // featureIndex
            chunkSize: PROCESS_FEATURE_CHUNK_SIZE,
            layer: displayLayer,
            zoom,
            collisions: null,
            batchesByZIndex,
            onDone(buffers) {
                const result = {buffers, pendingResources};
                onDone?.(result);
                return result;
            }
        };
    };

    onDone(taskData?: TaskData) {
        const zoomLevel = taskData.zoom;
        const meterToPixel = 1 / webMercator.getGroundResolution(zoomLevel);
        let buffers = [];
        let zIndex: string | number;
        const groups = taskData.batchesByZIndex;
        const displayLayer = taskData.layer;
        const tile = taskData.tile;

        for (zIndex in groups) {
            const zGroup = groups[zIndex];

            if (zGroup) {
                for (let batch of zGroup.batches) {
                    const {type, resolvedStyle} = batch;

                    if (!batch.buffer || batch.buffer.isEmpty()) {
                        // nothing to render..no need to create empty buffers -> skip.
                        continue;
                    }

                    const batchBuffers: GeometryBuffer[] = batch.buffer instanceof GeometryBufferBucket ? batch.buffer.toArray() : [batch.buffer];
                    const styleContext = batchBuffers[0]?.createStyleContext(resolvedStyle);
                    const hasAlphaColor = GeometryBuffer.hasAlphaColor(resolvedStyle);
                    for (let batchBuffer of batchBuffers) {
                        if (batchBuffer.isEmpty()) continue;
                        const geoBuffer = batchBuffer.finalize(type, resolvedStyle.light);

                        if (geoBuffer == null) continue;

                        geoBuffer.configureStyle(resolvedStyle, meterToPixel, hasAlphaColor, this.builder.textureManager, styleContext);
                        geoBuffer.pointerEvents = batch.pointerEvents;
                        buffers.push(geoBuffer);

                        let {zLayer} = batch;
                        // convert zIndex:'top' (deprecated) to zLayer
                        if (zIndex == 'top') {
                            zLayer = Infinity;
                            zIndex = 0;
                        }

                        zIndex = Number(zIndex);

                        if (!geoBuffer.flat) {
                            // geoBuffer.clip = false;

                            const {depthTest} = batch;
                            if (depthTest != UNDEF) {
                                geoBuffer.depth = depthTest;
                                if (!geoBuffer.pass || !depthTest) {
                                    // Ensure this buffer is rendered last so it remains visible
                                    // and is not obscured by transparent geometry
                                    geoBuffer.pass = PASS.ALPHA_COLOR;
                                }
                            }
                        }

                        displayLayer.addZ(zIndex, !geoBuffer.flat);
                        geoBuffer.zIndex = zIndex;
                        geoBuffer.zLayer = typeof zLayer == 'number' ? Math.ceil(zLayer) : null;

                        // scissoring is slow. we can skip if source data is already clipped on tile edges.
                        if (!batchBuffer.isPointGeometry && (
                            !tile.clipped ||
                            (displayLayer.layer as TileLayer).getMargin() > 0 ||
                            hasAlphaColor
                        )) {
                            geoBuffer.clip = true;
                        }
                    }
                }
            }
        }
        // console.log('buffers', buffers);
        return taskData.onDone(buffers.reverse());
    };

    exec(taskData: TaskData) {
        const {tile, data, layer, zoomScale: lsScale, zoom: level} = taskData;
        const builder = this.builder;
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
                                builder.addFeature(feature, simpleType, coords, styleGroups, lsScale);
                            }
                        } else if (geomType == 'MultiPolygon') {
                            builder.addFeature(feature, 'Polygon', coordinates, styleGroups, lsScale);

                            for (let p = 0; p < coordinates.length; p++) {
                                handlePolygons(builder, feature, coordinates[p], styleGroups, lsScale, tile, p);
                            }
                        } else {
                            const bounds = feature.bbox;
                            const pointCoverageBounds = geomType === 'Point' && bounds?.length === 4 &&
                                (bounds[0] < bounds[2] || bounds[1] < bounds[3]) ? bounds : undefined;
                            builder.addFeature(feature, geomType, coordinates, styleGroups, lsScale,
                                undefined, undefined, undefined, true, pointCoverageBounds);

                            if (geomType == 'Polygon') {
                                handlePolygons(builder, feature, coordinates, styleGroups, lsScale, tile);
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
        if (!notDone && builder.pendingCollisions.length) {
            if (!taskData.collisions) {
                // sort collision data by priority
                taskData.collisions = builder.pendingCollisions.sort((a, b) => a.priority - b.priority);
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
                            builder.addFeature(
                                candidate.feature,
                                geomType,
                                coordinates,
                                candidate.styleGrp,
                                lsScale,
                                false,
                                priority,
                                candidate,
                                true,
                                candidate.pointCoverageBounds
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
    };

    // icb(groups);
}
