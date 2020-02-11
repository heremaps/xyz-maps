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
import dataset from './layer_gettile_then_cancel_at_different_level_requestagain_after_finish_with_same_callback_spec.json';

describe('layer get and cancel requesting with different level with same callback', function() {
    const expect = chai.expect;

    var placeLayer;


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

    var qk61;
    var qk62;

    var qk71;
    var qk72;

    var qk81;
    var qk82;

    before(async function() {
        let preparedData = await prepare(dataset);
        placeLayer = preparedData.getLayers('placeLayer'); // placeLayer.level.length == 16

        qk11 = '311230132011130'; // length 15
        qk12 = '3112301320111301'; // length 16

        qk21 = '311230132011131'; // length 15
        qk22 = '3112301320111311'; // length 16

        qk31 = '311230132011132'; // length 15
        qk32 = '3112301320111321'; // length 16

        qk41 = '311230132011133'; // length 15
        qk42 = '3112301320111331'; // length 16

        qk51 = '31123013201110300'; // length 17
        qk52 = '3112301320111030'; // length 16

        qk61 = '31123013201110310'; // length 17
        qk62 = '3112301320111031'; // length 16

        qk71 = '31123013201110320'; // length 17
        qk72 = '3112301320111032'; // length 16

        qk81 = '31123013201110330'; // length 17
        qk82 = '3112301320111033'; // length 16
    });

    this.timeout(10000);


    // Sydney, AUS
    it('get one tile at level 15 and another at 16', function(done) {
        // qk11    = '311230132011130' // length 15
        // qk12    = '3112301320111301' // length 16
        coreTests.getTileOnLayer({
            layer: placeLayer,
            quadkeys: [qk11, qk12],
            sameCallback: true,
            onFinish: function(requests, callbackResults) {
                // 4 request(s) sent, 2 callback(s) called
                expect(requests.length).to.equal(4);
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


    it('get one tile at level 15 and another at 16, cancel the request at level 16', function(done) {
        // qk21    = '311230132011131' // length 15
        // qk22    = '3112301320111311' // length 16
        coreTests.getTileOnLayer({
            layer: placeLayer,
            quadkeys: [qk21, qk22],
            sameCallback: true,
            cancel: {
                layer: placeLayer,
                quadkeys: [null, qk22],
                withCallback: true
            },
            onFinish: function(requests, callbackResults) {
                // 4 request(s) sent, 1 callback(s) called
                expect(requests.length).to.equal(4);
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


    it('get one tile at level 15 and another at 16, cancel the request at level 15', function(done) {
        // qk31    = '311230132011132' // length 15
        // qk32    = '3112301320111321' // length 16
        coreTests.getTileOnLayer({
            layer: placeLayer,
            quadkeys: [qk31, qk32],
            sameCallback: true,
            cancel: {
                layer: placeLayer,
                quadkeys: [qk31],
                withCallback: true
            },
            onFinish: function(requests, callbackResults) {
                // 4 request(s) sent, 1 callback(s) called
                expect(requests.length).to.equal(4);
                expect(callbackResults.length).to.equal(1);

                let cancelledRequests = 0;
                for (let r in requests) {
                    if (requests[r].status == 0) {
                        cancelledRequests++;
                    } else {
                        expect(requests[r].responseURL.indexOf(qk32)).to.above(-1);
                    }
                }

                expect(cancelledRequests).to.equal(3);


                done();
            }
        });
    });

    it('get one tile at level 15 and another at 16, cancel both requests', function(done) {
        // qk41    = '311230132011133' // length 15
        // qk42    = '3112301320111331' // length 16
        coreTests.getTileOnLayer({
            layer: placeLayer,
            quadkeys: [qk41, qk42],
            sameCallback: true,
            cancel: {
                layer: placeLayer,
                quadkeys: [qk41, qk42],
                withCallback: true
            },
            onFinish: function(requests, callbackResults) {
                // 4 request(s) sent, 0 callback(s) called
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


    it('get one tile at level 17 and another at 16', function(done) {
        // qk51    = '31123013201110300' // length 17
        // qk52    = '3112301320111030' // length 16
        coreTests.getTileOnLayer({
            layer: placeLayer,
            quadkeys: [qk51, qk52],
            sameCallback: true,
            onFinish: function(requests, callbackResults) {
                // 1 request(s) sent, 2 callback(s) called
                expect(requests.length).to.equal(1);
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

    it('get one tile at level 17 and another at 16, cancel the request at 17', function(done) {
        // qk61    = '31123013201110310' // length 17
        // qk62    = '3112301320111031' // length 16
        coreTests.getTileOnLayer({
            layer: placeLayer,
            quadkeys: [qk61, qk62],
            sameCallback: true,
            cancel: {
                layer: placeLayer,
                quadkeys: [qk61],
                withCallback: true
            },
            onFinish: function(requests, callbackResults) {
                // 1 request(s) sent, 1 callback(s) called
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


    it('get one tile at level 17 and another at 16, cancel the request at 16', function(done) {
        // qk71    = '31123013201110320' // length 17
        // qk72    = '3112301320111032' // length 16
        coreTests.getTileOnLayer({
            layer: placeLayer,
            quadkeys: [qk71, qk72],
            sameCallback: true,
            cancel: {
                layer: placeLayer,
                quadkeys: [null, qk72],
                withCallback: true
            },
            onFinish: function(requests, callbackResults) {
                // 1 request(s) sent, 1 callback(s) called
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


    it('get one tile at level 17 and another at 16, cancel both requests', function(done) {
        // qk81    = '31123013201110330' // length 17
        // qk82    = '3112301320111033' // length 16
        coreTests.getTileOnLayer({
            layer: placeLayer,
            quadkeys: [qk81, qk82],
            sameCallback: true,
            cancel: {
                layer: placeLayer,
                quadkeys: [qk81, qk82],
                withCallback: true
            },
            onFinish: function(requests, callbackResults) {
                // 1 request(s) sent, 0 callback(s) called
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

    it('get requested tile at level 15 and another at 16', function(done) {
        // qk11    = '311230132011130' // length 15
        // qk12    = '3112301320111301' // length 16
        coreTests.getTileOnLayer({
            layer: placeLayer,
            quadkeys: [qk11, qk12],
            sameCallback: true,
            onFinish: function(requests, callbackResults) {
                // 0 request(s) sent, 2 callback(s) called
                expect(requests.length).to.equal(0);
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

    it('get requested tile at level 15 and another at 16, canceled the request at level 15', function(done) {
        // qk11    = '311230132011130' // length 15
        // qk12    = '3112301320111301' // length 16
        coreTests.getTileOnLayer({
            layer: placeLayer,
            quadkeys: [qk11, qk12],
            sameCallback: true,
            cancel: {
                layer: placeLayer,
                quadkeys: [qk11],
                withCallback: true
            },
            onFinish: function(requests, callbackResults) {
                // 0 request(s) sent, 2 callback(s) called
                expect(requests.length).to.equal(0);
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


    it('get requested tile at level 15 and another at 16, canceled the request at level 16', function(done) {
        // qk11    = '311230132011130' // length 15
        // qk12    = '3112301320111301' // length 16
        coreTests.getTileOnLayer({
            layer: placeLayer,
            quadkeys: [qk11, qk12],
            sameCallback: true,
            cancel: {
                layer: placeLayer,
                quadkeys: [null, qk12],
                withCallback: true
            },
            onFinish: function(requests, callbackResults) {
                // 0 request(s) sent, 2 callback(s) called
                expect(requests.length).to.equal(0);
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


    it('get requested tile at level 15 and another at 16, cancel the request at level 16', function(done) {
        // qk21    = '311230132011131' // length 15
        // qk22    = '3112301320111311' // length 16
        coreTests.getTileOnLayer({
            layer: placeLayer,
            quadkeys: [qk21, qk22],
            sameCallback: true,
            cancel: {
                layer: placeLayer,
                quadkeys: [null, qk22],
                withCallback: true
            },
            onFinish: function(requests, callbackResults) {
                // three requests sent callback are called
                expect(requests.length).to.equal(0);
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


    it('get requested but canceled tile at level 15 and another at 16, cancel the request at level 15', function(done) {
        // qk31    = '311230132011132' // length 15
        // qk32    = '3112301320111321' // length 16
        coreTests.getTileOnLayer({
            layer: placeLayer,
            quadkeys: [qk31, qk32],
            sameCallback: true,
            cancel: {
                layer: placeLayer,
                quadkeys: [qk31],
                withCallback: true
            },
            onFinish: function(requests, callbackResults) {
                // 3 request(s) sent, 1 callback(s) called
                expect(requests.length).to.equal(3);
                expect(callbackResults.length).to.equal(1);

                let cancelledRequests = 0;
                for (let r in requests) {
                    if (requests[r].status == 0) {
                        cancelledRequests++;
                    }
                }

                expect(cancelledRequests).to.equal(3);


                done();
            }
        });
    });


    it('get requested but canceled tile at level 15 and another at 16, cancel the request at level 16', function(done) {
        // qk31    = '311230132011132' // length 15
        // qk32    = '3112301320111321' // length 16
        coreTests.getTileOnLayer({
            layer: placeLayer,
            quadkeys: [qk31, qk32],
            sameCallback: true,
            cancel: {
                layer: placeLayer,
                quadkeys: [null, qk32],
                withCallback: true
            },
            onFinish: function(requests, callbackResults) {
                // 3 request(s) sent, 2 callback(s) called
                expect(requests.length).to.equal(3);
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

    it('get requested and cancelled tile at level 15 and another at 16, cancel both requests', function(done) {
        // qk41    = '311230132011133' // length 15
        // qk42    = '3112301320111331' // length 16
        coreTests.getTileOnLayer({
            layer: placeLayer,
            quadkeys: [qk41, qk42],
            sameCallback: true,
            cancel: {
                layer: placeLayer,
                quadkeys: [qk41, qk42],
                withCallback: true
            },
            onFinish: function(requests, callbackResults) {
                // 4 request(s) sent, 0 callback(s) called
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
});

