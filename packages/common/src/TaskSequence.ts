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


export class TaskSequence<I = any, O = any> extends Task<I, O> {
    private tasks: Task[];
    private results: O[] = [];
    private current: number;
    private onAllDone: (results?: O[]) => void;

    private sequencePriority: number;

    constructor(options: {
        tasks: Task[],
        onDone?: (results?: O[]) => void,
        name?: string,
        /**
         * if defined will override priority of all tasks in the sequence,
         * otherwise each task's priority will be used.
         */
        priority?: number
    }, manager: TaskManager) {
        const tasks = options.tasks;
        super({
            name: options.name,
            priority: options.priority
        }, manager);

        this.sequencePriority = this.priority;
        this.tasks = tasks;
        this.onAllDone = options.onDone;
        this.initSequence();
    }

    private initSequence() {
        this.priority = this.tasks[0].priority ?? this.sequencePriority;
        this.results.length = this.current = 0;
    }

    private curTask(): Task {
        return this.tasks[this.current];
    }

    private nextTask(): Task {
        return this.tasks[++this.current];
    }

    init(data?: I): O {
        const task = this.curTask();
        return task.init.call(task, data);
    }

    exec(data: O) {
        const task = this.curTask();
        return task.exec.call(task, data);
    }

    cancel(): boolean {
        // cancel gets called before a task gets restarted.
        // So we use to reset the sequence state.
        this.initSequence();
        return super.cancel();
    }

    onDone(result) {
        let task = this.curTask();
        task.onDone?.call(task, result);
        // const result = this._data;
        this.results.push(result);

        const nextTask = this.nextTask();
        if (nextTask) {
            this._data = result;
            const prio = nextTask.priority ?? this.sequencePriority;
            this.priority = prio;
            // Re-insert the sequence task at the front of the queue with the correct priority to
            // prevent interruption by other tasks of the same priority.
            this.manager._insert(this, true);
            // this.resume();
        } else {
            const results = this.results.slice();
            this.initSequence();
            this.onAllDone?.(results);
        }
    }
}
