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

import {FeatureProvider, TileLayer, GeoJSONProvider} from '@here/xyz-maps-core';
import {MonitorXHR, RequestSummary} from './utils';

export function getTileOnProvider(opts: {
    timeout?: number;
    onFinish?: (req: RequestSummary[], cb: {tile: object}[])=>void;
    quadkeys: string[];
    sameCallback?: boolean;
    provider?: FeatureProvider;
    layer?: TileLayer;
    cancel?: {quadkeys?: number[]; withCallback?: boolean; timeout?:number;};
}): {tile: object}[] {
    var timeout = opts.timeout || 20; // wait for 20 ms for possible coming requests
    var requestMonitoredCount = 0;
    var callbacks = {};

    // excludes requests for metadata
    var requestFilter = /^((?!metadata).)*$/;

    let monitor: MonitorXHR = new MonitorXHR(requestFilter);
    monitor.start({
        onReady: function(req) {
            if (++requestMonitoredCount == monitor.requestCount) {
                monitor.stopMonitor = setTimeout(()=>{
                    monitor.stop();
                    opts.onFinish?.(monitor.readyRequests, callbackResults);
                }, timeout);
            }
        }
    });
    var qks = opts.quadkeys;
    var sameCallback = opts.sameCallback;
    var requester = opts.provider || opts.layer;

    var cancel = opts.cancel || {};
    var cQks = cancel.quadkeys || [];
    var cWithCB = cancel.withCallback;
    var cTimeout = cancel.timeout || 5;

    var callbackResults = [];

    // common callback
    var cb = !sameCallback ? null : (t: object) => {
        callbackResults.push({tile: t});
    };


    qks.forEach((qk, i)=>{
        var callback = sameCallback ? cb : (t: object) =>{
            callbackResults.push({tile: t});
        };
        requester.getTile(qk.toString(), callback);

        callbacks[qk+'i'+i] = callback;
    });

    // console.time("getTileOnProvider");

    if (opts.cancel) {
        // setTimeout(()=>
        // {
        // console.timeEnd("getTileOnProvider");
        qks.forEach((qk: string, i: number)=>{
            if (cQks[i]) {
                var callback = cWithCB ? callbacks[qk+'i'+i] : undefined;

                if (requester instanceof TileLayer) {
                    // @ts-ignore (private interface)
                    requester.cancelTile(qk, callback);
                } else if (requester instanceof GeoJSONProvider) {
                    // @ts-ignore (private interface)
                    requester.cancel(qk.toString(), callback);
                }

                delete callbacks[qk+'i'+i];
            }
        });
        // }, cTimeout)
    }

    // stop monitoring if no request is sent within 20ms
    setTimeout(()=>{
        if (monitor.requestCount == 0) {
            monitor.stop();
            opts.onFinish?.(monitor.readyRequests, callbackResults);
        }
    }, timeout);

    return callbackResults;
}

export function getTileOnLayer(opts: {
    timeout?: number;
    onFinish?: (req: RequestSummary[], cb: {tile: object}[])=>void;
    quadkeys: string[];
    sameCallback?: boolean;
    layer: TileLayer;
    cancel?: {quadkeys?: number[]; withCallback?: boolean; timeout?:number;};
}): {tile: object}[] {
    return getTileOnProvider(opts);
}

