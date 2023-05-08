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

import {TaskManager} from '@here/xyz-maps-common';

describe('task manager pause&resume', function() {
    const expect = chai.expect;

    let taskmanager = TaskManager.getInstance( 5 );
    let runSequence = [];
    let task1;
    const createTask = (name: string, priority: number, pause?: number)=>{
        return taskmanager.create({name, priority, time: 2,
            init: function() {
                const msg = `${this.name}-INIT`;
                runSequence.push(msg);
                return {i: 0, results: [msg]};
            },
            exec: function( data ) {
                const msg = `${this.name}-${data.i++}`;
                runSequence.push(msg);
                data.results.push(msg);
                if (data.i === pause) {
                    restartAsync(this);
                    return this.pause();
                }
                return data.i<10;
            },
            onDone: function(data) {
                const msg = `${this.name}-DONE`;
                runSequence.push(msg);
                data.results.push(msg);
                this.resolve(data.results);
            }
        });
    };
    const runTask1 = (priority: number = 1, name:string = 'T1', pause: number = 5) => {
        return new Promise<string[]>((resolve)=>{
            task1 = task1 || createTask( name, priority, pause);
            task1.resolve = resolve;
            task1.priority = priority;
            task1.start();
        });
    };

    const restartAsync = (task)=> {
        setTimeout(()=>{
            task.resume();
        }, 10);
    };


    it('basic pause&resume test', async ()=>{
        const result1 = await runTask1();
        expect(result1).to.be.deep.equal([
            'T1-INIT', 'T1-0', 'T1-1', 'T1-2', 'T1-3', 'T1-4', 'T1-5', 'T1-6', 'T1-7', 'T1-8', 'T1-9', 'T1-DONE'
        ]);
    });


    it('re-run task', async ()=> {
        const result1 = await runTask1();
        expect(result1).to.be.deep.equal([
            'T1-INIT', 'T1-0', 'T1-1', 'T1-2', 'T1-3', 'T1-4', 'T1-5', 'T1-6', 'T1-7', 'T1-8', 'T1-9', 'T1-DONE'
        ]);

        expect(runSequence).to.be.deep.equal([
            'T1-INIT', 'T1-0', 'T1-1', 'T1-2', 'T1-3', 'T1-4', 'T1-5', 'T1-6', 'T1-7', 'T1-8', 'T1-9', 'T1-DONE',
            'T1-INIT', 'T1-0', 'T1-1', 'T1-2', 'T1-3', 'T1-4', 'T1-5', 'T1-6', 'T1-7', 'T1-8', 'T1-9', 'T1-DONE'
        ]);
    });

    it('run 1 pause&resume tasks, 1 normal task', async ()=> {
        runSequence.length = 0;
        const [result1, result2] = await Promise.all([
            runTask1(),
            new Promise<string[]>((resolve)=>{
                const task = createTask('T2', 2);
                task.resolve = resolve;
                task.start();
            })
        ]);

        expect(result1).to.be.deep.equal([
            'T1-INIT', 'T1-0', 'T1-1', 'T1-2', 'T1-3', 'T1-4', 'T1-5', 'T1-6', 'T1-7', 'T1-8', 'T1-9', 'T1-DONE'
        ]);
        expect(result2).to.be.deep.equal([
            'T2-INIT', 'T2-0', 'T2-1', 'T2-2', 'T2-3', 'T2-4', 'T2-5', 'T2-6', 'T2-7', 'T2-8', 'T2-9', 'T2-DONE'
        ]);

        expect(runSequence).to.be.deep.equal([
            'T1-INIT', 'T1-0', 'T1-1', 'T1-2', 'T1-3', 'T1-4',
            'T2-INIT', 'T2-0', 'T2-1', 'T2-2', 'T2-3', 'T2-4', 'T2-5', 'T2-6', 'T2-7', 'T2-8', 'T2-9', 'T2-DONE',
            'T1-5', 'T1-6', 'T1-7', 'T1-8', 'T1-9', 'T1-DONE'
        ]);
    });


    it('run 2 pause&resume tasks', async ()=> {
        runSequence.length = 0;
        const [result1, result2] = await Promise.all([
            runTask1(),
            new Promise<string[]>((resolve)=>{
                const task = createTask('T2', 2, 1);
                task.resolve = resolve;
                task.start();
            })
        ]);

        expect(result1).to.be.deep.equal([
            'T1-INIT', 'T1-0', 'T1-1', 'T1-2', 'T1-3', 'T1-4', 'T1-5', 'T1-6', 'T1-7', 'T1-8', 'T1-9', 'T1-DONE'
        ]);
        expect(result2).to.be.deep.equal([
            'T2-INIT', 'T2-0', 'T2-1', 'T2-2', 'T2-3', 'T2-4', 'T2-5', 'T2-6', 'T2-7', 'T2-8', 'T2-9', 'T2-DONE'
        ]);
        expect(runSequence).to.be.deep.equal([
            'T1-INIT', 'T1-0', 'T1-1', 'T1-2', 'T1-3', 'T1-4',
            'T2-INIT', 'T2-0',
            'T1-5', 'T1-6', 'T1-7', 'T1-8', 'T1-9', 'T1-DONE',
            'T2-1', 'T2-2', 'T2-3', 'T2-4', 'T2-5', 'T2-6', 'T2-7', 'T2-8', 'T2-9', 'T2-DONE'
        ]);
    });
});
