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

import TaskManager from './TaskManager';

const tm = TaskManager.getInstance(13);

const GRPCNT = 20;

export default (str: string, cb: (result)=>void, taskManager) => {
    taskManager = taskManager || tm;


    // if( str[0] == '{' )
    // {
    //     cb( JSON.parse(str) );
    // }
    // else
    // {
    // var start = 1;
    // var stop  = str.length;

    // var mb = Math.round((str.length/1024/1024)*100)/100+'MB';
    // console.time(mb);
    const start = str.indexOf('[');
    const stop = str.lastIndexOf(']');
    // console.timeEnd(mb);


    const parseGrp = (heap, end) => {
        heap.grp = GRPCNT;

        // for some reason parsing array is about 80% faster in Chrome!
        heap.elements.push.apply(
            heap.elements,
            JSON.parse('[' + str.slice(heap.start, end) + ']')
        );

        // elements[elements.length] = JSON.parse(
        //     str.slice( heap.start, i+1 )
        // );

        heap.start = null;
    };

    taskManager.create({

        name: 'PJA',

        priority: 4,

        time: 4, // (1000/60)/4,

        onDone: function(h) {
            if (cb) {
                let result;

                const elements = h.elements;


                if (elements.length) {
                    if (str.indexOf('"type":"FeatureCollection"') != -1) {
                        const featureCollection = JSON.parse(str.substr(0, start + 1) + str.substr(stop));

                        featureCollection.features = elements;

                        result = featureCollection;
                    } else {
                        result = elements;
                    }
                } else {
                    result = JSON.parse(str);
                }


                cb(result);
            }
        },

        init: function() {
            return {
                i: start,
                open: 0,
                start: null,
                len: stop,
                elements: [],
                grp: GRPCNT,
                last: null
            };
        },

        exec: function(heap) {
            const elements = heap.elements;
            const sLen = heap.len;
            let i;
            let c;

            if (heap.i < sLen) {
                while ((i = heap.i++) < sLen) {
                    c = str.charAt(i);

                    if (c == '"') {
                        heap.i = str.indexOf('"', i + 1) + 1;
                        continue;
                    }


                    if (c == '{') {
                        heap.open++;

                        if (heap.start == null) {
                            heap.start = i;
                        }
                    } else if (c == '}') {
                        if (--heap.open == 0) {
                            // if(elements.length == 1856)debugger;

                            if (--heap.grp && i < sLen - 2) {
                                return this.CONTINUE;
                            }


                            heap.grp = GRPCNT;

                            // for some reason parsing array is about 80% faster in Chrome!
                            elements.push.apply(
                                elements,
                                JSON.parse('[' + str.slice(
                                    heap.start,
                                    heap.last = i + 1
                                ) + ']')
                            );

                            // elements[elements.length] = JSON.parse(
                            //     str.slice( heap.start, i+1 )
                            // );

                            heap.start = null;

                            return this.CONTINUE;
                        }
                    } else if (heap.open == 0 && !isNaN(c)) {
                        if (heap.grp != GRPCNT) {
                            parseGrp(heap, i - 1);
                        }

                        const substr = str.substr(i);
                        const index = substr.search('[0-9](]|,)') + 1;

                        elements.push(parseFloat(substr.substring(0, index)));

                        heap.i = i + index;

                        // var substr = str.substr( i-1 ),
                        //     index  = substr.search( '[0-9](]|,)' ) + 1;
                        //
                        // elements.push( parseFloat( substr.substring( 0, index ) ) );
                        //
                        // heap.i = i + index;
                    }
                }


                if (heap.grp != GRPCNT) {
                    if (heap.last != null) {
                        // console.log('['+str.slice(heap.last+1, last)+']');

                        elements.push.apply(
                            elements,
                            JSON.parse('[' + str.slice(
                                heap.last + 1,
                                str.lastIndexOf(']')
                                // i-1
                            ) + ']')
                        );
                    }
                    // else if( i > 2 && elements.length == 0 )
                    // {
                    //
                    //     errr;
                    //     // debugger;
                    // //     heap.elements = JSON.parse(str);
                    // }
                }
            }
        }

    }).start();
    // }
};
