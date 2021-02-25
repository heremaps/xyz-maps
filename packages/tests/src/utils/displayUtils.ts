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

import {TileLayer} from '@here/xyz-maps-core';
import Map from '@here/xyz-maps-display';

export function waitForViewportReady(display: Map, mapLayers?: TileLayer[], fn?:Function): Promise<Map> {
    return new Promise(async (resolve) => {
        if (!mapLayers) {
            mapLayers = display.getLayers();
        } else if (typeof mapLayers == 'function') {
            fn = mapLayers;
            mapLayers = display.getLayers();
        }
        let layerAlwaysReady = !mapLayers.length;
        let mapviewchangeend = false;
        let mapviewready = layerAlwaysReady;
        let readyLayers = {};
        let layerCb = (evt) => {
            let layer = evt.detail.layer;
            readyLayers[layer.id] = layer;


            for (let i in readyLayers) {
                if (!readyLayers[i]) return;
            }

            mapviewready = true;

            if (mapviewchangeend) {
                for (let i in readyLayers) {
                    readyLayers[i].removeEventListener('viewportReady', layerCb);
                }
                display.removeEventListener('mapviewchangestart', mapviewchangestartcb);
                display.removeEventListener('mapviewchangeend', mapviewchangeendcb);

                resolve(display);
            }
        };

        let readyTimer;
        let mapviewchangestartcb = () => {
            mapviewready = layerAlwaysReady;
            mapviewchangeend = false;
            clearTimeout(readyTimer);
        };
        let mapviewchangeendcb = () => {
            // wait for next mapviewchangestart event, if map is not ready (e.g. map is still dragging), timout will be cleared by next start event
            readyTimer = setTimeout(()=>{
                mapviewchangeend = true;
                if (mapviewready) {
                    for (let i in readyLayers) {
                        readyLayers[i].removeEventListener('viewportReady', layerCb);
                    }

                    display.removeEventListener('mapviewchangestart', mapviewchangestartcb);
                    display.removeEventListener('mapviewchangeend', mapviewchangeendcb);

                    resolve(display);
                }
            }, 10);
        };

        display.addEventListener('mapviewchangestart', mapviewchangestartcb);
        display.addEventListener('mapviewchangeend', mapviewchangeendcb);

        mapLayers.forEach((layer) => {
            if (!readyLayers[layer.id]) {
                layer.addEventListener('viewportReady', layerCb);
                readyLayers[layer.id] = false;
            }
        });

        if (fn) {
            await fn();
        }
    });
}
