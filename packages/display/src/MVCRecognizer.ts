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

import {global} from '@here/xyz-maps-common';
import {geo} from '@here/xyz-maps-core';

const setTimeout = global.setTimeout;
const setInterval = global.setInterval;

const EVENT_MVC = 'mapviewchange';
const EVENT_MVC_START = EVENT_MVC + 'start';
const EVENT_MVC_END = EVENT_MVC + 'end';
const MAPVIEWCHANGE_MS = 1e3 / 30;
const MAPVIEWCHANGE_END_DELAY_MS = 100;

const SYNC = true;

const createEvent = (eventName: string, map, layer): Event => {
    let event;
    if (typeof (Event) === 'function') {
        event = new Event(eventName);
    } else {
        event = document.createEvent('Event');
        event.initEvent(eventName, true, true);
    }
    event.detail = event.data = {
        'map': map,
        'layer': layer
    };

    return event;
};


class MVCRecognizer {
    private readyTimer: number;
    private watchTimer: number = null;
    private viewport: geo.Rect;
    private center: geo.Point;
    private rz: number; // rotation z
    private endTriggered: boolean;
    private triggeredLayers: { [layerId: string]: boolean };
    private map;
    private trigger;
    private renderInfo;

    constructor(map, triggerEventListeners, renderInfo) {
        this.map = map;
        this.trigger = triggerEventListeners;
        this.renderInfo = renderInfo;

        this.changeWatcher = this.changeWatcher.bind(this);
        this.readyWatcher = this.readyWatcher.bind(this);
    }

    private centerChanged(center: geo.Point): boolean {
        return this.center.longitude != center.longitude ||
            this.center.latitude != center.latitude;
    }

    private vpChanged(vp: geo.Rect, rotZ: number): boolean {
        const {viewport, rz} = this;
        return !(
            viewport.minLon != vp.minLon || viewport.maxLon != vp.maxLon ||
            viewport.minLat != vp.minLat || viewport.maxLat != vp.maxLat ||
            rz != rotZ
        );
    }

    private changeWatcher() {
        const {map, readyTimer, watchTimer, viewport, center} = this;
        let curVP = map.getViewBounds();
        let curCenter = map.getCenter();
        let rotZ = map.rotate();
        let type = EVENT_MVC;
        let mvcevent = {
            changed: {
                center: true
            }
        };

        if (viewport) {
            mvcevent.changed.center = this.centerChanged(curCenter);

            if (!this.vpChanged(curVP, rotZ)) {
                this.viewport = curVP;
                this.rz = rotZ;
                this.center = curCenter;
            } else {
                clearInterval(watchTimer);

                this.watchTimer =
                    this.viewport =
                        this.rz = null;

                if (readyTimer) {
                    clearTimeout(readyTimer);
                }
                return this.readyTimer = setTimeout(this.readyWatcher, MAPVIEWCHANGE_END_DELAY_MS);
            }
        } else {
            this.triggeredLayers = {};
            type = EVENT_MVC_START;
            this.viewport = curVP;
            this.rz = rotZ;
            this.center = curCenter;
            this.endTriggered = true;
        }
        this.trigger(type, mvcevent, SYNC);
    }

    private readyWatcher() {
        const {map, triggeredLayers} = this;
        let renderers = this.renderInfo.getLayers();
        let allReady = true;
        let layer;
        let layerInfo;
        let id;

        if (this.endTriggered) {
            this.endTriggered = false;

            const curCenter = map.getCenter();

            this.trigger(EVENT_MVC_END, {
                changed: {
                    center: this.centerChanged(curCenter)
                }
            }, SYNC);
        }

        for (let i = 0; i < renderers.length; i++) {
            layerInfo = renderers[i];
            layer = layerInfo.layer;
            id = layer.id;

            if (layerInfo.ready) {
                if (!triggeredLayers[id]) {
                    triggeredLayers[id] = true;

                    if (!layerInfo.error) {
                        let ev = createEvent('viewportReady', map, layer);

                        layer._l.trigger('viewportReady', [ev], true);
                    }
                }
            } else {
                allReady = false;
            }
        }

        if (!allReady) {
            this.readyTimer = setTimeout(this.readyWatcher, MAPVIEWCHANGE_END_DELAY_MS);
        }
    };

    watch(watch: boolean) {
        const {readyTimer, watchTimer} = this;

        if (readyTimer) {
            clearTimeout(readyTimer);
            this.readyTimer = null;
        }

        if (watch) {
            if (!watchTimer) {
                this.watchTimer = setInterval(this.changeWatcher, MAPVIEWCHANGE_MS);
            }
        } else {
            if (watchTimer) {
                clearInterval(watchTimer);
                this.watchTimer = null;
            }
        }
    };
}

export default MVCRecognizer;
