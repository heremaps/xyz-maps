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

export namespace testUtils {
    export function dump(...args: string[]|number[]|object[]): void{
        var console = window.console;

        // workaround for IE9, in which console.log is not an instance of Function
        if (Function.prototype.bind && typeof console.log == 'object') {
            var log = Function.prototype.bind.call(console.log, console);
            log.apply(console, args);
        } else {
            console.log.apply(console, args);
        }
    };

    function backingScale() {
        if ('devicePixelRatio' in window) {
            if (window.devicePixelRatio > 1) {
                return window.devicePixelRatio;
            }
        }
        return 1;
    }

    export function getCanvasPixelColor(elem: HTMLElement, x: number, y: number): string {
        const scaleFactor = backingScale();
        let canvas = elem.getElementsByTagName('canvas')[0];
        let ctx = canvas.getContext('2d');
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
    };

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
    };

    export class Listener {
        private results: {[key:string]: MouseEvent[]};
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
    };

    export namespace events {
        export function dblclick(elem: HTMLElement, x: number, y: number): Promise<MouseEvent> {
            return new Promise((resolve, reject)=>{
                let e = getElement(elem, x, y);

                function callback(evt: MouseEvent): void {
                    resolve(evt);
                    elem.removeEventListener('dblclick', callback);
                }
                elem.addEventListener('dblclick', callback);

                dispatchEvent(e.element, e.topleft, x, y, 'mousedown');
                dispatchEvent(e.element, e.topleft, x, y, 'mouseup');
                dispatchEvent(e.element, e.topleft, x, y, 'click');

                dispatchEvent(e.element, e.topleft, x, y, 'mousedown');
                dispatchEvent(e.element, e.topleft, x, y, 'mouseup');
                dispatchEvent(e.element, e.topleft, x, y, 'click');

                dispatchEvent(e.element, e.topleft, x, y, 'dblclick');
            });
        };

        export function click(elem: HTMLElement, x: number, y: number): Promise<MouseEvent> {
            return new Promise((resolve, reject)=>{
                let e = getElement(elem, x, y);
                function callback(evt: MouseEvent): void {
                    resolve(evt);
                    elem.removeEventListener('click', callback);
                }
                elem.addEventListener('click', callback);

                dispatchEvent(e.element, e.topleft, x, y, 'mousedown');
                dispatchEvent(e.element, e.topleft, x, y, 'mouseup');
                dispatchEvent(e.element, e.topleft, x, y, 'click');
            });
        };

        export function drag(elem: HTMLElement, from: {x: number; y: number}, to: {x: number; y: number}, opts: {fps?: number;}={fps: 40}): Promise<MouseEvent> {
            return new Promise((resolve) => {
                let e = getElement(elem, from.x, from.y);

                function callback(evt: MouseEvent): void {
                    resolve(evt);
                    elem.removeEventListener('mouseup', callback);
                }
                elem.addEventListener('mouseup', callback);

                dispatchEvent(e.element, e.topleft, from.x, from.y, 'mousedown' );

                let v = Math.max(1, Math.floor(Math.max(Math.abs(to.x - from.x)/10, Math.abs(to.y-from.y)/10)));
                let vx = (to.x - from.x)/v;
                let vy = (to.y - from.y)/v;

                let i = 0;
                let t = Math.round(1000/opts.fps);

                let si = setInterval(function() {
                    if (i++ == v-1) {
                        dispatchEvent(e.element, e.topleft, to.x, to.y, 'mousemove' );
                        setTimeout(function() {
                            dispatchEvent(e.element, e.topleft, to.x, to.y, 'mouseup' );
                        }, 1);

                        clearInterval(si);
                    }
                    dispatchEvent(e.element, e.topleft, Math.floor(from.x+vx*i), Math.floor(from.y+vy*i), 'mousemove' );
                }, t);
            });
        };

        export function mousemove(elem: HTMLElement, from: {x: number, y: number}, to: {x: number, y: number}): Promise<MouseEvent> {
            return new Promise((resolve) =>{
                let e = getElement(elem, from.x, from.y);
                let v = Math.max(Math.abs(to.x - from.x)/2, Math.abs(to.y-from.y)/2);
                let vx = (to.x - from.x)/v;
                let vy = (to.y - from.y)/v;
                let evtNr = 0;

                function callback(evt: MouseEvent): void {
                    if (++evtNr == Math.floor(v)+1) {
                        setTimeout(function() {
                            resolve(evt);
                        }, 50);
                        elem.removeEventListener('mousemove', callback);
                    }
                }
                elem.addEventListener('mousemove', callback);

                for (let i = 0; i<v; i++) {
                    dispatchEvent(e.element, e.topleft, from.x+ Math.floor(vx*i), from.y+Math.floor(vy*i), 'mousemove' );
                }
                dispatchEvent(e.element, e.topleft, to.x, to.y, 'mousemove' );
            });
        };

        export function mousewheel(elem: HTMLElement, x: number, y: number, d: number): Promise<MouseEvent> {
            const event = 'wheel';
            const direction = -1;

            return new Promise((resolve) => {
                let e = getElement(elem, x, y);
                function callback(evt: MouseEvent): void {
                    setTimeout(function() {
                        resolve(evt);
                    }, 20);
                    elem.removeEventListener(event, callback);
                }
                elem.addEventListener(event, callback);

                dispatchEvent(e.element, e.topleft, x, y, event, d * direction); // Gecko
            });
        };

        export function triggerEvent(elem: HTMLElement, x: number, y: number, evt: string, d: number): void {
            let e = getElement(elem, x, y);
            dispatchEvent(e.element, e.topleft, x, y, evt, d);
        };
    };

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
    };
};

function getElement(elem: HTMLElement, x: number, y: number): {element: Element; topleft: {left: number; top: number}} {
    function getPosition(div) {
        var T= 0;
        var L= 0;

        while (div) {
            L+= div.offsetLeft;
            T+= div.offsetTop;
            div= div.offsetParent;
        }
        return {left: L, top: T};
    }

    const tl: {left: number, top: number} = getPosition(elem);

    return {
        element: document.elementFromPoint(x + tl.top, y + tl.left),
        topleft: tl
    };
}

function dispatchEvent(elem: Element, tl: {top: number; left: number}, x: number, y: number, evt: string, d?: number) {
    let ev: any = new MouseEvent(evt, {
        altKey: true,
        bubbles: true,
        cancelable: true,
        clientX: x + tl.top,
        clientY: y + tl.left
    });

    if (d) {
        ev.deltaX = 0;
        ev.deltaY = 100 * d;
        ev.deltaZ = 0;

        ev.wheelDelta = 120 * d;
        ev.wheelDeltaX = 0;
        ev.wheelDeltaY = 120 * d;
    }

    elem.dispatchEvent(ev);
}

