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

import {TaskManager} from '@here/xyz-maps-common';

describe('task manager: interrupts', function() {
    const taskmanager = TaskManager.getInstance();
    const taskMangerDefaultTime = taskmanager.time;

    after(() => {
        taskmanager.time = taskMangerDefaultTime;
    });

    it('should interrupt unexpectedly long-running tasks', async () => {
        let timeline = [];
        await new Promise<void>((resolve) => {
            taskmanager.time = 200;
            let remainingCallbacks = 2;
            let task = taskmanager.create({
                name: 'task',
                priority: 1,
                init: function() {
                    return {cnt: 0};
                },
                time: 2,
                exec: function(data) {
                    let start = performance.now();
                    while (performance.now() - start <= 6) {
                        // busy wait to simulate long running task
                    }
                    const cnt = ++data.cnt;
                    timeline.push(`Task-exec-${cnt}`);
                    return cnt < 5;
                },
                onDone: function() {
                    timeline.push(`${this.name}-done`);
                    if (--remainingCallbacks == 0) resolve();
                }
            });


            setTimeout(() => {
                timeline.push('Timer');
                if (--remainingCallbacks == 0) resolve();
            }, 2);
            task.start();
            // queueMicrotask(() => timeline.push('Timer'));
        });

        timeline.indexOf('Timer').should.be.greaterThan(0);
        timeline.indexOf('Timer').should.be.lessThan(timeline.length - 1);
        timeline.length.should.equal(7);
        timeline.indexOf('Timer').should.not.equal(-1);
    });

    it('should not interrupt long-running tasks within allowed task time', async () => {
        let timeline = [];

        await new Promise<void>((resolve) => {
            taskmanager.time = 200;

            let remainingCallbacks = 2;
            let task = taskmanager.create({
                name: 'task',
                priority: 1,
                init: function() {
                    return {cnt: 0};
                },
                time: 100,
                exec: function(data) {
                    let start = performance.now();
                    while (performance.now() - start <= 6) {
                        // busy wait to simulate long running task
                    }
                    const cnt = ++data.cnt;
                    timeline.push(`Task-exec-${cnt}`);
                    return cnt < 5;
                },
                onDone: function() {
                    timeline.push(`${this.name}-done`);
                    if (--remainingCallbacks == 0) resolve();
                }
            });

            setTimeout(() => {
                timeline.push('Timer');
                if (--remainingCallbacks == 0) resolve();
            }, 2);

            task.start();
            // queueMicrotask(() => timeline.push('Timer'));
        });
        timeline.indexOf('Timer').should.equal(timeline.length - 1);
        timeline.length.should.equal(7);
    });

    it('should interrupt long-running tasks that exceed TaskManager frame time, even if within task time', async () => {
        let timeline = [];

        await new Promise<void>((resolve) => {
            taskmanager.time = 20;

            let remainingCallbacks = 2;
            let task = taskmanager.create({
                name: 'task',
                priority: 1,
                init: function() {
                    return {cnt: 0};
                },
                time: 200,
                exec: function(data) {
                    let start = performance.now();
                    while (performance.now() - start <= 10) {
                        // busy wait to simulate long running task
                    }
                    const cnt = ++data.cnt;
                    timeline.push(`Task-exec-${cnt}`);
                    return cnt < 8;
                },
                onDone: function() {
                    timeline.push('Task-done');
                    if (--remainingCallbacks == 0) resolve();
                }
            });

            setTimeout(() => {
                timeline.push('Timer');
                if (--remainingCallbacks == 0) resolve();
            }, 2);

            task.start();
            // queueMicrotask(() => timeline.push('Timer'));
        });

        timeline.indexOf('Timer').should.be.greaterThan(0);
        timeline.indexOf('Timer').should.be.lessThan(timeline.length - 1);
        timeline.length.should.equal(10);
    });


    it('should handle multiple long-running tasks and timer interruption correctly', async () => {
        let timeline = [];

        await new Promise<void>((resolve) => {
            taskmanager.time = 20;
            let remainingCallbacks = 3;

            let task1 = taskmanager.create({
                name: 'task1',
                priority: 1,
                time: 100,
                init: function() {
                    return {cnt: 0};
                },
                exec: function(data) {
                    const start = performance.now();
                    while (performance.now() - start <= 10) {
                        // busy wait to simulate long running task
                    }
                    const cnt = ++data.cnt;
                    timeline.push(`${this.name}-exec-${cnt}`);
                    return cnt < 5;
                },
                onDone: function() {
                    timeline.push(`${this.name}-done`);
                    if (--remainingCallbacks == 0) resolve();
                }
            });
            let task2 = taskmanager.create({
                name: 'task2',
                priority: 1,
                time: 100,
                init: function() {
                    return {cnt: 0};
                },
                exec: function(data) {
                    const start = performance.now();
                    while (performance.now() - start <= 10) {
                        // busy wait to simulate long running task
                    }
                    const cnt = ++data.cnt;
                    timeline.push(`${this.name}-exec-${cnt}`);
                    return cnt < 5;
                },
                onDone: function() {
                    timeline.push(`${this.name}-done`);
                    if (--remainingCallbacks == 0) resolve();
                }
            });


            setTimeout(() => {
                timeline.push('Timer');
                if (--remainingCallbacks == 0) resolve();
            }, 2);

            task1.start();
            task2.start();
            // queueMicrotask(() => timeline.push('Timer'));
        });

        timeline.indexOf('Timer').should.be.greaterThan(0);
        timeline.indexOf('Timer').should.be.lessThan(timeline.length - 1);

        const task1DoneIdx = timeline.indexOf('task1-done');
        timeline.indexOf('Timer').should.be.lessThan(task1DoneIdx);

        const task2DoneIdx = timeline.indexOf('task2-done');
        task1DoneIdx.should.be.lessThan(task2DoneIdx);

        timeline.length.should.equal(13);
    });
});
