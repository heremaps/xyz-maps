/*
 * Copyright (C) 2019-2026 HERE Europe B.V.
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

import {onTestFinished} from 'vitest';

/** Records values until stop() or test completion; construct inside a test or beforeEach. */
export class Observer {
    private results: { [key: string]: (string | number)[] };
    private cbs: { [key: string]: (ev: string, v: string | number) => void };
    private obj: any;

    constructor(obj: any, evts: string | string[]) {
        let that = this;
        evts = Array.isArray(evts) ? evts : [evts];

        that.results = {};
        that.cbs = {};
        that.obj = obj;

        onTestFinished(() => {
            this.stop();
        });

        evts.forEach(function(evt) {
            that.results[evt] = [];
            (function() {
                let e = evt;

                obj.addObserver(e, that.cbs[e] = function(ev, v) {
                    that.results[e].push(v);
                });
            })();
        });
    }

    stop(): { [key: string]: any[] } {
        for (let o in this.cbs) {
            this.obj.removeObserver(o, this.cbs[o]);
            delete this.cbs[o];
        }

        return this.results;
    }
}


type Events = any;

/**
 * Records events until stop() and automatically detaches when the current test finishes.
 * Requires an active test context; do not construct in beforeAll or at module scope.
 */
export class Listener {
    private results: { [key: string]: Events[] };
    private cbs: { [key: string]: (ev: Events) => void };
    private obj: any;

    constructor(obj: any, evts: string | string[]) {
        let that = this;
        evts = Array.isArray(evts) ? evts : [evts];

        that.results = {};
        that.cbs = {};
        that.obj = obj;

        onTestFinished(() => {
            this.stop();
        });

        evts.forEach(function(evt) {
            that.results[evt] = [];
            (function() {
                let e = evt;

                obj.addEventListener(e, that.cbs[e] = function(ev) {
                    that.results[e].push(ev);
                });
            })();
        });
    }

    /**
     * Detaches subscriptions and returns the recorded events.
     * Repeated calls return the same results without removing subscriptions again.
     */
    stop(): { [key: string]: Events[] } {
        for (let o in this.cbs) {
            this.obj.removeEventListener(o, this.cbs[o]);
            delete this.cbs[o];
        }

        return this.results;
    }
}
