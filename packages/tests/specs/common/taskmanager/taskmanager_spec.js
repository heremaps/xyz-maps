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

describe('task manager', function() {
    const expect = chai.expect;

    let taskmanager = mapsCommon.TaskManager.getInstance( 5 );

    it('task manager is created and running', async function() {
        let results1 = [];
        let results2 = [];
        let results3 = [];
        let current = 0;

        await new Promise((resolve)=>{
            let task = taskmanager.create({
                name: 'task',

                priority: 1,

                init: function() {
                    results1.push(current++);
                    results1.push('INIT');
                    return [1, 2];
                },

                time: 2,

                exec: function( data ) {
                    results1.push(current++);
                    results2.push(data[0]++);
                    results3.push(data[1]);

                    return data[0]<=10;
                },

                onDone: function() {
                    results1.push('DONE');
                    results1.push(current++);

                    resolve();
                }
            });

            task.start();
        });


        expect(results1).to.be.deep.equal([0, 'INIT', 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 'DONE', 11]);
        expect(results2).to.be.deep.equal([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
        expect(results3).to.be.deep.equal([2, 2, 2, 2, 2, 2, 2, 2, 2, 2]);
        expect(taskmanager).to.be.an('object');
    });
});
