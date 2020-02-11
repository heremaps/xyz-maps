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

import mapsCommon from '@here/xyz-maps-common';

describe('task manager run 2 tasks', function() {
    const expect = chai.expect;

    let taskmanager = mapsCommon.TaskManager.getInstance( 5 );

    it('one task start another same priority task', async function() {
        let results1 = [];
        let results2 = [];
        let current = 0;
        let taskFinish = 1;

        // create tasks
        await new Promise((resolve)=>{
            let task1 = taskmanager.create({
                name: 'task1',

                priority: 1,

                init: function() {
                    results1.push(current++);
                    results1.push('INIT1');

                    return [1];
                },

                time: 2,

                exec: function( data ) {
                    results1.push(current++);
                    results2.push(data[0]++);

                    // start the other task
                    if (data[0] == 2) {
                        task2.start();
                    }

                    return data[0]<=6;
                },

                onDone: function() {
                    results1.push('DONE1');
                    results1.push(current++);

                    if (++taskFinish == 2) {
                        resolve();
                    }
                }
            });

            let task2 = taskmanager.create({
                name: 'task2',

                priority: 1,

                init: function() {
                    results1.push(current++);
                    results1.push('INIT2');

                    return [11];
                },

                time: 2,

                exec: function( data ) {
                    results1.push(current++);
                    results2.push(data[0]++);

                    return data[0]<=16;
                },

                onDone: function() {
                    results1.push('DONE2');
                    results1.push(current++);


                    if (++taskFinish == 2) {
                        resolve();
                    }
                }
            });

            task1.start();
        });


        expect(results1).to.be.deep.equal([0, 'INIT1', 1, 2, 3, 4, 5, 6, 'DONE1', 7, 8, 'INIT2', 9, 10, 11, 12, 13, 14, 'DONE2', 15]);
        expect(results2).to.be.deep.equal([1, 2, 3, 4, 5, 6, 11, 12, 13, 14, 15, 16]);
    });

    it('one task starts another higher priority task', async function() {
        let results1 = [];
        let results2 = [];
        let current = 0;
        let taskFinish = 1;

        // create tasks
        await new Promise((resolve)=>{
            let task1 = taskmanager.create({
                name: 'task1',

                priority: 2,

                init: function() {
                    results1.push(current++);
                    results1.push('INIT1');

                    return [1];
                },

                time: 2,

                exec: function( data ) {
                    results1.push(current++);
                    results2.push(data[0]++);

                    // start the other task
                    if (data[0] == 2) {
                        task2.start();
                    }

                    return data[0]<=6;
                },

                onDone: function() {
                    results1.push(current++);
                    results1.push('DONE1');

                    if (++taskFinish == 2) {
                        resolve();
                    }
                }
            });

            let task2 = taskmanager.create({
                name: 'task2',

                priority: 1,

                init: function() {
                    results1.push(current++);
                    results1.push('INIT2');

                    return [11];
                },

                time: 2,

                exec: function( data ) {
                    results1.push(current++);
                    results2.push(data[0]++);

                    return data[0]<=16;
                },

                onDone: function() {
                    results1.push(current++);
                    results1.push('DONE2');


                    if (++taskFinish == 2) {
                        resolve();
                    }
                }
            });

            task1.start();
        });

        expect(results1).to.be.deep.equal([0, 'INIT1', 1, 2, 'INIT2', 3, 4, 5, 6, 7, 8, 9, 'DONE2', 10, 11, 12, 13, 14, 15, 'DONE1']);
        expect(results2).to.be.deep.equal([1, 11, 12, 13, 14, 15, 16, 2, 3, 4, 5, 6]);
    });

    it('one task start another lower priority task', async function() {
        let results1 = [];
        let results2 = [];
        let current = 0;
        let taskFinish = 1;

        // create tasks
        await new Promise((resolve)=>{
            let task1 = taskmanager.create({
                name: 'task1',

                priority: 1,

                init: function() {
                    results1.push(current++);
                    results1.push('INIT1');

                    return [1];
                },

                time: 2,

                exec: function( data ) {
                    results1.push(current++);
                    results2.push(data[0]++);

                    // start the other task
                    if (data[0] == 2) {
                        task2.start();
                    }

                    return data[0]<=6;
                },

                onDone: function() {
                    results1.push(current++);
                    results1.push('DONE1');

                    if (++taskFinish == 2) {
                        resolve();
                    }
                }
            });

            let task2 = taskmanager.create({
                name: 'task2',

                priority: 2,

                init: function() {
                    results1.push(current++);
                    results1.push('INIT2');

                    return [11];
                },

                time: 2,

                exec: function( data ) {
                    results1.push(current++);
                    results2.push(data[0]++);

                    return data[0]<=16;
                },

                onDone: function() {
                    results1.push(current++);
                    results1.push('DONE2');


                    if (++taskFinish == 2) {
                        resolve();
                    }
                }
            });

            task1.start();
        });

        expect(results1).to.be.deep.equal([0, 'INIT1', 1, 2, 3, 4, 5, 6, 7, 'DONE1', 8, 'INIT2', 9, 10, 11, 12, 13, 14, 15, 'DONE2']);
        expect(results2).to.be.deep.equal([1, 2, 3, 4, 5, 6, 11, 12, 13, 14, 15, 16]);
    });


    it('start tasks with same priority', async function() {
        let results1 = [];
        let results2 = [];
        let current = 0;
        let taskFinish = 1;

        await new Promise((resolve)=>{
            let task1 = taskmanager.create({
                name: 'task1',

                priority: 1,

                init: function() {
                    results1.push(current++);
                    results1.push('INIT1');

                    return [1];
                },

                time: 2,

                exec: function( data ) {
                    results1.push(current++);
                    results2.push(data[0]++);

                    return data[0]<=6;
                },

                onDone: function() {
                    results1.push(current++);
                    results1.push('DONE1');

                    if (++taskFinish == 2) {
                        resolve();
                    }
                }
            });

            let task2 = taskmanager.create({
                name: 'task2',

                priority: 1,

                init: function() {
                    results1.push(current++);
                    results1.push('INIT2');

                    return [11];
                },

                time: 2,

                exec: function( data ) {
                    results1.push(current++);
                    results2.push(data[0]++);

                    return data[0]<=16;
                },

                onDone: function() {
                    results1.push(current++);
                    results1.push('DONE2');


                    if (++taskFinish == 2) {
                        resolve();
                    }
                }
            });

            task1.start();
            task2.start();
        });


        expect(results1).to.be.deep.equal([0, 'INIT1', 1, 2, 3, 4, 5, 6, 7, 'DONE1', 8, 'INIT2', 9, 10, 11, 12, 13, 14, 15, 'DONE2']);
        expect(results2).to.be.deep.equal([1, 2, 3, 4, 5, 6, 11, 12, 13, 14, 15, 16]);
    });


    it('start a task and then a higher priority task', async function() {
        let results1 = [];
        let results2 = [];
        let current = 0;
        let taskFinish = 1;

        await new Promise((resolve)=>{
            let task1 = taskmanager.create({
                name: 'task1',

                priority: 2,

                init: function() {
                    results1.push(current++);
                    results1.push('INIT1');

                    return [1];
                },

                time: 2,

                exec: function( data ) {
                    results1.push(current++);
                    results2.push(data[0]++);

                    return data[0]<=6;
                },

                onDone: function() {
                    results1.push(current++);
                    results1.push('DONE1');

                    if (++taskFinish == 2) {
                        resolve();
                    }
                }
            });

            let task2 = taskmanager.create({
                name: 'task2',

                priority: 1,

                init: function() {
                    results1.push(current++);
                    results1.push('INIT2');

                    return [11];
                },

                time: 2,

                exec: function( data ) {
                    results1.push(current++);
                    results2.push(data[0]++);

                    return data[0]<=16;
                },

                onDone: function() {
                    results1.push(current++);
                    results1.push('DONE2');


                    if (++taskFinish == 2) {
                        resolve();
                    }
                }
            });

            task1.start();
            task2.start();
        });

        expect(results1).to.be.deep.equal([0, 'INIT2', 1, 2, 3, 4, 5, 6, 7, 'DONE2', 8, 'INIT1', 9, 10, 11, 12, 13, 14, 15, 'DONE1']);
        expect(results2).to.be.deep.equal([11, 12, 13, 14, 15, 16, 1, 2, 3, 4, 5, 6]);
    });


    it('start a task and then a lower priority task', async function() {
        let results1 = [];
        let results2 = [];
        let current = 0;
        let taskFinish = 1;

        await new Promise((resolve)=>{
            let task1 = taskmanager.create({
                name: 'task1',

                priority: 1,

                init: function() {
                    results1.push(current++);
                    results1.push('INIT1');

                    return [1];
                },

                time: 2,

                exec: function( data ) {
                    results1.push(current++);
                    results2.push(data[0]++);

                    return data[0]<=6;
                },

                onDone: function() {
                    results1.push(current++);
                    results1.push('DONE1');

                    if (++taskFinish == 2) {
                        resolve();
                    }
                }
            });

            let task2 = taskmanager.create({
                name: 'task2',

                priority: 2,

                init: function() {
                    results1.push(current++);
                    results1.push('INIT2');

                    return [11];
                },

                time: 2,

                exec: function( data ) {
                    results1.push(current++);
                    results2.push(data[0]++);

                    return data[0]<=16;
                },

                onDone: function() {
                    results1.push(current++);
                    results1.push('DONE2');


                    if (++taskFinish == 2) {
                        resolve();
                    }
                }
            });

            task1.start();
            task2.start();
        });

        expect(results1).to.be.deep.equal([0, 'INIT1', 1, 2, 3, 4, 5, 6, 7, 'DONE1', 8, 'INIT2', 9, 10, 11, 12, 13, 14, 15, 'DONE2']);
        expect(results2).to.be.deep.equal([1, 2, 3, 4, 5, 6, 11, 12, 13, 14, 15, 16]);
    });
});
