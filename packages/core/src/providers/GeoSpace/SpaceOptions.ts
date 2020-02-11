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
 *  Configuration of geospace provider.
 *
 *  @expose
 *  @public
 *  @interface
 *  @extends here.xyz.maps.providers.RemoteTileProvider.Options
 *  @class here.xyz.maps.providers.SpaceProvider.Options
 */
const SpaceProviderOptions = {

    // /**
    //  * There are 3 environments available: 'prd'.
    //  *
    //  * @public
    //  * @expose
    //  * @optional
    //  * @default 'prd'
    //  * @name here.xyz.maps.providers.SpaceProvider.Options#environment
    //  * @type {string}
    //  */
    'environment': 'prd',

    /**
     * Space name.
     *
     * @public
     * @expose
     * @name here.xyz.maps.providers.SpaceProvider.Options#space
     * @type {string}
     */
    'space': '',

    /**
     * User credential of the provider, a valid credential needs to contain the "access_code".
     *
     * @public
     * @expose
     * @name here.xyz.maps.providers.SpaceProvider.Options#credentials
     * @type {Object}
     */
    'credentials': {},

    /**
     * Indicates if request is made with credentials.
     *
     * @public
     * @expose
     * @optional
     * @default false
     * @name here.xyz.maps.providers.SpaceProvider.Options#withCredentials
     * @type {Boolean}
     */
    'withCredentials': false,

    /**
     * Indicates which tag is set in requests.
     *
     * @public
     * @expose
     * @optional
     * @default false
     * @name here.xyz.maps.providers.SpaceProvider.Options#tags
     * @type {Boolean}
     */
    'tags': false,

    /**
     * Indicates if request is made with https.
     *
     * @public
     * @expose
     * @optional
     * @default true
     * @name here.xyz.maps.providers.SpaceProvider.Options#https
     * @type {Boolean}
     */
    'https': true,

    /**
     * Indicates if return clip features in request.
     *
     * @public
     * @expose
     * @optional
     * @default false
     * @name here.xyz.maps.providers.SpaceProvider.Options#clip
     * @type {Boolean}
     */
    'clip': false,

    /**
     * url of the provider, it points to xyz-hub space endpoint.
     *
     * @public
     * @expose
     * @optional
     * @default null
     * @name here.xyz.maps.providers.SpaceProvider.Options#url
     * @type {string}
     */
    'url': null,

    /**
     * set custom url service headers.
     * custom headers will be applied to all request done by provider
     *
     * @public
     * @expose
     * @optional
     * @default null
     * @name here.xyz.maps.providers.SpaceProvider.Options#headers
     * @type {Object}
     */
    'headers': null,

    /**
     * define property search query to enable remote filtering by property search
     * {@link https://www.here.xyz/api/devguide/propertiessearch/}
     *
     * @public
     * @expose
     * @optional
     * @default null
     * @name here.xyz.maps.providers.SpaceProvider.Options#propertySearch
     * @type {Object}
     */
    'propertySearch': null
};

export default SpaceProviderOptions;
