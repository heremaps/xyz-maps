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

import {TaskManager} from './TaskManager';

let TASK_ID = 0;

export interface TaskRestartOptions<I=any, O=any> {
    init?: (i:I) => O;
    onDone?: () => void;
    priority?: number;
}


class Task<I=any, O=any> {
    private manager: TaskManager;

    id: number;

    CONTINUE: boolean;

    BREAK: boolean;

    onDone: (any) => void;

    yield: boolean;

    paused: boolean;

    priority: number;

    delayed: number;

    delay: number;

    canceled: boolean;

    exec: (any?) => boolean | void;

    heap: any;

    name: string;

    time: number;

    _data: any;

    started: boolean;


    constructor(
        manager: TaskManager,
        prio: number,
        task: (any?: O) => boolean | void,
        init?: (data?: I) => any,
        time?: number,
        onDone?: (data?: O) => void,
        name?: string,
        delay?: number
    ) {
        this.id = ++TASK_ID;

        this.exec = task;

        if (init) {
            this.init = init;
        }

        this.delay = delay ^ 0;

        this.name = name;

        this.time = time || 100;

        this.priority = Math.max(Math.min(prio ^ 0, 5), 1);

        this.manager = manager;

        if (onDone) {
            this.onDone = onDone;
        }
    }

    start(data?: any) {
        const task = this;

        task._data = data;

        return task.manager.start(task);
    };

    pause() {
        this.paused = true;
        return this.CONTINUE;
    }

    resume() {
        this.paused = false;
        this.start(this._data);
    }

    restart(opt: TaskRestartOptions<I, O> = {}) {
        const {_data} = this;

        // cancel in case of active
        this.cancel();

        // reset
        this.paused = false;
        this.canceled = false;
        this.yield = false;
        this.delayed = null;
        this.heap = null;
        this._data = _data;


        if (opt.init) {
            this.init = opt.init;
        }

        if (opt.priority) {
            this.priority = opt.priority;
        }

        if (opt.onDone) {
            this.onDone = opt.onDone;
        }

        // start
        this.start();
    };

    init(data?: I): O {
        return (<unknown>data) as O;
    };

    // yield() {
    //     const task = this;
    //     return task.manager.yield(task);
    // };

    cancel() {
        const task = this;

        task._data = null;

        return task.manager.cancel(task);
    };

    isInterrupted(): boolean {
        return this.started && this.yield;
    }
}

Task.prototype.CONTINUE = true;

Task.prototype.BREAK = false;

Task.prototype.onDone = null;

Task.prototype.heap = null;

Task.prototype.yield = false;

Task.prototype.delayed = null;

Task.prototype.canceled = false;

export default Task;
