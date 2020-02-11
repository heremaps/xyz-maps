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
import dataset from './gettile_then_cancel_with_all_requests_spec.json';

describe('get and cancel requesting all other related requests', function() {
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

    before(async function() {
        let preparedData = await prepare(dataset);
        placeProvider = preparedData.getLayers('placeLayer').getProvider();

        qk11 = '3112301330131010'; // length 16
        qk12 = '31123013301310101'; // length 17

        qk21 = '311230133013100'; // length 15
        qk22 = '3112301330131001'; // length 16

        qk31 = '3112301330131020'; // length 16
        qk32 = '31123013301310201'; // length 17

        qk41 = '311230133013103'; // length 15
        qk42 = '3112301330131030'; // length 16
    });

    this.timeout(10000);

    // Sydney, AUS
    it('get tile at level 16 and another at 17, cancel request at 16', function(done) {
        // qk11    = '3112301330131010' // length 16
        // qk12    = '31123013301310101' // length 17
        coreTests.getTileOnProvider({
            provider: placeProvider,
            quadkeys: [qk11, qk12],
            sameCallback: false,
            cancel: {
                provider: placeProvider,
                quadkeys: [qk11],
                withCallback: false
            },
            onFinish: function(requests, callbackResults) {
                expect(requests.length).to.equal(1);
                expect(callbackResults.length).to.equal(0);

                let cancelledRequests = 0;
                for (let r in requests) {
                    if (requests[r].status == 0) {
                        cancelledRequests++;
                    }
                }

                expect(cancelledRequests).to.equal(1);

                done();
            }
        });
    });

    xit('get tile at level 15 and another at 16, cancel request at 15', function(done) {
        // qk21    = '311230133013100' // length 15
        // qk22    = '3112301330131001' // length 16
        coreTests.getTileOnProvider({
            provider: placeProvider,
            quadkeys: [qk21, qk22],
            sameCallback: false,
            cancel: {
                provider: placeProvider,
                quadkeys: [qk21],
                withCallback: false
            },
            onFinish: function(requests, callbackResults) {
                expect(requests.length).to.equal(4);
                expect(callbackResults.length).to.equal(0);

                let cancelledRequests = 0;
                for (let r in requests) {
                    if (requests[r].status == 0) {
                        cancelledRequests++;
                    }
                }

                expect(cancelledRequests).to.equal(4);


                done();
            }
        });
    });


    xit('get tile at level 16 and another at 17, cancel request at 17', function(done) {
        // qk31    = '3112301330131020' // length 16
        // qk32    = '31123013301310201' // length 17
        coreTests.getTileOnProvider({
            provider: placeProvider,
            quadkeys: [qk31, qk32],
            sameCallback: false,
            cancel: {
                provider: placeProvider,
                quadkeys: [null, qk32],
                withCallback: false
            },
            onFinish: function(requests, callbackResults) {
                expect(requests.length).to.equal(1);
                expect(callbackResults.length).to.equal(1);

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


    xit('get tile at level 15 and another at 16, cancel request at 16', function(done) {
        // qk41    = '311230133013103' // length 15
        // qk42    = '3112301330131030' // length 16
        coreTests.getTileOnProvider({
            provider: placeProvider,
            quadkeys: [qk41, qk42],
            sameCallback: false,
            cancel: {
                provider: placeProvider,
                quadkeys: [null, qk42],
                withCallback: false
            },
            onFinish: function(requests, callbackResults) {
                expect(requests.length).to.equal(4);
                expect(callbackResults.length).to.equal(1);

                let cancelledRequests = 0;
                for (let r in requests) {
                    if (requests[r].status == 0) {
                        cancelledRequests++;
                    }
                }

                expect(cancelledRequests).to.equal(4);


                done();
            }
        });
    });
});

