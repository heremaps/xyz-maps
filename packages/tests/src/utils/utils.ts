/*
 * Copyright (C) 2019-2021 HERE Europe B.V.
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
import prepare from './prepareData';

declare global {
    interface XMLHttpRequest {
        origOpen: (method: string, url: string, async?: boolean, username?: string, password?: string)=>void,
        origSend: (payload: string)=>void,
        origAbort: ()=>void,
        origSetRequestHeader: (n: string, v: string)=>void
    }
}

export interface RequestSummary {
    readyState: number,
    status: number,
    responseURL: string,
    openURL: string
}

export {prepare};

function backingScale() {
    if ('devicePixelRatio' in window) {
        if (window.devicePixelRatio > 1) {
            return window.devicePixelRatio;
        }
    }
    return 1;
}


export async function getCanvasPixelColor(
    elem: HTMLElement,
    pos: {x: number, y: number}|{x: number, y: number}[],
    options:{expect?: string|string[], delay?:number, retry?:number, retryDelay?:number} = {}): Promise<string|string[]> {
    const positions = Array.isArray(pos) ? pos : [pos];
    const expect = options.expect ? (Array.isArray(options.expect) ? options.expect : [options.expect] ) : new Array(positions.length);
    const delay = options.delay || 100;
    const retryDelay = options.retryDelay || 10;
    let retry = options.retry || 0;
    const scaleFactor = backingScale();
    let canvas = elem.getElementsByTagName('canvas')[0];
    let ctx = canvas.getContext('2d');
    let resultColors = [];
    let retryCounter = 0;
    let expectedCounter = 0;

    function getColor(x, y) {
        let pixel;

        if (ctx) {
            pixel = ctx.getImageData(x, y, 1, 1).data;
        } else {
            const gl = canvas.getContext('webgl');
            pixel = new Uint8Array(4);
            gl.readPixels(x * scaleFactor, canvas.height - y * scaleFactor, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
        }

        let r = pixel[0];
        let g = pixel[1];
        let b = pixel[2];

        return '#' + ('00000' + ((r << 16) | (g << 8) | b).toString(16)).slice(-6);
    }

    function tryGetColor(timeout, cb) {
        setTimeout(function() {
            positions.forEach((v, i)=>{
                if (!resultColors[i] || (resultColors[i] != expect[i] && expect[i])) {
                    let color = getColor(v.x, v.y);
                    resultColors[i] = color;
                    if (!expect[i] || expect[i] == color) {
                        expectedCounter++;
                    }
                }
            });

            if (retryCounter++ < retry && expectedCounter < expect.length) {
                tryGetColor(retryDelay, cb);
            } else {
                cb(Array.isArray(pos) ? resultColors : resultColors[0]);
            }
        }, timeout);
    }

    return new Promise((resolve) => tryGetColor(delay, resolve));
}

export class Observer {
    private results: {[key:string]: (string|number)[]};
    private cbs: {[key:string]: (ev:string, v:string|number)=>void};
    private obj: any;

    constructor(obj: any, evts: string|string[]) {
        let that = this;
        evts = Array.isArray(evts) ? evts : [evts];

        that.results = {};
        that.cbs = {};
        that.obj = obj;

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

    stop(): {[key:string]: any[]} {
        for (let o in this.cbs) {
            this.obj.removeObserver(o, this.cbs[o]);
        }

        return this.results;
    }
}

export class Listener {
    private results: {[key:string]: MouseEvent[] };
    private cbs: {[key:string]: (ev:MouseEvent)=>void};
    private obj: any;

    constructor(obj: any, evts: string|string[]) {
        let that = this;
        evts = Array.isArray(evts) ? evts : [evts];

        that.results = {};
        that.cbs = {};
        that.obj = obj;

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

    stop(): {[key:string]: MouseEvent[]} {
        for (let o in this.cbs) {
            this.obj.removeEventListener(o, this.cbs[o]);
        }

        return this.results;
    }
}

type MonitoredXHRRequest = any;
type MonitorStartOpt = {
    method?: string,
    onReady?: (req: RequestSummary)=>void
};

export class MonitorXHR {
    public requestCount: number;
    public readyRequests: RequestSummary[];
    public stopMonitor: number;

    private requests = new Map<XMLHttpRequest, MonitoredXHRRequest>();

    private filter: RegExp;
    /**
     * @param filter {RegExp=} filter for requests
     */
    constructor(filter?: RegExp) {
        this.filter = filter;
    }

    /**
     * @param options
     * @param options.method {String} monitor requests with this method.
     * @param options.onReady {Function} callback function when request is done.
     */
    start(options: MonitorStartOpt = {}) {
        let monitor = this;
        let filter = monitor.filter;
        let readyCb = options.onReady;
        let monitoredMethod = options.method ? String(options.method).toUpperCase() : 'ALL';

        monitor.readyRequests = [];
        monitor.requestCount = 0;
        monitor.stopMonitor = 0;

        XMLHttpRequest = (<any>window).XMLHttpRequest;
        if (!XMLHttpRequest.prototype.origOpen) {
            XMLHttpRequest.prototype.origOpen = XMLHttpRequest.prototype.open;
            XMLHttpRequest.prototype.origSend = XMLHttpRequest.prototype.send;
            XMLHttpRequest.prototype.origAbort = XMLHttpRequest.prototype.abort;
            XMLHttpRequest.prototype.origSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;
        } else {
            monitor.requests.forEach((req)=>req.origXHR.onreadystatechange = null);
            monitor.requests.clear();
        }

        XMLHttpRequest.prototype.abort = function(): void {
            this.origAbort();
        };

        XMLHttpRequest.prototype.open = function(method: string, url: string, async?: boolean, username?: string, password?: string): void {
            this.openUrl = url;

            if ((monitoredMethod == 'ALL' || monitoredMethod == method) && (!filter || filter.test(url))) {
                monitor.requests.set(this, {method: method, url: url, payload: null, origXHR: this, requestHeader: {}});
            }
            this.origOpen(method, url, async);
        };

        XMLHttpRequest.prototype.send = function(payload: string): void {
            clearTimeout(monitor.stopMonitor);
            let mReq = monitor.requests.get(this);

            if (mReq && (!filter || filter.test(mReq.url))) {
                monitor.requestCount++;
                mReq.payload = JSON.parse(payload);
                monitor.requests.set(this, mReq);
            }

            var realonreadystatechange = this.onreadystatechange;
            this.onreadystatechange = function() {
                if (this.readyState == 4) {
                    let req: RequestSummary = {
                        readyState: this.readyState,
                        status: this.status,
                        responseURL: this.responseURL,
                        openURL: this.openUrl
                    };

                    if (mReq && (!filter || filter.test(mReq.url))) {
                        monitor.readyRequests.push(req);
                    }
                    readyCb && readyCb(req);
                }
                realonreadystatechange && realonreadystatechange.apply(this, arguments);
            };
            this.origSend(payload);
        };

        XMLHttpRequest.prototype.setRequestHeader = function(n: string, v: string): void {
            let m = monitor.requests.get(this);
            if (m) {
                m.requestHeader[n] = v;
                monitor.requests.set(this, m);
            }
            this.origSetRequestHeader(n, v);
        };
    }

    stop(): object {
        if (XMLHttpRequest.prototype.origOpen) {
            XMLHttpRequest.prototype.open = XMLHttpRequest.prototype.origOpen;
            XMLHttpRequest.prototype.send = XMLHttpRequest.prototype.origSend;
            XMLHttpRequest.prototype.abort = XMLHttpRequest.prototype.origAbort;
            XMLHttpRequest.prototype.setRequestHeader = XMLHttpRequest.prototype.origSetRequestHeader;

            XMLHttpRequest.prototype.origOpen = null;
            XMLHttpRequest.prototype.origSend = null;
            XMLHttpRequest.prototype.origAbort = null;
            XMLHttpRequest.prototype.origSetRequestHeader = null;
        }

        let reqs = [];
        this.requests.forEach((req)=>reqs.push(req));
        this.requests.clear();

        return reqs;
    }
}
