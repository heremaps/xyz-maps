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

import {layers} from '@here/xyz-maps-core';
import Map from '@here/xyz-maps-display';

export namespace displayTests {
    export function waitForViewportReady(display: Map, mapLayers?: layers.TileLayer[], fn?:Function): Promise<Map> {
        return new Promise(async (resolve) => {
            let elem = display.getContainer();
            let buttonup = true;
            let mapviewready = true;
            if (!mapLayers) {
                mapLayers = display.getLayers();
            } else if (typeof mapLayers == 'function') {
                fn = mapLayers;
                mapLayers = display.getLayers();
            }
            let readyLayers = {};
            let layerCb = (evt) => {
                let layer = evt.detail.layer;
                readyLayers[layer.id] = layer;


                for (let i in readyLayers) {
                    if (!readyLayers[i]) return;
                }

                for (let i in readyLayers) {
                    readyLayers[i].removeEventListener('viewportReady', layerCb);
                }

                mapviewready = true;

                if (buttonup) {
                    elem.removeEventListener('mousedown', mousedowncb);
                    elem.removeEventListener('mouseup', mouseupcb);
                    display.removeEventListener('mapviewchangestart', mapviewchangestartcb);
                    resolve(display);
                }
            };

            let mouseupcb = (evt) => {
                buttonup = true;

                if (mapviewready) {
                    elem.removeEventListener('mouseup', mouseupcb);
                    display.removeEventListener('mapviewchangestart', mapviewchangestartcb);
                    resolve(display);
                }
            };

            let mapviewchangestartcb = () => {
                mapviewready = false;
            };

            let mousedowncb = (evt) => {
                mapviewready = false;
                buttonup = false;
                display.addEventListener('mapviewchangestart', mapviewchangestartcb);
                elem.addEventListener('mouseup', mouseupcb);
                elem.removeEventListener('mousedown', mousedowncb);
            };

            elem.addEventListener('mousedown', mousedowncb);

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

}
