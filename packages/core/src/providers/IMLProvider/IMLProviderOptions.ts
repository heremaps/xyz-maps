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
 *  Options to configure the IMLProvider.
 */
interface IMLProviderOptions extends HTTPProviderOptions {

    /**
     * Name of the Interactive Map Layer.
     */
    layer: string;

    /**
     * Name of the catalog of the Interactive Map Layer.
     */
    catalog: string;

    /**
     * User credential of the provider
     */
    credentials: {
        /**
         * apiKey for read access
         */
        apiKey: string;
        /**
         * token for write access
         */
        token?: string;
    },

    /**
     * Indicates the tag(s) that should be set in the requests.
     *
     * @defaultValue false
     */
    tags?: false | string | string[],

    /**
     * Indicates if result geometry of tile requests should be clipped.
     *
     * @defaultValue false
     */
    clip?: boolean;

    /**
     * URL of the Interactive Map Layer endpoint.
     *
     * @defaultValue "https://interactive.data.api.platform.here.com/interactive/v1"
     */
    url?: string;

    /**
     * define property search query to enable remote filtering by property search.
     *
     * @see https://interactive.data.api.platform.here.com/openapi/#/Read%20Features
     *
     * @defaultValue null
     */
    propertySearch?: {
        [name: string]: {
            operator: '=' | '!=' | '>' | '>=' | '<' | '<=',
            value: any | any[]
        }
    }
}

export {IMLProviderOptions};
