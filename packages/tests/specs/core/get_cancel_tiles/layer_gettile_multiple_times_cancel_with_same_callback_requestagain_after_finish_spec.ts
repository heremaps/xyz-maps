/*
 * Copyright (C) 2019-2026 HERE Europe B.V.
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

import {prepare} from 'utils';
import {getTileOnLayer} from 'coreUtils';
import dataset from './layer_gettile_multiple_times_cancel_with_same_callback_requestagain_after_finish_spec.json';
import {describe, beforeEach, afterEach, it, expect} from 'vitest';

describe('layer get one tile multiple times and cancel with same callback', function() {
    var placeLayer;

    var qk1;
    var qk2;
    var qk3;
    var qk4;
    var preparedData;

    beforeEach(async function() {
        preparedData = await prepare(dataset);
        placeLayer = preparedData.getLayers('placeLayer'); // placeLayer.level.length == 16

        qk1 = '3112301320022300'; // length 16
        qk2 = '3112301320022301'; // length 16
        qk3 = '3112301320022302'; // length 16
        qk4 = '3112301320022303'; // length 16
    });

    afterEach(async () => {
        await preparedData?.clear();
    });

    // Sydney, AUS
    it('requests a tile repeatedly and reuses the finished request from cache', async function() {
        await new Promise<void>((done) => {
            // qk1     = '3112301320022300' // length 16
            getTileOnLayer({
                layer: placeLayer,
                quadkeys: [qk1, qk1, qk1],
                sameCallback: true,
                onFinish: function(requests, callbackResults) {
                    // 1 request(s) sent, 1 callback(s) called
                    expect(requests.length).toBe(1);
                    expect(callbackResults.length).toBe(1);

                    let cancelledRequests = 0;
                    for (let r in requests) {
                        if (requests[r].status == 0) {
                            cancelledRequests++;
                        }
                    }

                    expect(cancelledRequests).toBe(0);


                    done();
                }
            });
        });
        await new Promise<void>((done) => {
            // qk1     = '3112301320022300' // length 16
            getTileOnLayer({
                layer: placeLayer,
                quadkeys: [qk1, qk1, qk1],
                sameCallback: true,
                onFinish: function(requests, callbackResults) {
                    // 0 request(s) sent, 3 callback(s) called
                    expect(requests.length).toBe(0);
                    expect(callbackResults.length).toBe(3);

                    let cancelledRequests = 0;
                    for (let r in requests) {
                        if (requests[r].status == 0) {
                            cancelledRequests++;
                        }
                    }

                    expect(cancelledRequests).toBe(0);


                    done();
                }
            });
        });
    });

    it('cancels once, then requests the cancelled tile again', async function() {
        await new Promise<void>((done) => {
            // qk2     = '3112301320022301' // length 16
            getTileOnLayer({
                layer: placeLayer,
                quadkeys: [qk2, qk2, qk2],
                sameCallback: true,
                cancel: {
                    quadkeys: [qk2],
                    withCallback: true
                },
                onFinish: function(requests, callbackResults) {
                    // 1 request(s) sent, 0 callback(s) called
                    expect(requests.length).toBe(1);
                    expect(callbackResults.length).toBe(0);

                    let cancelledRequests = 0;
                    for (let r in requests) {
                        if (requests[r].status == 0) {
                            cancelledRequests++;
                        }
                    }

                    expect(cancelledRequests).toBe(1);


                    done();
                }
            });
        });
        await new Promise<void>((done) => {
            // qk2     = '3112301320022301' // length 16
            getTileOnLayer({
                layer: placeLayer,
                quadkeys: [qk2, qk2, qk2],
                sameCallback: true,
                cancel: {
                    quadkeys: [qk2],
                    withCallback: true
                },
                onFinish: function(requests, callbackResults) {
                    // 1 request(s) sent, 0 callback(s) called
                    expect(requests.length).toBe(1);
                    expect(callbackResults.length).toBe(0);

                    let cancelledRequests = 0;
                    for (let r in requests) {
                        if (requests[r].status == 0) {
                            cancelledRequests++;
                        }
                    }

                    expect(cancelledRequests).toBe(1);


                    done();
                }
            });
        });
    });

    it('cancels twice, then requests the cancelled tile again', async function() {
        await new Promise<void>((done) => {
            // qk3     = '3112301320022302' // length 16
            getTileOnLayer({
                layer: placeLayer,
                quadkeys: [qk3, qk3, qk3],
                sameCallback: true,
                cancel: {
                    quadkeys: [qk3, qk3],
                    withCallback: true
                },
                onFinish: function(requests, callbackResults) {
                    // 1 request(s) sent, 0 callback(s) called
                    expect(requests.length).toBe(1);
                    expect(callbackResults.length).toBe(0);

                    let cancelledRequests = 0;
                    for (let r in requests) {
                        if (requests[r].status == 0) {
                            cancelledRequests++;
                        }
                    }

                    expect(cancelledRequests).toBe(1);


                    done();
                }
            });
        });
        await new Promise<void>((done) => {
            // qk3     = '3112301320022302' // length 16
            getTileOnLayer({
                layer: placeLayer,
                quadkeys: [qk3, qk3, qk3],
                sameCallback: true,
                cancel: {
                    quadkeys: [qk3, qk3],
                    withCallback: true
                },
                onFinish: function(requests, callbackResults) {
                    // 1 request(s) sent, 0 callback(s) called
                    expect(requests.length).toBe(1);
                    expect(callbackResults.length).toBe(0);

                    let cancelledRequests = 0;
                    for (let r in requests) {
                        if (requests[r].status == 0) {
                            cancelledRequests++;
                        }
                    }

                    expect(cancelledRequests).toBe(1);


                    done();
                }
            });
        });
    });

    it('get one tile for multiple times and cancel all', function() {
        return new Promise<void>((done) => {
            // qk4     = '3112301320022303' // length 16
            getTileOnLayer({
                layer: placeLayer,
                quadkeys: [qk4, qk4, qk4],
                sameCallback: true,
                cancel: {
                    quadkeys: [qk4, qk4, qk4],
                    withCallback: true
                },
                onFinish: function(requests, callbackResults) {
                    // 1 request(s) sent, 0 callback(s) called
                    expect(requests.length).toBe(1);
                    expect(callbackResults.length).toBe(0);

                    let cancelledRequests = 0;
                    for (let r in requests) {
                        if (requests[r].status == 0) {
                            cancelledRequests++;
                        }
                    }

                    expect(cancelledRequests).toBe(1);


                    done();
                }
            });
        });
    });
});
