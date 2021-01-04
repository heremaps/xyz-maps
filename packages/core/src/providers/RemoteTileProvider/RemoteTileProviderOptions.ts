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

/**
 *  Configuration of providers.
 *
 *  @expose
 *  @public
 *  @interface
 *  @extends here.xyz.maps.providers.TileProvider.Options
 *  @class here.xyz.maps.providers.RemoteTileProvider.Options
 */

export default {
    /**
     * zoom level at which tiles are cached.
     *
     * @public
     * @expose
     * @name here.xyz.maps.providers.RemoteTileProvider.Options#level
     * @type {number}
     */
    // level: null,

    /**
     * PreProcessor for remote data sources.
     * The PreProcessor will be executed just after Features are received from remote backend.
     * If the processor function is returning the processed data then its treated as a synchronous processor.
     * If the processor function does not return any value (undefined) or a Promise then its treated as asynchronous processor.
     * An asynchronous processor that's not using a Promise MUST call the input.ready(..) callback when data processing is finished.
     *
     * Due to the execution of the processor in a separate worker thread the processor function must be scope independent.
     * The processor must be a "standalone function/class" that only depends on its own scope and only accesses its own local variables.
     * No references to the outer scope of the processor function are allowed.
     *
     * PreProcessor:
     *  ({data: any[], ready: (GeoJsonFeature[]) => void, tile?:{x:number,y:number,z:number}) => GeoJsonFeature[] | Promise
     *
     * @public
     * @expose
     * @name here.xyz.maps.providers.RemoteTileProvider.Options#preProcessor
     * @type {Function=}
     */
    // PreProcessor: null,

    /**
     * PostProcessor for remote data sources.
     * The PostProcessor will be executed just before created/modified or removed Features will be sent to the remote backend.
     * If the processor function is returning the processed data then its treated as a synchronous processor.
     * If the processor function does not return any value (undefined) or a Promise then its treated as asynchronous processor.
     * An asynchronous processor that's not using a Promise MUST call the input.ready(..) callback when data processing is finished.
     *
     * Due to the execution of the processor in a separate worker thread the processor function must be scope independent.
     * The processor must be a "standalone function/class" that only depends on its own scope and only accesses its own local variables.
     * No references to the outer scope of the processor function are allowed.
     *
     * PostProcessorData:
     *  {put: GeoJsonFeature[],remove: GeoJsonFeature[]}
     * PostProcessor:
     *  ({data: PostProcessorData, ready: (data) => void) => PostProcessorData | Promise
     *
     * @public
     * @expose
     * @name here.xyz.maps.providers.RemoteTileProvider.Options#postProcessor
     * @type {Function=} postProcessor
     */
    // postProcessor: null,
};
