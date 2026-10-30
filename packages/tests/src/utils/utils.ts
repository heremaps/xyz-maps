/*
 * Copyright (C) 2019-2022 HERE Europe B.V.
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
import prepare, {TestData} from './prepareData';
import {expect, onTestFinished} from 'vitest';

declare global {
    interface XMLHttpRequest {
        origOpen: (method: string, url: string, async?: boolean, username?: string, password?: string) => void,
        origSend: (payload: string) => void,
        origAbort: () => void,
        origSetRequestHeader: (n: string, v: string) => void
    }
}

export interface RequestSummary {
    readyState: number,
    status: number,
    responseURL: string,
    openURL: string
}

export {prepare, TestData};

type PointerEventType = 'pointerenter' | 'pointerleave' | 'pointermove';

interface PointerEventTarget {
    addEventListener(type: PointerEventType, listener: () => void): unknown;
    removeEventListener(type: PointerEventType, listener: () => void): unknown;
}

/**
 * Waits for deferred Map or Editor hover detection, which mousemove()'s fixed delay does not guarantee.
 * Registers before the action and waits for both the action and the pointer event.
 * Viewport/editor readiness helpers do not guarantee completion of hover detection.
 */
export async function waitForPointerEvent(
    target: PointerEventTarget,
    type: PointerEventType,
    action: () => unknown
): Promise<void> {
    let timer: ReturnType<typeof setTimeout>;
    const timeoutError = new Error(`Timed out waiting for ${type}`);
    let onEvent: () => void;
    const event = new Promise<void>((resolve, reject) => {
        onEvent = resolve;
        target.addEventListener(type, onEvent);
        timer = setTimeout(() => reject(timeoutError), 2000);
    });
    try {
        await Promise.all([event, Promise.resolve().then(action)]);
    } finally {
        clearTimeout(timer);
        target.removeEventListener(type, onEvent);
    }
}

function backingScale() {
    if ('devicePixelRatio' in window) {
        if (window.devicePixelRatio > 1) {
            return window.devicePixelRatio;
        }
    }
    return 1;
}


type CanvasPixelPosition = {x: number, y: number};

interface CanvasPixelColorOptions {
    expect?: string | string[] | ((colors: string[]) => boolean);
    delay?: number;
    retry?: number;
    retryDelay?: number;
}

/**
 * Reads canvas pixels, optionally polling for an expected rendered result.
 * `expect` accepts a color for all positions, one color per position, or a predicate on the complete sample.
 * Every attempt reads all pixels afresh. Without `expect`, only one sample is taken.
 * Defaults: 100 ms initial delay, then up to 38 retries at 50 ms intervals when `expect` is supplied
 * (about two seconds, subject to scheduling). Explicit delay/retry options override these defaults.
 * Returns the last sample even if it does not match, so the caller's assertions report the actual colors.
 * Do not wrap calls in another polling loop.
 */
export async function getCanvasPixelColor(
    elem: HTMLElement,
    pos: CanvasPixelPosition | CanvasPixelPosition[],
    options: CanvasPixelColorOptions = {}): Promise<string | string[]> {
    const positions = Array.isArray(pos) ? pos : [pos];
    if (positions.length === 0) {
        throw new Error('Expected at least one pixel position');
    }
    const expected = options.expect;
    if (Array.isArray(expected) && expected.length !== positions.length) {
        throw new Error('Expected one color per pixel position');
    }
    const delay = options.delay ?? 100;
    const retryDelay = options.retryDelay ?? 50;
    const retry = options.retry ?? (expected === undefined ? 0 : 38);
    const scaleFactor = backingScale();
    const canvas = elem.getElementsByTagName('canvas')[0];
    if (!canvas) {
        throw new Error('Cannot read pixel colors: container has no canvas');
    }
    const context = canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('2d');
    if (!context) {
        throw new Error('Cannot read pixel colors: no WebGL or Canvas2D context is available');
    }

    const getColor = (x: number, y: number) => {
        let pixel;
        if (context instanceof CanvasRenderingContext2D) {
            pixel = context.getImageData(x, y, 1, 1).data;
        } else {
            const gl = context;
            pixel = new Uint8Array(4);
            gl.readPixels(x * scaleFactor, canvas.height - y * scaleFactor, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
        }
        return '#' + ('00000' + ((pixel[0] << 16) | (pixel[1] << 8) | pixel[2]).toString(16)).slice(-6);
    };

    for (let attempt = 0; ; attempt++) {
        await new Promise<void>((resolve) => setTimeout(resolve, attempt === 0 ? delay : retryDelay));
        // Compare a complete fresh sample, never colors retained from different frames.
        const colors = positions.map(({x, y}) => getColor(x, y));
        const matches = typeof expected === 'function'
            ? expected(colors)
            : expected === undefined || colors.every((color, i) => color === (Array.isArray(expected) ? expected[i] : expected));
        if (matches || attempt >= retry) {
            return Array.isArray(pos) ? colors : colors[0];
        }
    }
}

/**
 * Waits for matching colors using the sampling helper's existing delay/retry budget.
 * Reports the complete last sample and pixel positions on failure, without an outer polling loop.
 */
export async function expectCanvasPixelColor(
    elem: HTMLElement,
    pos: CanvasPixelPosition | CanvasPixelPosition[],
    expected: string | string[],
    options: Omit<CanvasPixelColorOptions, 'expect'> = {}
): Promise<void> {
    const positions = Array.isArray(pos) ? pos : [pos];
    const colors = await getCanvasPixelColor(elem, pos, {...options, expect: expected});
    const actual = Array.isArray(colors) ? colors : [colors];
    const wanted = Array.isArray(expected) ? expected : positions.map(() => expected);
    const coordinates = positions.map(({x, y}) => `(${x}, ${y})`).join(', ');
    expect(actual, `Canvas pixels at ${coordinates}`).toStrictEqual(wanted);
}

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

type MonitoredXHRRequest = any;
type MonitorStartOpt = {
    method?: string,
    onReady?: (req: RequestSummary) => void
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
            monitor.requests.forEach((req) => req.origXHR.onreadystatechange = null);
            monitor.requests.clear();
        }

        XMLHttpRequest.prototype.abort = function(): void {
            this.origAbort();
        };

        XMLHttpRequest.prototype.open = function(method: string, url: string, async?: boolean, username?: string, password?: string): void {
            this.openUrl = url;

            if ((monitoredMethod == 'ALL' || monitoredMethod == method) && (!filter || filter.test(url))) {
                monitor.requests.set(this, {
                    method: method,
                    url: url,
                    payload: null,
                    origXHR: this,
                    requestHeader: {}
                });
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
        this.requests.forEach((req) => reqs.push(req));
        this.requests.clear();

        return reqs;
    }
}
