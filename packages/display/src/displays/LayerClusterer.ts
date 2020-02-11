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

//* ******************************************************************************************
//
// objects are grouped per drawing styles and multiple lines are drawn together -> FASTER!!
// (in most browsers ;)
//
//* ******************************************************************************************

import {getValue, isStyle} from './styleTools';

import {defaultFont} from './fontCache';

const DEFAULT_FONT = defaultFont;
const DEFAULT_STROKE_WIDTH_ZOOM_SCALE = () => 1;

const PROCESS_FEATURE_BUNDLE_SIZE = 300;
// const PROCESS_FEATURE_BUNDLE_SIZE = 100;


// const getValue = (name, style, feature, zoom) => {
//     let value = style[name];
//     return typeof value == 'function'
//         ? value(feature, zoom)
//         : value;
// };
const NONE = '*';
let UNDEF;

type TaskManager = any;

class ClusterTask {
    private tm: TaskManager;
    private ms: number;


    constructor(taskManager: TaskManager, exclusiveTimeMS: number) {
        this.tm = taskManager;
        this.ms = exclusiveTimeMS;
    }

    exclusiveRuntime(ms) {
        this.ms = ms;
    };

    spawn(priority, layer, tile, data, rendered, Container, icb, sync?) {
        let task = this.createTask(priority, layer, tile, data, rendered, Container, icb );
        this.tm.start(task, sync);
        return task;
    };

    private createTask(priority, layer, tile, data, rendered, Container, icb) {
        const sBatch = [];
        const exclusiveTimeMS = this.ms;
        const task = this.tm.create({

            time: exclusiveTimeMS,

            priority: priority,

            init: function() {
                if (data) {
                    let len = data.length;
                    let feature;
                    let start = Date.now();

                    while (len--) {
                        feature = data[len];
                    }
                    // adjust remaining runtime of task
                    task.time = exclusiveTimeMS - (Date.now() - start);
                }
                return [
                    tile,
                    data,
                    rendered,
                    0, // featureIndex
                    sBatch,
                    PROCESS_FEATURE_BUNDLE_SIZE,
                    layer,
                    {}
                ];
            },

            name: 'cluster',

            onDone: function() {
                const layerStyles = layer.getStyle();
                const zoomScale = layerStyles && (
                    layerStyles['strokeWidthZoomScale'] || layerStyles['LineStringZoomScale']
                ) || DEFAULT_STROKE_WIDTH_ZOOM_SCALE;

                // define strokewith zoom scale
                (<any>sBatch).swzs = zoomScale(tile.z);

                icb(sBatch, this);
            },

            exec: function clusterFeature(heap) {
                let tile = heap[0];
                let data = heap[1];
                let rendered = heap[2];
                let displayLayer = heap[6];
                let dataLen = data.length;
                let groups = heap[4];
                const level = tile.z;
                let zIndex;
                let groupId;
                let styleGroups;
                let style;
                let feature;
                let featureId;
                let type;
                let zGrouped;
                let group;
                let index;
                let fill;
                let font;
                let stroke;
                let strokeWidth;
                let opacity;
                let strokeLinecap;
                let strokeLinejoin;
                let strokeDasharray;
                let radius;
                let width;
                let height;

                if (!data || heap[3] >= dataLen) {
                    return;
                }

                while (heap[5]--) {
                    if (feature = data[heap[3]++]) {
                        featureId = feature.id;

                        // skip possible duplicates
                        if (!rendered[featureId]) {
                            rendered[featureId] = true;

                            styleGroups = displayLayer.getStyleGroup(feature, level);

                            if (styleGroups) {
                                // support single stylegroup (no array)
                                if (!styleGroups.length) {
                                    styleGroups = [styleGroups];
                                }

                                for (let i = 0, iLen = styleGroups.length; i < iLen; i++) {
                                    style = styleGroups[i];

                                    if (!isStyle(style)) continue;

                                    zIndex = getValue('zIndex', style, feature, level);

                                    type = getValue('type', style, feature, level);
                                    opacity = getValue('opacity', style, feature, level);
                                    font = UNDEF;
                                    fill = UNDEF;
                                    stroke = UNDEF;
                                    strokeWidth = UNDEF;
                                    strokeDasharray = UNDEF;
                                    strokeLinecap = UNDEF;
                                    strokeLinejoin = UNDEF;
                                    radius = UNDEF;
                                    width = UNDEF;
                                    height = UNDEF;

                                    if (type == 'Image') {
                                        groupId = 'I';
                                    } else {
                                        fill = getValue('fill', style, feature, level);
                                        stroke = getValue('stroke', style, feature, level);
                                        strokeWidth = getValue('strokeWidth', style, feature, level);

                                        if (type == 'Line') {
                                            strokeLinecap = getValue('strokeLinecap', style, feature, level);
                                            strokeLinejoin = getValue('strokeLinejoin', style, feature, level);
                                            strokeDasharray = getValue('strokeDasharray', style, feature, level);

                                            groupId = 'L'
                                                + (strokeLinecap || NONE)
                                                + (strokeLinejoin || NONE)
                                                + (strokeDasharray || NONE);
                                        } else if (type == 'Text') {
                                            font = getValue('font', style, feature, level) || DEFAULT_FONT;
                                            groupId = 'T' + (font || NONE);
                                        } else if (type == 'Circle') {
                                            radius = getValue('radius', style, feature, level);
                                            groupId = 'C' + radius || NONE;
                                        } else {
                                            width = getValue('width', style, feature, level);
                                            height = getValue('height', style, feature, level) || width;

                                            groupId = 'R' + width + height;
                                        }

                                        groupId += (stroke || NONE) + (strokeWidth || NONE) + (fill || NONE);
                                    }

                                    if (opacity != UNDEF) {
                                        groupId += opacity * 100 ^ 0;
                                    }

                                    zGrouped = groups[zIndex] = groups[zIndex] || [];
                                    index = zGrouped[groupId];

                                    if (index == UNDEF) {
                                        index = zGrouped[groupId] = zGrouped.length;
                                        group = zGrouped[index] = {
                                            shared: {
                                                font: font,
                                                fill: fill,
                                                opacity: opacity,
                                                stroke: stroke,
                                                strokeWidth: strokeWidth,
                                                strokeLinecap: strokeLinecap,
                                                strokeLinejoin: strokeLinejoin,
                                                strokeDasharray: strokeDasharray
                                            },
                                            data: new Container()
                                        };
                                    } else {
                                        group = zGrouped[index];
                                    }

                                    group.data.add(feature, style);
                                }
                            }
                        }
                        // else console.log('render dupl!', link, tile);
                    } else {
                        // feature count < bundle size -> next
                        break;
                    }
                }

                heap[5] = PROCESS_FEATURE_BUNDLE_SIZE;

                return heap[3] < dataLen;
            }
            // icb(groups);
        });

        return task;
    };
}

export default ClusterTask;
