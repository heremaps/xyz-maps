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

import {TaskManager} from '@here/xyz-maps-common';
import {GeometryBuffer} from './GeometryBuffer';
import {getValue} from '../../styleTools';
import {tile} from '@here/xyz-maps-core';
import {Layer} from '../../Layers';
import {FeatureFactory} from './FeatureFactory';
import {TemplateBuffer} from './templates/TemplateBuffer';


const tileUtils = tile.Utils;

// const DEFAULT_STROKE_WIDTH_ZOOM_SCALE = () => 1;
const PROCESS_FEATURE_BUNDLE_SIZE = 16;
const EXCLUSIVE_TIME_MS = 4;
const PRIORITY = 4;

const taskManager = TaskManager.getInstance();
const TO_RAD = Math.PI / 180;
const COLOR_UNDEFINED = new Float32Array([-1.0, -1.0, -1.0, -1.0]);

let UNDEF;

const handlePolygons = (factory, feature, coordinates, styleGroups, lsScale, tile, groups, tileSize: number) => {
    const zoom = tile.z;
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
                factory.create(
                    feature, 'Point', center, [style], lsScale,
                    tile, groups, tileSize
                );
            }
        } else if (type == 'Polygon' && getValue('stroke', style, feature, zoom)) {
            style.type = 'Line';
            for (let linestring of coordinates) {
                factory.create(
                    feature, 'LineString', linestring, [style], lsScale,
                    tile, groups, tileSize
                );
            }
            style.type = styleType;
        }
    }
};


const typeArray = (TypedArray, arr: any[], typedCache: any) => {
    let typedArr = typedCache.get(arr);
    if (!typedArr) {
        typedArr = new TypedArray(arr);
        typedCache.set(arr, typedArr);
    }
    return typedArr;
};

