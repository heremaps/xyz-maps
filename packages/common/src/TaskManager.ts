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

    runner(runnerStartTS?: number) {
        const manager = this;

        if (!manager.active) return manager._resume();

        runnerStartTS ||= manager.now();

        while (true) {
            const task: Task = manager._next();
            if (!task) break;

            let done = false;
            let taskStopTs: number;
            let initStartTs: number;
            let data;

            if (task.yield) {
                task.yield = false;
                data = task._data;
            } else {
                initStartTs = manager.now();
                data = task.init(task._initData);
            }

            while (!done) {
                const taskStartTS = initStartTs || manager.now();
                initStartTs = null;

                done = !task.exec(data) || task.canceled;

                manager.task = null;

                if (done) {
                    task.yield = false;
                    task._data = null;
                    this.completeTask(task, data);
                    taskStopTs = manager.now();
                    break;
                }
                taskStopTs = manager.now();

                if (task.paused) {
                    task._data = data;
                    task.started = false;
                    task.yield = true;
                    break;
                }

                if (
                    task.yield ||
                    // task's exclusive runtime is exceeded
                    (taskStopTs - taskStartTS) > task.time ||
                    // total taskrunner's time is exceeded
                    (taskStopTs - runnerStartTS) > manager.time
                ) {
                    this.resumeTask(task, data);
                    return manager._resume();
                }
            }

            const runtimeLeft = taskStopTs - runnerStartTS < manager.time;
            if (!runtimeLeft) {
                return manager._resume();
            }
        }

        manager.active = false;
    };

    private completeTask(task: Task, data) {
        task.started = false;
        if (!task.canceled) {
            task.onDone?.(data);
        }
    }

    private resumeTask(task, data) {
        this._insert(this.task = task, true);
        task.yield = true;
        task._data = data;
    }

    setExclusiveTime(time: number) {
        this.time = time ^ 0;
    };

    private _next() {
        const queue = this.queue;
        let task: Task = null;
        for (let prio = 1, {length} = queue; prio < length; prio++) {
            if (task = queue[prio].shift()) {
                break;
            }
        }
        return this.task = task;
    };

    create<I = any, O = any>(task: TaskOptions<I, O>): Task<I, O> {
        return new Task(task, this);
    };


    _insert(task: Task, first?: boolean) {
        const queue = this.queue[task.priority];

        if (first) {
            queue.unshift(task);
        } else {
            queue.push(task);
        }
    };


    isWaiting(task: Task) {
        return this.queue[task.priority].indexOf(task) != -1;
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
        const prio = task.priority;

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

/**
 * TaskManager
 * @hidden
 */
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
