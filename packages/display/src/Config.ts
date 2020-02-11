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

import {geo, layers} from '@here/xyz-maps-core';

export type MapConfig = {
    ui: {},
    zoomlevel: number,
    center: geo.Point,
    layers: layers.TileLayer[],
    maxLevel: number,
    minLevel: number,
    debug: boolean,
    minPanMapThreshold: number,
    zoomAnimationMs: number,
    maxPitch: number
};

/**
 *  Configuration of map display.
 *
 *  @public
 *  @class
 *  @expose
 *  @interface
 *  @name here.xyz.maps.Map.Config
 */
export const defaultCfg: MapConfig = {

    /**
     * Configure visibility and position of ui components
     * @public
     * @name here.xyz.maps.Map.Config.ui
     * @optional
     */
    ui: {},

    /**
     *  zoomlevel of the map.
     *
     *  @public
     *  @expose
     *  @name here.xyz.maps.Map.Config#zoomlevel
     *  @optional
     *  @default 18
     *  @type {number}
     */
    zoomlevel: 18,

    /**
     *  Center coordinate of the map.
     *
     *  @public
     *  @expose
     *  @name here.xyz.maps.Map.Config#center
     *  @optional
     *  @default {longitude: 8.534, latitude: 50.162}
     *  @type {here.xyz.maps.geo.Point}
     */
    center: {longitude: 8.534, latitude: 50.162},


    /**
     * add layers to display.
     *
     * @public
     * @expose
     * @name here.xyz.maps.Map.Config#layers
     * @type {Array.<here.xyz.maps.layers.TileLayer>}
     */
    layers: null,

    /**
     * maximum zoomlevel of displaying the map overlay
     *
     * @public
     * @expose
     * @name here.xyz.maps.Map.Config#maxLevel
     * @optional
     * @type {number}
     * @default 20
     */
    maxLevel: 20,

    /**
     * minimum zoomlevel of displaying the map overlay
     *
     * @public
     * @expose
     * @name here.xyz.maps.Map.Config#minLevel
     * @optional
     * @type {number}
     * @default 2
     */
    minLevel: 2,

    /**
     * set the log level
     *
     * @public
     * @expose
     * @name here.xyz.maps.Map.Config#debug
     * @optional
     * @default false
     * @type {Boolean}
     */
    debug: false,

    /**
     * minimum threshold in pixel for enabling pan map gesture
     *
     * @public
     * @expose
     * @name here.xyz.maps.Map.Config#minPanMapThreshold
     * @type {Boolean}
     * @default 4
     * @optional
     */
    minPanMapThreshold: 4,

    zoomAnimationMs: 100,

    maxPitch: 50
};