const createBuffer = (data: any[], renderLayer: Layer, tileSize: number, tile, factory: FeatureFactory, onDone) => {
// const createBuffer = (data: any[], renderLayer: Layer, tileSize: number, tile, gl: WebGLRenderingContext, iconManager: IconManager, onDone) => {
    const layer = renderLayer.layer;
    // const exclusiveTimeMS = this.ms;

    const groups = {};

    let iconsLoaded = true;

    const task = taskManager.create({

        time: EXCLUSIVE_TIME_MS,

        priority: PRIORITY,

        init: function() {
            // tile.isPreparing = task;
            // const layerStyles = layer.getStyle();

            if (data) {
                let len = data.length;
                let feature;
                let start = Date.now();

                while (len--) {
                    feature = data[len];
                }

                // adjust remaining runtime of task
                task.time = EXCLUSIVE_TIME_MS - (Date.now() - start);
            }

            const layerStyles = layer.getStyle();
            let lsZoomScale = 1; // DEFAULT_STROKE_WIDTH_ZOOM_SCALE;

            if (layerStyles) {
                const layerScale = layerStyles['strokeWidthZoomScale'] || layerStyles['LineStringZoomScale'];

                if (layerScale) {
                    lsZoomScale = layerScale(tile.z);
                }
            }


            let provider = tile.provider;
            let rendered = [];
            let overlaps = [];

            // console.time(tile.quadkey);
            for (let y = -1; y < 2; y++) {
                for (let x = -1; x < 2; x++) {
                    if (x != 0 || y != 0) {
                        let qk = tileUtils.tileXYToQuadKey(tile.z, tile.y + y, tile.x + x);
                        let neighbour = provider.getCachedTile(qk);
                        if (neighbour && neighbour.collision) {
                            let ren = neighbour.collision.rendered;
                            for (let o of ren) {
                                overlaps[overlaps.length] = o;
                            }
                        }
                    }
                }
            }
            // console.timeEnd(tile.quadkey);


            tile.collision = {
                rendered: rendered,
                overlaps: overlaps
            };


            return [
                tile,
                // {
                //     x: tile.x,
                //     y: tile.y,
                //     z: tile.z,
                //     lon2x: (x: number) => tile.lon2x(x, tileSize),
                //     lat2y: (y: number) => tile.lat2y(y, tileSize),
                //     isInside: (p: [number, number, number?]) => tile.isInside(p),
                //     collision: tile.collision
                // },
                data,
                lsZoomScale,
                0, // featureIndex
                PROCESS_FEATURE_BUNDLE_SIZE,
                layer,
                tileSize
                // {}
            ];
        },

        name: 'createBuffer',

        onDone: function() {
            let extrudeScale = Math.pow(2, 17 - tile.z);
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

            // let z = groups.length;
            // for (let z = 0; z < groups.length; z++) {
            // while (z--) {
            for (let zoom in groups) {
                let z: string | number = zoom;
                zGroup = groups[z];

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
                            if (!grp.glyphs) { // TODO: CLEANUP!!
                                continue;
                            }
                        }

                        if (grpBuffer) {
                            // nothing to render..no need to create empty buffers -> skip.
                            if (grpBuffer.isEmpty()) continue;
                        }

                        if (grpBuffer.hasIndex()) {
                            const index = grpBuffer.index();
                            if (!index.length) continue;

                            geoBuffer = new GeometryBuffer(index, type);
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
                                geoBuffer.addAttribute(name, grpBuffer.typeAttributeData(attr));
                            }
                        }

                        buffers.push(geoBuffer);


                        if (type == 'Text') {
                            // geoGroup.alpha = true;
                            geoBuffer.texture = grp.glyphs;
                            geoBuffer.scissor = grpBuffer.scissor;

                            grp.glyphs.sync();

                            geoBuffer.addUniform('u_texture', 0);
                            geoBuffer.addUniform('u_atlasScale', [1 / grp.glyphs.width, 1 / grp.glyphs.height]);
                            geoBuffer.addUniform('u_opacity', shared.opacity);
                        } else {
                            if (type == 'Rect' || type == 'Circle') {
                                geoBuffer.addUniform('u_fill', shared.fill || COLOR_UNDEFINED);

                                if (stroke) {
                                    geoBuffer.addUniform('u_stroke', stroke);
                                    if (strokeWidth == UNDEF) strokeWidth = 1;
                                }

                                geoBuffer.addUniform('u_strokeWidth', strokeWidth ^ 0);

                                if (type == 'Circle') {
                                    geoBuffer.addUniform('u_radius', shared.radius);
                                } else {
                                    geoBuffer.addUniform('u_size', [shared.width, shared.height]);
                                }
                            } else if (type == 'Line') {
                                if (shared.strokeDasharray) {
                                    geoBuffer.type = 'DashedLine';
                                    geoBuffer.texture = grp.texture;
                                    geoBuffer.addUniform('u_texWidth', grp.texture.width);
                                    geoBuffer.addUniform('u_pattern', 0);
                                }
                                geoBuffer.addUniform('u_fill', stroke);
                                geoBuffer.addUniform('u_strokeWidth', strokeWidth * .5);
                            } else if (type == 'Polygon' || type == 'Extrude') {
                                geoBuffer.addUniform('u_fill', shared.fill);

                                if (type == 'Extrude') {
                                    geoBuffer.addUniform('u_zoom', extrudeScale);
                                }
                            } else if (type == 'Icon') {
                                geoBuffer.texture = grp.texture;
                                geoBuffer.scissor = grp.buffer.scissor;

                                geoBuffer.addUniform('u_atlasScale', 1 / geoBuffer.texture.width);
                                geoBuffer.addUniform('u_texture', 0);
                                geoBuffer.addUniform('u_opacity', shared.opacity);
                            }
                        }

                        const fillOpacity = shared.fill && shared.fill[3];
                        const strokeOpacity = shared.stroke && shared.stroke[3];

                        if (fillOpacity < 1 || strokeOpacity < 1) {
                            geoBuffer.alpha = true;
                            geoBuffer.blend = true;
                            geoBuffer.depth = true;
                        }

                        geoBuffer.addUniform('u_rotation', shared.rotation * TO_RAD);
                        geoBuffer.addUniform('u_offset', [shared.offsetX, shared.offsetY]);

                        if (z == 'top') {
                            z = Infinity;
                            geoBuffer.alpha = true;
                            // make sure opaque items are rendered in alpha pass
                            geoBuffer.depth = false;
                        }

                        z = Number(z);

                        renderLayer.addZ(z);
                        geoBuffer.zIndex = z;

                        // TODO: order (+draw) groups by zIndex
                        // geoBuffer.groups.unshift(geoGroup);
                        // geoBuffer.addGroup(geoGroup);
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
            let tileSize = heap[6];
            let dataLen = data.length;

            const level = tile.z;
            let styleGroups;
            let feature;
            // const pmap = heap[6];
            let geom;
            let geomType;

            // window.prevFeature = null;

            while (heap[4]--) {
                if (feature = data[heap[3]++]) {
                    styleGroups = displayLayer.getStyleGroup(feature, level);


                    if (styleGroups) {
                        geom = feature.geometry;
                        geomType = geom.type;

                        if (!styleGroups.length) {
                            styleGroups = [styleGroups];
                        }

                        // const coordinates = geom.coordinates;
                        const coordinates = feature.getProvider().decCoord(feature);

                        if (geomType == 'MultiLineString' || geomType == 'MultiPoint') {
                            let simpleType = geomType == 'MultiPoint' ? 'Point' : 'LineString';

                            for (let coords of coordinates) {
                                factory.create(
                                    feature, simpleType, coords, styleGroups, lsScale,
                                    tile, groups, tileSize
                                );
                            }
                        } else if (geomType == 'MultiPolygon') {
                            let _xyzGeom = geom._xyz;
                            if (_xyzGeom) {
                                factory.create(
                                    feature, 'Polygon', coordinates, styleGroups, lsScale,
                                    tile, groups, tileSize
                                );
                            }
                            for (let polygon of coordinates) {
                                if (!_xyzGeom) {
                                    factory.create(
                                        feature, 'Polygon', polygon, styleGroups, lsScale,
                                        tile, groups, tileSize
                                    );
                                }
                                handlePolygons(factory,
                                    feature, polygon, styleGroups, lsScale,
                                    tile, groups, tileSize
                                );
                            }
                        } else {
                            let ready = factory.create(
                                feature, geomType, coordinates, styleGroups, lsScale,
                                tile, groups, tileSize
                            );

                            if (!ready) {
                                iconsLoaded = false;
                            }

                            if (geomType == 'Polygon') {
                                handlePolygons(factory,
                                    feature, coordinates, styleGroups, lsScale,
                                    tile, groups, tileSize
                                );
                            }
                        }
                    }

                    // else console.log('render dupl!', link, tile);
                } else {
                    // feature count < bundle size -> next
                    break;
                }
            }

            heap[4] = PROCESS_FEATURE_BUNDLE_SIZE;

            return heap[3] < dataLen;
        }
        // icb(groups);
    });

    taskManager.start(task);
    return task;
};

export {createBuffer};
