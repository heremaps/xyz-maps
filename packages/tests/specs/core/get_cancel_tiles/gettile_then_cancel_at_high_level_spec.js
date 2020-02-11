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

import {coreTests, prepare} from 'hereTest';
import dataset from './gettile_then_cancel_at_high_level_spec.json';

describe('get and cancel requesting with high level', function() {
    const expect = chai.expect;

    var placeProvider; // placeProvider.level.length == 16

    var qk11;
    var qk12;

    var qk21;
    var qk22;

    var qk31;
    var qk32;

    var qk41;
    var qk42;

    var qk51;
    var qk52;


    before(async function() {
        let preparedData = await prepare(dataset);
        placeProvider = preparedData.getLayers('placeLayer').getProvider();

        qk11 = '31122313000230'; // length 14
        qk12 = '311223130002301'; // length 15

        qk21 = '31122313000231'; // length 14
        qk22 = '311223130002311'; // length 15

        qk31 = '31122313000232'; // length 14
        qk32 = '311223130002321'; // length 15

        qk41 = '31122313000220'; // length 14
        qk42 = '311223130002211'; // length 15

        qk51 = '31122313000222'; // length 14
        qk52 = '311223130002231'; // length 15
    });

    this.timeout(10000);


    // Melmourne, AUS
    it('get tile at level 14 and another at 15', async function() {
        // qk11    = '31122313000230' // length 14
        // qk12    = '311223130002301' // length 15
        let reqs;
        let cbResults;
        let cancelledRequests = 0;
        await new Promise((resolve)=>{
            coreTests.getTileOnProvider({
                provider: placeProvider,
                quadkeys: [qk11, qk12],
                sameCallback: false,
                onFinish: function(requests, callbackResults) {
                    // 16 request(s) sent, 2 callback(s) called
                    reqs = requests.length;
                    cbResults = callbackResults.length;

                    for (let r in requests) {
                        if (requests[r].status == 0) {
                            cancelledRequests++;
                        }
                    }

                    resolve();
                }
            });
        });

        expect(reqs).to.equal(16);
        expect(cbResults).to.equal(2);

        expect(cancelledRequests).to.equal(0);
    });

    it('get tile at level 14 and another at 15, cancel the request at 15', function(done) {
        // qk21    = '31122313000231' // length 14
        // qk22    = '311223130002311' // length 15
        coreTests.getTileOnProvider({
            provider: placeProvider,
            quadkeys: [qk21, qk22],
            sameCallback: false,
            onFinish: function(requests, callbackResults) {
                // 16 request(s) sent, 1 callback(s) called
                expect(requests.length).to.equal(16);
                expect(callbackResults.length).to.equal(1);

                let cancelledRequests = 0;
                for (let r in requests) {
                    if (requests[r].status == 0) {
                        cancelledRequests++;
                    }
                }

                expect(cancelledRequests).to.equal(0);


                done();
            },
            cancel: {
                provider: placeProvider,
                quadkeys: [null, qk22],
                withCallback: true
            }
        });
    });


    it('get tile at level 14 and another at 15, cancel the request at 14', function(done) {
        // qk31    = '31122313000232' // length 14
        // qk32    = '311223130002321' // length 15
        coreTests.getTileOnProvider({
            provider: placeProvider,
            quadkeys: [qk31, qk32],
            sameCallback: false,
            onFinish: function(requests, callbackResults) {
                // 16 request(s) sent, 1 callback(s) called
                expect(requests.length).to.equal(16);
                expect(callbackResults.length).to.equal(1);

                let cancelledRequests = 0;
                for (let r in requests) {
                    if (requests[r].status == 0) {
                        cancelledRequests++;
                    }
                }

                expect(cancelledRequests).to.equal(12);


                done();
            },
            cancel: {
                provider: placeProvider,
                quadkeys: [qk31],
                withCallback: true
            }
        });
    });

    it('get tile at level 14 and another at 15', function(done) {
        // qk41    = '31122313000220' // length 14
        // qk42    = '311223130002211' // length 15
        coreTests.getTileOnProvider({
            provider: placeProvider,
            quadkeys: [qk41, qk42],
            sameCallback: false,
            onFinish: function(requests, callbackResults) {
                // 20 request(s) sent, 2 callback(s) called
                expect(requests.length).to.equal(20);
                expect(callbackResults.length).to.equal(2);

                let cancelledRequests = 0;
                for (let r in requests) {
                    if (requests[r].status == 0) {
                        cancelledRequests++;
                    }
                }

                expect(cancelledRequests).to.equal(0);


                done();
            }
        });
    });

    it('get tile at level 14 and another at 15 and cancel one at level 14', function(done) {
        // qk51    = '31122313000222' // length 14
        // qk52    = '311223130002231' // length 15
        coreTests.getTileOnProvider({
            provider: placeProvider,
            quadkeys: [qk51, qk52],
            sameCallback: false,
            onFinish: function(requests, callbackResults) {
                // 20 request(s) sent, 1 callback(s) called
                expect(requests.length).to.equal(20);
                expect(callbackResults.length).to.equal(1);

                let cancelledRequests = 0;
                for (let r in requests) {
                    if (requests[r].status == 0) {
                        cancelledRequests++;
                    }
                }

                expect(cancelledRequests).to.equal(16);


                done();
            },
            cancel: {
                provider: placeProvider,
                quadkeys: [qk51],
                withCallback: true
            }
        });
    });
});

