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

import draw from './draw';

import {createTxtRef} from '../fontCache';

// var MAX_CANVAS_SIZE = 512;
// var MAX_BIT         = Math.log(MAX_CANVAS_SIZE) / Math.log(2);
// use object as position map because safari typed array clear performance is super slow.
// var MAX_PIXEL       = MAX_CANVAS_SIZE * MAX_CANVAS_SIZE;
// var G_PMAP          = new Int8Array(MAX_PIXEL);

let UNDEF;
// var PROCESS_FEATURE_BUNDLE_SIZE = 1;
// var PROCESS_FEATURE_BUNDLE_SIZE = 20;
// var PROCESS_FEATURE_BUNDLE_SIZE = 300;
let PROCESS_FEATURE_BUNDLE_SIZE = 100;

const EMPTY_STRING = '';


class Painter {
    private tm;
    private exclusiveTimeMS: number;
    private dpr: number;

    constructor(taskManager, devicePixelRatio, exclusiveTimeMS) {
        this.tm = taskManager;
        this.exclusiveTimeMS = exclusiveTimeMS;
        this.dpr= devicePixelRatio;
    };

    spawn(priority: number, display, tile, layer, displayTile, INSTRUCTIONS, onDone, skipClear, delay) {
        let task = this.createTask(priority, display, tile, layer, displayTile, tile.bounds, INSTRUCTIONS, onDone, skipClear, delay);
        this.tm.start(task);
        return task;
    };

    createTask(priority: number, display, tile, layer, displayTile, tileBounds, INSTRUCTIONS, onDone, skipClear, delay) {
        const devicePixelRatio = this.dpr;
        let index = displayTile.index(layer);
        let tileCtx = displayTile.getContext(index);

        let task = this.tm.create({
            priority: priority,
            delay: delay,
            time: this.exclusiveTimeMS,
            init: function() {
                if (!skipClear) {
                    tileCtx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);

                    let bgColor = layer.getStyle().backgroundColor;

                    if (bgColor) {
                        tileCtx.fillStyle = bgColor;
                        tileCtx.globalAlpha = 1;

                        tileCtx.fillRect(0, 0, 256, 256);
                    } else {
                        tileCtx.clearRect(0, 0, 256, 256);
                    }
                }
                return {
                    tile: tile,
                    ctx: tileCtx,
                    data: INSTRUCTIONS,
                    // bounds: tileBounds,
                    lI: 0, // layer Index
                    gI: 0, // group Index
                    fI: 0, // feature Index
                    style: UNDEF,
                    // zls: INSTRUCTIONS.swzs,
                    // zls   : 1 + ( tile.z - 18 ) * .2
                    dTile: displayTile,
                    layer: layer,
                    bI: PROCESS_FEATURE_BUNDLE_SIZE
                };
            },

            onDone: function() {
                displayTile.dirty(index);
                onDone(tileCtx, this);
            },
            exec: function(heap) {
                let tile = heap.tile;
                let layeredData = heap.data;
                let layerCount = layeredData.length;
                let layerData;
                // var time_start = performance.now();

                if (layerCount) {
                    // find next layer with data
                    while (
                        !(layerData = layeredData[heap.lI]) &&
                        heap.lI < layerCount
                    ) {
                        ++heap.lI;
                    }

                    if (layerData) {
                        let groupIndex = heap.gI;
                        let group = layerData[groupIndex];

                        if (group) {
                            let tileContext = heap.ctx;
                            let style = group.shared;
                            let isTextStyle = style.font != UNDEF;

                            // check if canvas is initialized
                            if (heap.style != style) {
                                heap.style = style;

                                let visible = draw.init(tileContext, style, layeredData.swzs);
                                // var visible = initDrawing( tileContext, style, isTextStyle, layeredData.swzs, tile.z );

                                // clear position map...
                                // use object as position map because safari typed array clear performance is super slow.
                                heap.pmap = {};
                                // heap.pmap = G_PMAP.fill(0);

                                // group not visible -> can be skipped
                                if (!visible) {
                                    heap.fI = 0;
                                    heap.gI++;
                                    heap.bI = PROCESS_FEATURE_BUNDLE_SIZE;

                                    return this.CONTINUE;
                                }
                            }

                            while (heap.bI--) {
                                let i = heap.fI++;
                                const data = group.data;
                                let feature = data.features[i];
                                // let feature = group.features[i];

                                if (feature) {
                                    let fstyle = data.styles[i];
                                    // let fstyle = group.styles[i];
                                    let text;
                                    let txt;

                                    if (isTextStyle) {
                                        if (fstyle['textRef']) {
                                            txt = createTxtRef(fstyle['textRef']);
                                        } else {
                                            txt = fstyle['text'];
                                        }
                                        text = typeof txt == 'function'
                                            ? txt(feature)
                                            : txt;

                                        if (text === UNDEF || text === EMPTY_STRING) {
                                            continue;
                                        }
                                    }

                                    draw.feature(
                                        tile,
                                        tileContext,
                                        feature,
                                        text,
                                        // style,
                                        fstyle,
                                        // group.rot,
                                        heap.dTile,
                                        heap.layer,
                                        heap.pmap,
                                        display,
                                        devicePixelRatio
                                    );
                                } else {
                                    if (!isTextStyle) {
                                        if (style.fill) {
                                            tileContext.fill();
                                        }

                                        if (style.stroke && (style.strokeWidth || style.strokeWidth == UNDEF)) {
                                            tileContext.stroke();
                                        }
                                    } else {
                                        tileContext.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
                                    }
                                    heap.fI = 0;
                                    heap.gI++;
                                    break;
                                    // return NOT_READY;
                                }
                            }
                        } else {
                            heap.fI = 0;
                            heap.gI = 0;
                            heap.lI++;
                            // return NOT_READY;
                        }
                        heap.bI = PROCESS_FEATURE_BUNDLE_SIZE;
                        // window.renderTotalTime +=  performance.now() - time_start;
                        return this.CONTINUE;
                    }
                }
                // window.renderTotalTime +=  performance.now() - time_start;
            }
        });

        return task;
    };
}

export default Painter;
