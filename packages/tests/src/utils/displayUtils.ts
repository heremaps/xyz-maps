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


type VpReadyCallback = () => unknown;
type ViewportLayer = Pick<TileLayer, 'id' | 'addEventListener' | 'removeEventListener'>;
interface ViewportReadyTarget {
    getLayers(): ViewportLayer[];
    addEventListener(type: string, listener: () => void): unknown;
    removeEventListener(type: string, listener: () => void): unknown;
}

/**
 * Waits for the action to complete, a settled mapview end and viewport readiness of the selected layers.
 * Listeners are registered before the action. Missing signals are reported after ten seconds.
 */
export function waitForViewportReady<T extends ViewportReadyTarget>(
    display: T, mapLayers?: ViewportLayer[] | VpReadyCallback, fn?: VpReadyCallback
): Promise<T> {
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
        const timeoutError = new Error('Timed out waiting for viewport readiness');

        function cleanup() {
            clearTimeout(timeout);
            clearTimeout(readyTimer);
            const removals = [
                ...layers.map((layer) => () => layer.removeEventListener('viewportReady', onLayerReady)),
                () => display.removeEventListener('mapviewchangestart', onViewStart),
                () => display.removeEventListener('mapviewchange', onViewChange),
                () => display.removeEventListener('mapviewchangeend', onViewEnd)
            ];
            const errors: unknown[] = [];
            for (const remove of removals) {
                try {
                    remove();
                } catch (error) {
                    errors.push(error);
                }
            }
            if (errors.length) throw errors[0];
        }

        function settle(finish: () => void) {
            if (settled) return;
            settled = true;
            try {
                cleanup();
            } catch (error) {
                reject(error);
                return;
            }
            finish();
        }

        function complete() {
            if (!settled && actionDone && viewEnded && layersReady) {
                settle(() => resolve(display));
            }
        }

        function fail(error: unknown) {
            settle(() => reject(error));
        }

        function onLayerReady(event: CustomEvent<{layer: ViewportLayer}>) {
            if (settled) return;
            pendingLayers.delete(event.detail.layer);
            layersReady = pendingLayers.size === 0;
            complete();
        }

        function onViewStart() {
            if (settled) return;
            starts++;
            onViewChange();
        }

        function onViewChange() {
            if (settled) return;
            pendingLayers.clear();
            layers.forEach((layer) => pendingLayers.add(layer));
            layersReady = layers.length === 0;
            viewEnded = false;
            clearTimeout(readyTimer);
        }

        function onViewEnd() {
            if (settled) return;
            ends++;
            // A new mapview start within the settling period invalidates this end event.
            clearTimeout(readyTimer);
            readyTimer = setTimeout(() => {
                viewEnded = true;
                complete();
            }, 10);
        }

        timeout = setTimeout(() => {
            timeoutError.message += `: actionDone=${actionDone}, ` +
                `mapviewchangeend=${viewEnded}, mapviewready=${layersReady}, ` +
                `starts=${starts}, ends=${ends}, pendingLayers=${JSON.stringify([...pendingLayers].map((layer) => layer.id))}`;
            fail(timeoutError);
        }, 10000);

        try {
            display.addEventListener('mapviewchangestart', onViewStart);
            display.addEventListener('mapviewchange', onViewChange);
            display.addEventListener('mapviewchangeend', onViewEnd);
            layers.forEach((layer) => layer.addEventListener('viewportReady', onLayerReady));
            Promise.resolve().then(() => action?.()).then(() => {
                actionDone = true;
                complete();
            }).catch(fail);
        } catch (error) {
            fail(error);
        }
    });
}
