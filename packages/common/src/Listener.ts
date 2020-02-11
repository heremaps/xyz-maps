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

let UNDEF;

const indexOf = (listeners, cb, context) => {
    let index = -1;

    for (let i = 0; i < listeners.length; i++) {
        if (listeners[i][0] == cb && listeners[i][1] == context) {
            index = i;
            break;
        }
    }
    return index;
};

type Callback = (...args) => void;
type Context = any;

class Listener {
    private _l: { [key: string]: [Callback, Context][] } = {};
    private _sync = false;
    private _exec = {};

    constructor(events: string[]) {
        for (let i = 0; i < events.length; i++) {
            this.addEvent(events[i]);
        }
    }

    addEvent(event: string) {
        if (!this._l[event]) {
            this._l[event] = [];
            this._exec[event] = UNDEF;
        }
    };

    sync(sync: boolean) {
        this._sync = !!sync;
        return this;
    };

    removeEvent(event: string) {
        delete this._l[event];
    };

    getEvents(): string[] {
        const events = [];

        for (const ev in this._l) {
            events[events.length] = ev;
        }

        return events;
    };

    get(key: string): [Callback, Context][] {
        let cbs = this._l[key];
        return cbs && cbs.slice();
    }

    isDefined(key: string) {
        return !!this._l[key];
    };

    isListened(key: string) {
        return this._l[key] && this._l[key].length;
    };

    add(key: string, callback: Callback, context?) {
        let added = false;
        let index;

        if (this._l.hasOwnProperty(key)) {
            index = indexOf(this._l[key], callback, context);

            if (index == -1) {
                this._l[key].push([callback, context]);

                added = true;
            }
        }
        // console.log('ADDLISTENER?', key, added);

        return added;
    };

    remove(key: string, callback: Callback, context?) {
        if (this._l.hasOwnProperty(key)) {
            const index = indexOf(this._l[key], callback, context);

            if (index != -1) {
                // make sure if removals of currently executed listeners are handled correctly
                this._exec[key]--;

                this._l[key].splice(index, 1);

                return true;
            }
        }
        return false;
    };


    trigger(key: string, args: any[], sync?: boolean, check?: (cb: any) => boolean) {
        let triggered = false;
        let listener;

        if (this._l[key]) {
            const length = this._l[key].length;


            for (this._exec[key] = 0;
                this._exec[key] < length;
                this._exec[key]++
            ) {
                triggered = true;

                if (
                    listener = this._l[key][this._exec[key]]
                ) {
                    if (check && !check(listener)) {
                        continue;
                    }

                    if (sync || this._sync) {
                        // exec(listener,args);
                        listener[0].apply(listener[1], args);
                    } else {
                        // args.push((function getStackTrace() {
                        //    var obj = {};
                        //    Error.captureStackTrace(obj, getStackTrace);
                        //    return obj.stack;
                        // })());
                        // setTimeout(function(){listener[0].apply(listener[1],args)},0);

                        (((cb, scp, args) => {
                            setTimeout(() => {
                                cb.apply(scp, args);
                            }, 0);
                        }))(
                            listener[0],
                            listener[1],
                            args
                        );
                    }
                }
            }

            this._exec[key] = UNDEF;
        }

        return triggered;

        // var exec = sync ?
        //    function(listener,args){
        //        listener[0].apply(listener[1],args)
        //    } :
        //    function(listener,args){
        //
        //    };


        // this._l[key].forEach(function(listener){
        //    if( sync )
        //        exec(listener,args);
        //    else
        //        setTimeout(function(){exec(listener,args)},0);
        // });
    };
}

export default Listener;
