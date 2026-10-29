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


type VpReadyCallback = () => unknown;

/**
 * Waits for the action to complete, a settled mapview end and viewport readiness of the selected layers.
 * Listeners are registered before the action. Missing signals are reported after ten seconds.
 */
export function waitForViewportReady(display: Map, mapLayers?: TileLayer[] | VpReadyCallback, fn?: VpReadyCallback): Promise<Map> {
    const action = typeof mapLayers === 'function' ? mapLayers : fn;
    const selectedLayers = Array.isArray(mapLayers) ? mapLayers : display.getLayers();
    const layers = selectedLayers.filter((layer, index) => selectedLayers.findIndex((other) => other.id === layer.id) === index);

    return new Promise((resolve, reject) => {
        const pendingLayers = new Set(layers);
        let actionDone = !action;
        let settled = false;
        let starts = 0;
        let ends = 0;
        let timeout: ReturnType<typeof setTimeout>;
        let readyTimer: ReturnType<typeof setTimeout>;
        let viewEnded = false;
        let layersReady = layers.length === 0;

        function cleanup() {
            clearTimeout(timeout);
            clearTimeout(readyTimer);
            layers.forEach((layer) => layer.removeEventListener('viewportReady', onLayerReady));
            display.removeEventListener('mapviewchangestart', onViewStart);
            display.removeEventListener('mapviewchangeend', onViewEnd);
        }

        function complete() {
            if (!settled && actionDone && viewEnded && layersReady) {
                settled = true;
                cleanup();
                resolve(display);
            }
        }

        function fail(error: unknown) {
            if (settled) return;
            settled = true;
            cleanup();
            reject(error);
        }

        function onLayerReady(event: CustomEvent<{layer: TileLayer}>) {
            pendingLayers.delete(event.detail.layer);
            layersReady = pendingLayers.size === 0;
            complete();
        }

        function onViewStart() {
            starts++;
            layersReady = layers.length === 0;
            viewEnded = false;
            clearTimeout(readyTimer);
        }

        function onViewEnd() {
            ends++;
            // A new mapview start within the settling period invalidates this end event.
            clearTimeout(readyTimer);
            readyTimer = setTimeout(() => {
                viewEnded = true;
                complete();
            }, 10);
        }

        display.addEventListener('mapviewchangestart', onViewStart);
        display.addEventListener('mapviewchangeend', onViewEnd);
        layers.forEach((layer) => layer.addEventListener('viewportReady', onLayerReady));
        timeout = setTimeout(() => {
            fail(new Error(
                `Timed out waiting for viewport readiness: actionDone=${actionDone}, ` +
                `mapviewchangeend=${viewEnded}, mapviewready=${layersReady}, ` +
                `starts=${starts}, ends=${ends}, pendingLayers=${JSON.stringify([...pendingLayers].map((layer) => layer.id))}`
            ));
        }, 10000);

        Promise.resolve().then(() => action?.()).then(() => {
            actionDone = true;
            complete();
        }).catch(fail);
    });
}
