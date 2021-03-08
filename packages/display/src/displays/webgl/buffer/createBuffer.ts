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

import {TaskManager} from '@here/xyz-maps-common';
import {GeometryBuffer} from './GeometryBuffer';
import {getValue, parseStyleGroup} from '../../styleTools';
import {Tile, webMercator} from '@here/xyz-maps-core';
import {Layer} from '../../Layers';
import {FeatureFactory} from './FeatureFactory';
import {TemplateBuffer} from './templates/TemplateBuffer';
import {GlyphTexture} from '../GlyphTexture';

// const DEFAULT_STROKE_WIDTH_ZOOM_SCALE = () => 1;
const PROCESS_FEATURE_BUNDLE_SIZE = 16;
const EXCLUSIVE_TIME_MS = 4;
const PRIORITY = 4;

const taskManager = TaskManager.getInstance();
const TO_RAD = Math.PI / 180;
const COLOR_UNDEFINED = new Float32Array([-1.0, -1.0, -1.0, -1.0]);

let UNDEF;

const handlePolygons = (factory: FeatureFactory, feature, coordinates, styleGroups, lsScale, tile) => {
    const zoom = factory.z;

    for (let style of styleGroups) {
        const styleType = style.type;
        const type = getValue('type', style, feature, zoom);

        if (type == 'Text') {
            const bbox = feature.bbox;
            const center = [bbox[0] + (bbox[2] - bbox[0]) / 2, bbox[1] + (bbox[3] - bbox[1]) / 2];
            const cx = center[0];
            const cy = center[1];
            const tileBounds = tile.bounds;
            if (cx >= tileBounds[0] && cy >= tileBounds[1] && cx < tileBounds[2] && cy < tileBounds[3]) {
                factory.create(feature, 'Point', center, [style], lsScale);
            }
        } else if ((type == 'Polygon' || type == 'Line') && getValue('stroke', style, feature, zoom)) {
            style.type = 'Line';
            for (let linestring of coordinates) {
                factory.create(feature, 'LineString', linestring, [style], lsScale, tile.clipped);
            }
            style.type = styleType;
        }
    }
};

