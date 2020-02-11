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

export default {
    /**
     *  Configuration of layers.
     *
     *  @public
     *  @class
     *  @interface
     *  @expose
     *  @constructor
     *  @name here.xyz.maps.layers.TileLayer.Options
     */

    /**
     * Layer name.
     *
     * @public
     * @expose
     * @optional
     * @name here.xyz.maps.layers.TileLayer.Options#name
     * @type {string}
     */
    // name: null,

    /**
     * minimum zoom level at which features from the layer's provider are displayed.
     *
     * @public
     * @expose
     * @optional
     * @name here.xyz.maps.layers.TileLayer.Options#min
     * @type {number}
     */
    // min: null,

    /**
     * maximum zoom level at which features from the layer's provider are displayed.
     *
     * @public
     * @expose
     * @optional
     * @name here.xyz.maps.layers.TileLayer.Options#max
     * @type {number}
     */
    // max: null,

    /**
     * The providers that provide data for this layer.
     *
     * @public
     * @expose
     * @optional
     * @name here.xyz.maps.layers.TileLayer.Options#provider
     * @type {Array.<here.xyz.maps.providers.TileProvider>|here.xyz.maps.providers.TileProvider}
     *
     */
    // provider: null,

    /**
     * Style for rendering features in this layer.
     *
     * @public
     * @expose
     * @optional
     * @name here.xyz.maps.layers.TileLayer.Options#style
     * @type {here.xyz.maps.layers.TileLayer.TileLayerStyle}
     */
    // style: null
};
