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

import {HTTPProviderOptions} from '../HTTPProvider/HTTPProviderOptions';

/**
 *  Configuration of geospace provider.
 *
 *  @expose
 *  @public
 *  @interface
 *  @extends here.xyz.maps.providers.RemoteTileProvider.Options
 *  @class here.xyz.maps.providers.SpaceProvider.Options
 */
interface SpaceProviderOptions extends HTTPProviderOptions {

    // /**
    //  * There are 3 environments available: 'prd'.
    //  *
    //  * @default 'prd'
    //  */
    environment?: string

    /**
     * Name of the XYZ-Hub Space.
     * {@link https://xyz.api.here.com/hub/static/swagger/#/Read%20Spaces/getSpace}
     */
    space: string;

    /**
     * User credential of the provider, a valid credential needs to contain the "access_token".
     */
    credentials: {
        // eslint-disable-next-line camelcase
        access_token: string;
    },

    /**
     * Indicates the tag(s) that should be set in the requests.
     *
     * @default false
     */
    tags?: false | string | string[],

    /**
     * Indicates if result geometry of tile requests should be clipped.
     *
     * @default false
     */
    clip?: boolean;

    /**
     * Base URL of the SpaceProvider.
     * It should point to a XYZ-Hub space endpoint.
     *
     * @default "https://xyz.api.here.com/hub/spaces"
     */
    url: string;

    /**
     * define property search query to enable remote filtering by property search.
     *
     * @see https://www.here.xyz/api/devguide/propertiessearch/
     *
     * @default null
     */
    propertySearch?: object
};

const defaultOptions: SpaceProviderOptions = {
    environment: 'prd',
    space: '',
    credentials: {
        access_token: ''
    },
    withCredentials: false,
    tags: false,
    https: true,
    clip: false,
    url: null,
    headers: null,
    propertySearch: null,
    editable: true,
    level: 0
};

export {SpaceProviderOptions, defaultOptions};