const createBuffer = (
    data: any[],
    renderLayer: Layer,
    tileSize: number,
    tile: Tile,
    factory: FeatureFactory,
    onInit: () => void,
    onDone: (data: GeometryBuffer[], imagesLoaded: boolean) => void
) => {
    const {layer} = renderLayer;
    const groups = {};
    let iconsLoaded = true;

    const task = taskManager.create({

        time: EXCLUSIVE_TIME_MS,

        priority: PRIORITY,

        init: function() {
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

            factory.init(tile, groups, tileSize, zoom);

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

        onDone: function(args) {
            const zoomLevel = args[6];
            let extrudeScale = Math.pow(2, 17 - zoomLevel);
            const meterToPixel = 1 / webMercator.getGroundResolution(zoomLevel);
            let buffers = [];
            let geoBuffer: GeometryBuffer;
            let grpBuffer: TemplateBuffer;
            let zGroup;
            let grp;
            let type;
            let shared;
            let stroke;
            let strokeWidth;
            let vertexType;

            let zIndex: string | number;
            for (zIndex in groups) {
                zGroup = groups[zIndex];

                if (zGroup) {
                    for (let g = 0; g < zGroup.length; g++) {
                        grp = zGroup[g];
                        type = grp.type;
                        shared = grp.shared;
                        stroke = shared.stroke;
                        strokeWidth = shared.strokeWidth;
                        vertexType = type;
                        grpBuffer = grp.buffer;

                        if (vertexType == 'Text') {
                            if (!grp.texture) { // TODO: CLEANUP!!
                                continue;
                            }
                        }

                        if (!grpBuffer || grpBuffer.isEmpty()) {
                            // nothing to render..no need to create empty buffers -> skip.
                            continue;
                        }

                        if (grpBuffer.hasIndex()) {
                            const index = grpBuffer.index();
                            if (!index.length) continue;

                            geoBuffer = new GeometryBuffer(index, type, grpBuffer.i32);
                        } else {
                            geoBuffer = new GeometryBuffer({
                                first: grpBuffer.first,
                                count: grpBuffer.count()
                            }, type);
                        }

                        const {attributes} = grpBuffer;

                        for (let name in attributes) {
                            let attr = attributes[name];
                            if (attr.data.length) {
                                geoBuffer.addAttribute(name, grpBuffer.trimAttribute(attr));
                            }
                        }

                        buffers.push(geoBuffer);

                        if (type == 'Line') {
                            if (shared.strokeDasharray) {
                                geoBuffer.type = 'DashedLine';
                                geoBuffer.texture = grp.texture;
                                geoBuffer.addUniform('u_texWidth', grp.texture.width);
                                geoBuffer.addUniform('u_pattern', 0);
                            }
                            geoBuffer.addUniform('u_fill', stroke);

                            geoBuffer.addUniform('u_strokeWidth', [strokeWidth * .5, shared.unit == 'm' ? meterToPixel : 0]);

                            geoBuffer.addUniform('u_offset', [shared.offsetX,
                                shared.offsetUnit == 'm' ? meterToPixel : 0
                            ]);

                            geoBuffer.alpha = true;
                            // geoBuffer.blend = true;
                        } else if (type == 'Polygon' || type == 'Extrude') {
                            geoBuffer.addUniform('u_fill', shared.fill);

                            if (type == 'Extrude') {
                                geoBuffer.addUniform('u_zoom', extrudeScale);
                                geoBuffer.scissor = false;
                            }
                        } else {
                            if (type == 'Text' || type == 'Icon') {
                                geoBuffer.scissor = grpBuffer.scissor;
                                geoBuffer.texture = grp.texture;

                                if (type == 'Text') {
                                    (<GlyphTexture>geoBuffer.texture).sync();
                                    geoBuffer.addUniform('u_fillColor', shared.fill || COLOR_UNDEFINED);
                                    geoBuffer.addUniform('u_strokeColor', shared.stroke || COLOR_UNDEFINED);
                                }
                                geoBuffer.addUniform('u_texture', 0);
                                geoBuffer.addUniform('u_atlasScale', 1 / geoBuffer.texture.width);
                                geoBuffer.addUniform('u_alignMap', shared.alignment == 'map');

                                geoBuffer.addUniform('u_offset', [shared.offsetX, shared.offsetY]);
                            } else if (type == 'Rect' || type == 'Circle') {
                                geoBuffer.scissor = grpBuffer.scissor;

                                const fill = shared.fill || COLOR_UNDEFINED;

                                geoBuffer.addUniform('u_fill', fill);

                                if (stroke) {
                                    geoBuffer.addUniform('u_stroke', stroke);
                                    if (strokeWidth == UNDEF) strokeWidth = 1;
                                }
                                geoBuffer.addUniform('u_strokeWidth', strokeWidth ^ 0);

                                const toPixel = shared.unit == 'm' ? meterToPixel : 0;

                                if (type == 'Circle') {
                                    // geoBuffer.addUniform('u_radius', shared.radius);
                                    geoBuffer.addUniform('u_radius', [shared.radius, toPixel]);
                                } else {
                                    if (fill == COLOR_UNDEFINED) {
                                        // use blend to enable shader to not use discard (faster)
                                        geoBuffer.alpha = true;
                                        geoBuffer.blend = true;
                                    }

                                    geoBuffer.addUniform('u_size', [shared.width, toPixel, shared.height, toPixel]);
                                }
                                geoBuffer.addUniform('u_alignMap', shared.alignment == 'map');

                                geoBuffer.addUniform('u_offset', [
                                    shared.offsetX, shared.offsetUnit[0] == 'm' ? meterToPixel : 0,
                                    shared.offsetY, shared.offsetUnit[1] == 'm' ? meterToPixel : 0
                                ]);
                            }
                        }

                        const fillOpacity = shared.fill && shared.fill[3];
                        const strokeOpacity = shared.stroke && shared.stroke[3];
                        const hasAlphaColor = fillOpacity < 1 || strokeOpacity < 1;

                        if (hasAlphaColor) {
                            geoBuffer.alpha = true;
                            geoBuffer.blend = true;
                            geoBuffer.depth = true;
                        }

                        geoBuffer.addUniform('u_rotation', shared.rotation * TO_RAD);


                        let {zLayer} = grp;

                        // convert zIndex:'top' (deprecated) to zLayer
                        if (zIndex == 'top') {
                            zLayer = Infinity;
                            zIndex = 0;
                        }

                        zIndex = Number(zIndex);

                        geoBuffer.flat = grpBuffer.isFlat();

                        renderLayer.addZ(zIndex, !geoBuffer.flat);
                        geoBuffer.zIndex = zIndex;

                        geoBuffer.zLayer = typeof zLayer == 'number' ? Math.ceil(zLayer) : null;

                        if (geoBuffer.scissor == UNDEF) {
                            // scissor is slow so no need for if source data is clipped already
                            geoBuffer.scissor = !tile.clipped || hasAlphaColor;
                        }
                    }
                }
            }

            onDone(buffers.reverse(), iconsLoaded);
        },

        exec: function(heap) {
            let tile = heap[0];
            let data = heap[1];
            const lsScale = heap[2];
            let displayLayer = heap[5];
            let dataLen = data.length;

            const level = heap[6];
            let styleGroups;
            let feature;
            let geom;
            let geomType;
            let notDone = false;

            if (!heap[7]) {
                while (heap[4]--) {
                    if (feature = data[heap[3]++]) {
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
                                let simpleType = geomType == 'MultiPoint' ? 'Point' : 'LineString';

                                for (let coords of coordinates) {
                                    factory.create(feature, simpleType, coords, styleGroups, lsScale);
                                }
                            } else if (geomType == 'MultiPolygon') {
                                factory.create(feature, 'Polygon', coordinates, styleGroups, lsScale);

                                for (let polygon of coordinates) {
                                    handlePolygons(factory, feature, polygon, styleGroups, lsScale, tile);
                                }
                            } else {
                                let ready = factory.create(feature, geomType, coordinates, styleGroups, lsScale);

                                if (!ready) {
                                    iconsLoaded = false;
                                }

                                if (geomType == 'Polygon') {
                                    handlePolygons(factory, feature, coordinates, styleGroups, lsScale, tile);
                                }
                            }
                        }
                    } else {
                        // feature count < bundle size -> next
                        break;
                    }
                }

                notDone = heap[3] < dataLen;
            }

            // handle pending collisions...
            if (!notDone && factory.pendingCollisions.length) {
                if (!heap[7]) {
                    // sort collision data by priority
                    heap[7] = factory.pendingCollisions.sort((a, b) => a.priority - b.priority);
                    // reset/reuse feature index
                    heap[3] = 0;
                }
                let cData = heap[7];
                let c;

                if (heap[4] >= 0) {
                    const styleGrp = [];
                    while (heap[4]--) {
                        if (c = cData[heap[3]++]) {
                            styleGrp[0] = c.style;
                            factory.create(c.feature, c.geomType, c.coordinates, styleGrp, lsScale, false, c.priority);
                        } else {
                            break;
                        }
                    }
                }
                notDone = heap[3] < cData.length;
            }

            heap[4] = PROCESS_FEATURE_BUNDLE_SIZE;

            return notDone;
        }
        // icb(groups);
    });

    taskManager.start(task);
    return task;
}
;

export {createBuffer};
