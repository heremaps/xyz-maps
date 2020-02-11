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

import {build} from '@here/xyz-maps-core';
import SpacePool from './helpers/spacePool';
// @ts-ignore
import cleanupServer from 'cleanupServer';

declare global {
    interface Window {
        Mocha: any;
        __karma__: any;
    }
}


let clean: (object) => object = (test) => {
    return {
        title: test.title,
        fullTitle: test.fullTitle(),
        duration: test.duration,
        currentRetry: test.currentRetry(),
        err: test.err && test.err.stack
    };
};

let sendMessage = (type, msg) => {
    window.__karma__[type](msg);
};
var formatError = function(error) {
    var stack = error.stack;
    var message = error.message;

    if (stack) {
        if (message) {
            stack = message + '\n' + stack;
        }

        // remove mocha stack entries
        return stack.replace(/\n.+\/mocha\/mocha\.js\?\w*:[\d:]+\)?(?=(\n|$))/g, '');
    }

    return message;
};

var processAssertionError = function(error_) {
    var error;

    if (window.Mocha && error_.hasOwnProperty('showDiff')) {
        error = {
            name: error_.name,
            message: error_.message,
            showDiff: error_.showDiff
        };

        if (error.showDiff) {
            error.actual = window.Mocha.utils.stringify(error_.actual);
            error.expected = window.Mocha.utils.stringify(error_.expected);
        }
    }

    return error;
};

let stopEventPropagation: (MouseEvents) => void = (e) => {
    if (!e.altKey) e.stopPropagation();
};

export let spacePool: SpacePool;

export function run(component: string, apiBuild: {version: string; }): void {
    apiBuild = apiBuild || build;

    let startTime;
    let errors = new WeakMap<Mocha.Test, Mocha.Test[]>();
    let assertionErrors = new WeakMap<Mocha.Test, Mocha.Test[]>();

    try {
        window.addEventListener('beforeunload', function(e) {
            // sendMessage('info', {dump: 'clear'});
            navigator.sendBeacon('http://localhost:' + cleanupServer.port, spacePool.getSpaces().join(','));
            spacePool.clear(()=>{});
        });

        let runner = mocha.run();

        runner.on('suite', function(suite) {
            sendMessage('info', {dump: component + '('+ apiBuild.version + '): ' + suite.title});
        })
            .on('start', function() {
                sendMessage('info', {total: runner.total});
            })

            .on('end', function() {
                spacePool.clear(()=>{
                    document.removeEventListener('mousedown', stopEventPropagation, true);
                    document.removeEventListener('mouseup', stopEventPropagation, true);
                    document.removeEventListener('mousemove', stopEventPropagation, true);
                    document.removeEventListener('click', stopEventPropagation, true);
                    document.removeEventListener('dblClick', stopEventPropagation, true);

                    sendMessage('complete', {});
                });
            })

            .on('test', function(test) {
                startTime = Date.now();
                errors.set(test, []);
                assertionErrors.set(test, []);
            })

            .on('pending', function(test) {
                test.pending = true;
            })

            .on('fail', function(test, error) {
                var simpleError = formatError(error);
                var assertionError = processAssertionError(error);

                errors.get(test).push(simpleError);
                if (assertionError) assertionErrors.get(test).push(assertionError);
            })

            .on('test end', function(test) {
                var skipped = test.pending === true;

                var result = {
                    id: '',
                    description: test.title,
                    suite: [],
                    success: test.state === 'passed',
                    skipped: skipped,
                    time: (skipped || test.state === 'failed') ? 0 : test.duration,
                    log: errors.get(test),
                    assertionErrors: assertionErrors.get(test),
                    endTime: Date.now()
                };

                sendMessage('result', result);
            });

        before(() => {
            spacePool = new SpacePool();

            // print tested api version
            sendMessage('info', {'total': runner.total});

            // prevent mouse events without alt key pressed for tests
            // tests simulate alt pressed events to make tests react only on simulated(alt key pressed) mouse events
            document.addEventListener('mousedown', stopEventPropagation, true);
            document.addEventListener('mouseup', stopEventPropagation, true);
            document.addEventListener('mousemove', stopEventPropagation, true);
            document.addEventListener('click', stopEventPropagation, true);
            document.addEventListener('dblClick', stopEventPropagation, true);
        });
    } catch (e) {
        throw e;
    }

    var apiVersion: HTMLDivElement = document.querySelector('#apiversion');
    if (apiVersion) apiVersion.innerHTML = 'API Version: ' + apiBuild.version;
}
