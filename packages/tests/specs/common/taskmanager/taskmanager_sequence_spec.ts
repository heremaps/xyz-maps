/*
 * Copyright (C) 2019-2025 HERE Europe B.V.
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

import {Task, TaskManager, TaskSequence} from '@here/xyz-maps-common';

describe('task sequence', function() {
    const expect = chai.expect;

    let taskManager = TaskManager.getInstance(5);

    let tasks = [];


    before(() => {
        tasks = [
            taskManager.create({
                init(input) {
                    return {test1: 'init1(' + input + ')'};
                },
                exec(data) {
                    data.test1 = 'exec1(' + data.test1 + ')@' + this.priority;
                },
                onDone: (result) => result.test1 = `result1:${result.test1}`
            }),
            new Task({
                priority: 3,
                init(input) {
                    return {test2: 'init2(' + input.test1 + ')'};
                },
                exec(data) {
                    data.test2 = 'exec2(' + data.test2 + ')@' + this.priority;
                },
                onDone: (result) => result.test2 = `result2:${result.test2}`
            }, taskManager),
            taskManager.create({
                priority: 5,
                init(input) {
                    return {test3: 'init3(' + input.test2 + ')'};
                },
                exec(data) {
                    data.test3 = 'exec3(' + data.test3 + ')@' + this.priority;
                },
                onDone: (result) => result.test3 = `result3:${result.test3}`
            })
        ];
    });


    it('start sequence', async function() {
        let result = await new Promise<void>((resolve) => {
            const taskSequence = new TaskSequence({tasks, onDone: resolve}, taskManager);
            taskSequence.start('startSequenceTest');
        });

        expect(result).to.have.lengthOf(3);
        expect(result).to.be.deep.equal([
            {test1: 'result1:exec1(init1(startSequenceTest))@1'},
            {test2: 'result2:exec2(init2(result1:exec1(init1(startSequenceTest))@1))@3'},
            {test3: 'result3:exec3(init3(result2:exec2(init2(result1:exec1(init1(startSequenceTest))@1))@3))@5'}
        ]);
    });

    it('make sure sequence priorities are respected', async function() {
        let result = await new Promise<void>((resolve) => {
            let execTaskOrderResults = [];

            const taskSequence = new TaskSequence({
                tasks: [
                    new Task({
                        priority: 1,
                        exec(data) {
                        },
                        onDone(result) {
                            execTaskOrderResults.push(`seq1@${this.priority}`);
                        }
                    }, taskManager),
                    new Task({
                        priority: 5,
                        exec(data) {
                        },
                        onDone(result) {
                            execTaskOrderResults.push(`seq2@${this.priority}`);
                        }
                    }, taskManager)
                ],
                onDone() {
                    execTaskOrderResults.push('sequenceDone');
                    resolve(execTaskOrderResults);
                }
            }, taskManager);

            const interruptTask = new Task({
                priority: 3,
                exec(data) {
                },
                onDone(result) {
                    execTaskOrderResults.push(`interruptTask1@${this.priority}`);
                }
            }, taskManager);

            taskSequence.start();
            interruptTask.start();
        });

        expect(result).to.have.lengthOf(4);
        expect(result).to.be.deep.equal([
            'seq1@1',
            'interruptTask1@3',
            'seq2@5',
            'sequenceDone'
        ]);
    });


    it('make sure sequence is not interrupted by same prio task', async function() {
        let result = await new Promise<void>((resolve) => {
            let execTaskOrderResults = [];

            const taskSequence = new TaskSequence({
                tasks: [
                    new Task({
                        priority: 3,
                        exec(data) {
                        },
                        onDone(result) {
                            execTaskOrderResults.push(`seq1@${this.priority}`);
                        }
                    }, taskManager),
                    new Task({
                        priority: 3,
                        exec(data) {
                        },
                        onDone(result) {
                            execTaskOrderResults.push(`seq2@${this.priority}`);
                        }
                    }, taskManager)
                ],
                onDone() {
                    execTaskOrderResults.push('sequenceDone');
                    resolve(execTaskOrderResults);
                }
            }, taskManager);

            const interruptTask = new Task({
                priority: 3,
                exec(data) {
                },
                onDone(result) {
                    execTaskOrderResults.push(`interruptTask1@${this.priority}`);
                }
            }, taskManager);

            taskSequence.start();
            interruptTask.start();
        });

        console.log(result);

        expect(result).to.have.lengthOf(4);
        expect(result).to.be.deep.equal([
            'seq1@3',
            'seq2@3',
            'sequenceDone',
            'interruptTask1@3'
        ]);
    });
});
