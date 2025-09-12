/*
 * Copyright (C) 2019-2023 HERE Europe B.V.
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

import global from './global';
import Task, {TaskOptions} from './Task';

// Target frame time for 60 FPS, minus 4ms headroom for all non-TaskManager processing
const FPS60 = 1000 / 60 - 4;
let TMID = 0;

export class TaskManager {
    private active: boolean;
    private queue: Array<Array<Task>>;

    id: number;
    // exclusive runtime for all running tasks in ms
    time: number = FPS60; // -> 60FPS
    // current executing task...
    private task: Task;
    private _delayed: number = null;
    private now = Date.now;

    private _resume: () => void;


    constructor(time?: number) {
        const taskManager = this;

        taskManager.queue = [
            [], // P0 -> timer tasks only
            [], // P1
            [], // P2
            [], // P3
            [], // P4
            [] // P5
        ];

        taskManager.id = TMID++;

        taskManager.active = false;

        if (time > 1) {
            taskManager.time = time || FPS60;
        }

        // use postMessage if available because setTimeout has a minimum delay of 4ms...
        if (global.postMessage) {
            const msgname = 'tm-' + taskManager.id;

            global.addEventListener('message', (event) => {
                if (event.source == global && event.data == msgname) {
                    event.stopPropagation();
                    taskManager.runner();
                }
            }, true);

            taskManager._resume = () => {
                taskManager.active = true;
                global.postMessage(msgname, '*');
            };
        } else {
            taskManager._resume = () => {
                taskManager.active = true;
                setTimeout(taskManager.runner.bind(taskManager), 0);
            };
        }
    };

    // private _resume = () => {
    //     this.active = true;
    //     requestAnimationFrame(() => this.runner());
    // };

    runner(runnerStartTS?: number) {
        const manager = this;
        let runtimeLeft = true;
        let runTimeExceeded;
        let taskDuration;
        let execStopped;
        let initStartTs;
        let taskStartTS;
        let taskStopTS;
        let task: Task;
        let done;
        let data;

        runnerStartTS = runnerStartTS || manager.now();

        if (!manager.active) {
            manager._resume();
        } else {
            while ((
                runtimeLeft = manager.now() - runnerStartTS < manager.time) && (
                manager.task = task = manager._next()
            )) {
                execStopped = false;

                done = false;

                if (task.yield) {
                    task.yield = false;
                    data = task.heap;
                } else {
                    initStartTs = manager.now();
                    data = task.init(task._data);
                }

                while (!done) {
                    taskStartTS = initStartTs || manager.now();

                    done = !task.exec(data) || task.canceled;

                    taskStopTS = manager.now();

                    taskDuration = taskStopTS - taskStartTS;

                    initStartTs = null;
                    // total taskrunner's time is exceeded
                    runTimeExceeded = taskStopTS - runnerStartTS > manager.time;

                    manager.task = null;

                    if (task.paused) {
                        done = true;
                        runTimeExceeded = false;
                        execStopped = true;
                        task.heap = data;
                        task.started = false;
                        task.yield = true;
                    }

                    // if( task.canceled )
                    // {
                    // debugger;
                    // if( !runTimeExceeded )
                    // {
                    //     break;
                    // }
                    // else
                    // {
                    //     return manager._resume();
                    // }
                    // }

                    // if( !done && task.delay )
                    // {
                    //     task.paused    = true;
                    //     task.heap      = data;
                    //
                    //     task.delayed   = Date.now() + task.delay;
                    //
                    //     manager.active = false;
                    //
                    //     manager._insert( task, true );
                    //
                    //     return manager.runner( runnerStartTS );
                    // }

                    if (
                        !done && (
                            // check if task as been paused due to task with higher priority arrived.
                            (task.yield || // check if task's runtime hasn't been exceeded
                                taskDuration >= task.time)
                        ) ||
                        // total taskrunner's time is exceeded
                        runTimeExceeded
                    ) {
                        if (!done) {
                            // no more runtime left -> put back in queue
                            // manager.queue[ task.priority ].unshift( task );
                            manager._insert(manager.task = task, true);

                            task.yield = true;

                            task.heap = data;
                        }
                        // check if total runner's time is exceeded
                        if (runTimeExceeded) {
                            // make sure next runner will be triggered async
                            // manager.active = false;

                            if (done) {
                                this.completeTask(task, data);
                            }

                            return manager._resume();
                        }

                        execStopped = true;
                        break;
                        // return manager.runner( runnerStartTS );
                    }
                }

                if (!execStopped) {
                    task.yield = false;
                    task.heap = null;
                    this.completeTask(task, data);
                }
            }

            if (!runtimeLeft) {
                return manager._resume();
            }

            manager.active = false;
        }
    };

    private completeTask(task: Task, data) {
        task.started = false;
        if (!task.canceled) {
            task.onDone?.(data);
        }
    }

    setExclusiveTime(time: number) {
        this.time = time ^ 0;
    };

    private _next() {
        const manager = this;
        const {queue} = manager;
        const nextDelayed = queue[0][0];
        const nowTS = manager.now();
        let task;

        if (nextDelayed && nowTS >= nextDelayed.delayed) {
            if (manager._delayed) {
                global.clearTimeout(manager._delayed);
            }

            return manager.queue[0].shift();
        }

        for (let prio = 1, {length} = queue; prio < length; prio++) {
            if (task = queue[prio].shift()) {
                return task;
            }
        }

        if (nextDelayed) {
            if (manager._delayed) {
                global.clearTimeout(manager._delayed);
            }

            manager._delayed = global.setTimeout(() => {
                manager._delayed = null;
                // make sure exec is sync
                manager.active = true;

                manager.runner();
                // manager.go();
            },
            nextDelayed.delayed - nowTS
            );
        }
    };

    create<I = any, O = any>(task: TaskOptions<I, O>): Task<I, O> {
        return new Task(task, this);
    };


    _insert(task: Task, first?: boolean) {
        let queue;

        if (task.delay) {
            task.delayed = this.now() + task.delay;

            queue = this.queue[0];

            // binary insert
            let l = 0;
            let r = queue.length - 1;
            let m;

            while (l <= r) {
                m = (l + r) / 2 | 0;

                if (queue[m].delayed > task.delayed) {
                    r = m - 1;
                    continue;
                }

                l = m + 1;

                if (queue[m].delayed == task.delayed) {
                    break; // replace with return if no duplicates are desired
                }
            }
            queue.splice(l, 0, task);
        } else {
            queue = this.queue[task.priority];

            if (first) {
                queue.unshift(task);
            } else {
                queue.push(task);
            }
        }
    };


    isWaiting(task: Task) {
        return this.queue[

            task.delay
                ? 0
                : task.priority

        ].indexOf(task) != -1;
    };


    start(task: Task, forceSync?: boolean) {
        const curTask = this.task;
        // var taskPrio = this.getPriority( task )

        if (task.started || task.paused) {
            return;
        }

        task.started = true;

        // make sure task is not running already..
        if (task != curTask) {
            task.canceled = false;

            this._insert(task);

            // this.queue[ task.priority ].push( task );

            if (!this.active) {
                this.active = !!forceSync;

                this.runner();
            } else if (curTask && curTask.priority > task.priority) {
                // current executing task has less priority -> pause the task!
                curTask.yield = true;
            }
        }
    };

    cancel(task: Task) {
        task.canceled = true;

        // make sure task init is getting executed in case of a restart
        task.yield = false;

        task.started = false;

        const isTaskRunning = task == this.task;

        // if( !isTaskRunning )
        // {
        const prio = task.delay ? 0 : task.priority;

        const queue = this.queue[prio];

        const idx = queue.indexOf(task);

        // check if task is still in queue and waiting for execution
        if (idx != -1) {
            // remove task from queue
            queue.splice(idx, 1);
        }
        // }

        if (isTaskRunning) {
            this.task = null;
        }


        // return true if task got canceled during execution...
        return isTaskRunning;
    };
}


let instance;


const taskManager = {

    getInstance: function(time?: number): TaskManager {
        if (!instance) {
            instance = this.createInstance(time);
        } else if (typeof time == 'number') {
            instance.time = time;
        }

        return instance;
    },

    createInstance: function(time?: number): TaskManager {
        this.active = true;
        return new TaskManager(time);
    },

    active: false
};

export default taskManager;
