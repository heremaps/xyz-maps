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

/**
 *  Configuration of providers.
 *
 *  @expose
 *  @public
 *  @interface
 *  @extends here.xyz.maps.providers.RemoteTileProvider.Options
 *  @class here.xyz.maps.providers.HTTPProvider.Options
 */

export default {

    /**
     * url for requesting tiles.
     *
     * It is either a string which may contain following flags that will be replaced by provider:
     * - {SUBDOMAIN_CHAR}: subdomain id(a, b, c and d) for balancing the load
     * - {SUBDOMAIN_INT}: subdomain id(0,1,2 and 3) for balancing the load
     * - {SUBDOMAIN_INT_1_4}: subdomain id(1,2,3 and 4) for balancing the load
     * - {QUADKEY}: quadkey of the tile to be requested
     * - {Z}:  z of the tile to be requested
     * - {X}:  x of the tile to be requested
     * - {Y}:  y of the tile to be requested
     *
     * or a callback function that's called with the following parameters x,y,z,quadkey and need to returns the url for requesting tiles.
     * The callback function needs to handle custom parameters by its own.
     *
     * @public
     * @expose
     * @name here.xyz.maps.providers.HTTPProvider.Options#url
     * @type {string|Function}
     * @example
     * // string
     * url: 'https://xyz.api.here.com/hub/spaces/mySpace/tile/quadkey/{QUADKEY}?access_token=myAccessToken'
     * // callback function
     * url: (z, y, x, quadkey) => {
     *     return 'https://xyz.api.here.com/hub/spaces/mySpace/tile/quadkey/' + quadkey + '?access_token=myAccessToken';
     * }
     */
    // url: null,

    /**
     * set custom url service headers.
     * custom headers will be applied to all request done by provider
     *
     * @public
     * @expose
     * @name here.xyz.maps.providers.HTTPProvider.Options#headers
     * @type {number}
     */
    // headers: null,

    /**
     * set custom url parameters.
     * custom parameters will be applied to all request done by provider
     *
     * @public
     * @expose
     * @name here.xyz.maps.providers.HTTPProvider.Options#params
     * @type {number}
     */
    // params: null
};
