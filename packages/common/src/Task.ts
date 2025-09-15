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

import taskManagerSingleton, {TaskManager} from './TaskManager';

let TASK_ID = 0;

export interface TaskRestartOptions<I = any, O = any> {
    init?: (i: I) => O;
    onDone?: () => void;
    priority?: number;
}

export interface TaskOptions<I = any, O = any> {
    priority?: number;
    exec?: (data?: O) => boolean | void;
    init?: (data?: I) => any;
    time?: number;
    onDone?: (data?: O) => void;
    name?: string;
}

class Task<I = any, O = any> {
    protected manager: TaskManager;

    id: number;

    CONTINUE: boolean;

    BREAK: boolean;

    // onDone: (any) => void;

    yield: boolean;

    paused: boolean;

    priority: number;

    canceled: boolean;

    // exec: (any?) => boolean | void;

    _data: any;

    name: string;

    time: number;

    _initData: any;

    started: boolean;


    constructor(
        options: TaskOptions<I, O> = {},
        manager?: TaskManager
    ) {
        this.id = ++TASK_ID;

        if (options.exec) this.exec = options.exec;
        if (options.init) this.init = options.init;
        if (options.onDone) this.onDone = options.onDone;

        this.name = options.name;
        this.time = options.time || 100;
        this.setPriority(options.priority);

        this.manager = manager || taskManagerSingleton.getInstance();
    }
    protected setPriority(prio: number) {
        this.priority = Math.max(Math.min(prio ^ 0, 5), 1);
    }

    setManager(manager: TaskManager) {
        this.manager = manager;
    }

    start(data?: any) {
        this._initData = data;
        return this.manager.start(this);
    };

    pause() {
        this.paused = true;
        return this.CONTINUE;
    }

    resume() {
        this.paused = false;
        this.start(this._initData);
    }

    restart(opt: TaskRestartOptions<I, O> = {}) {
        const {_initData} = this;

        // cancel in case of active
        this.cancel();

        // reset
        this.paused = false;
        this.canceled = false;
        this.yield = false;
        this._data = null;

        if (opt.init) {
            this.init = opt.init;
        }

        if (opt.priority) {
            this.setPriority(opt.priority);
        }

        if (opt.onDone) {
            this.onDone = opt.onDone;
        }

        // start
        this.start(_initData);
    };

    init(data?: I): O {
        return (<unknown>data) as O;
    };

    exec(data?: O): boolean | void {

    }

    onDone(data?: O) {

    };

    // yield() {
    //     const task = this;
    //     return task.manager.yield(task);
    // };

    cancel() {
        this._initData = null;
        return this.manager.cancel(this);
    };

    isInterrupted(): boolean {
        return this.started && this.yield;
    }
}

Task.prototype.CONTINUE = true;

Task.prototype.BREAK = false;

Task.prototype.onDone = null;

Task.prototype._data = null;

Task.prototype.yield = false;

Task.prototype.canceled = false;

export default Task;
