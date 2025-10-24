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
import Task from './Task';
import {TaskManager} from './TaskManager';


type TASK_RESULT<T extends readonly Task<any, any, any>[]> = {
    [K in keyof T]: T[K] extends Task<any, any, infer R> ? R : never;
};

// type FIRST_TASK_INPUT<I> = [Task<I, any, any>, ...Task<any, any, any>[]];

export class TaskSequence<T extends readonly Task<any, any, any>[]> extends Task {
    private tasks: T;
    private results: any[] = [];
    // private results: TASK_RESULT<T> = [];
    private current: number;
    private onAllDone: (results?: TASK_RESULT<T>) => void;


    constructor(options: {
        tasks: T,
        onDone?: (results?: TASK_RESULT<T>) => void,
        name?: string,
        /**
         * if defined will override priority of all tasks in the sequence,
         * otherwise each task's priority will be used.
         */
        priority?: number
    }, manager?: TaskManager) {
        const tasks = options.tasks;
        super({
            name: options.name,
            priority: options.priority
        }, manager);

        this.tasks = tasks;
        this.onAllDone = options.onDone;

        this.initSequence();
    }

    private setActiveTask(i: number) {
        this.current = i;
        this.priority = this.tasks[i].priority;
        this.time = this.tasks[i].time;
    }

    private initSequence() {
        this.setActiveTask(0);
        this.results.length = 0;
    }

    private curTask(): Task {
        return this.tasks[this.current];
    }

    private nextTask(): Task {
        const nextIndex = this.current + 1;
        if (nextIndex < this.tasks.length) {
            this.setActiveTask(nextIndex);
            return this.tasks[nextIndex];
        }
    }

    init(data?) {
        const task = this.curTask();
        return task.init(data);
    }

    exec(data) {
        return this.curTask()!.exec(data);
    }

    cancel(): boolean {
        // cancel gets called before a task gets restarted.
        // So we use to reset the sequence state.
        this.initSequence();
        return super.cancel();
    }

    onDone(result) {
        let task = this.curTask();

        const doneResult = task.onDone?.(result);
        result = doneResult === undefined ? result : doneResult;
        // const result = this._data;
        this.results.push(result);

        const nextTask = this.nextTask();
        if (nextTask) {
            this._initData = result;
            // Re-insert the sequence task at the front of the queue with the correct priority to
            // prevent interruption by other tasks of the same priority.
            this.manager._insert(this, true);
            // this.resume();
        } else {
            const results = this.results.slice();
            this.initSequence();
            this.onAllDone?.(results as TASK_RESULT<T>[]);
        }
    }
}
