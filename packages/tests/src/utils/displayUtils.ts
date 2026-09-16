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

import {TileLayer} from '@here/xyz-maps-core';
import Map from '@here/xyz-maps-display';


type VpReadyCallback = Function | (() => void);
const VIEWPORT_READY_TIMEOUT = 10000;


export function waitForViewportReady(
    display: Map,
    mapLayers: TileLayer[],
    fn?: VpReadyCallback,
    timeoutMs?: number,
    label?: string
): Promise<Map>;
export function waitForViewportReady(
    display: Map,
    fn?: VpReadyCallback,
    timeoutMs?: number,
    label?: string
): Promise<Map>;
export function waitForViewportReady(
    display: Map,
    mapLayers?: TileLayer[] | VpReadyCallback,
    fnOrTimeout?: VpReadyCallback | number,
    timeoutOrLabel: number | string = VIEWPORT_READY_TIMEOUT,
    label: string = 'viewport'
): Promise<Map> {
    return new Promise((resolve, reject) => {
        let layers: TileLayer[];
        let fn: VpReadyCallback;
        let timeoutMs: number;

        if (typeof mapLayers == 'function') {
            layers = display.getLayers();
            fn = mapLayers;
            if (typeof fnOrTimeout == 'number') {
                timeoutMs = fnOrTimeout;
                if (typeof timeoutOrLabel == 'string') {
                    label = timeoutOrLabel;
                }
            } else {
                timeoutMs = typeof timeoutOrLabel == 'number' ? timeoutOrLabel : VIEWPORT_READY_TIMEOUT;
            }
        } else {
            layers = mapLayers || display.getLayers();
            fn = typeof fnOrTimeout == 'function' ? fnOrTimeout : undefined;
            timeoutMs = typeof timeoutOrLabel == 'number' ? timeoutOrLabel : VIEWPORT_READY_TIMEOUT;
        }

        if (!layers) {
            layers = display.getLayers();
        }

        const layerAlwaysReady = !layers.length;
        let mapviewchangeend = false;
        let mapviewready = layerAlwaysReady;
        let callbackComplete = !fn;
        let readyLayers = {};
        let readyTimer;
        let timeoutTimer;
        let settled = false;

        let layerCb;
        let mapviewchangestartcb;
        let mapviewchangeendcb;

        const cleanup = () => {
            clearTimeout(readyTimer);
            clearTimeout(timeoutTimer);
            display.removeEventListener('mapviewchangestart', mapviewchangestartcb);
            display.removeEventListener('mapviewchangeend', mapviewchangeendcb);
            layers.forEach((layer) => layer.removeEventListener('viewportReady', layerCb));
        };

        const fail = (error) => {
            if (settled) return;
            settled = true;
            cleanup();
            reject(error instanceof Error ? error : new Error(String(error)));
        };

        const checkReady = () => {
            if (!settled && callbackComplete && mapviewchangeend && mapviewready) {
                settled = true;
                cleanup();
                resolve(display);
            }
        };

        layerCb = (evt) => {
            const layer = evt.detail.layer;
            readyLayers[layer.id] = layer;
            mapviewready = Object.keys(readyLayers).every((id) => !!readyLayers[id]);
            checkReady();
        };

        mapviewchangestartcb = () => {
            mapviewready = layerAlwaysReady;
            mapviewchangeend = false;
            clearTimeout(readyTimer);
        };

        mapviewchangeendcb = () => {
            // Wait briefly for a following mapviewchange event during an active gesture.
            readyTimer = setTimeout(() => {
                mapviewchangeend = true;
                checkReady();
            }, 10);
        };

        display.addEventListener('mapviewchangestart', mapviewchangestartcb);
        display.addEventListener('mapviewchangeend', mapviewchangeendcb);

        layers.forEach((layer) => {
            readyLayers[layer.id] = false;
            layer.addEventListener('viewportReady', layerCb);
        });

        timeoutTimer = setTimeout(() => {
            const pendingLayers = layers
                .filter((layer) => !readyLayers[layer.id])
                .map((layer) => layer.id)
                .join(', ') || 'none';
            fail(new Error(
                `waitForViewportReady timed out for "${label}" after ${timeoutMs} ms ` +
                `(mapviewchangeend: ${mapviewchangeend}, callbackComplete: ${callbackComplete}, ` +
                `pending layers: ${pendingLayers})`
            ));
        }, timeoutMs);

        if (fn) {
            try {
                Promise.resolve(fn()).then(() => {
                    callbackComplete = true;
                    checkReady();
                }, fail);
            } catch (error) {
                fail(error);
            }
        }
    });
}
