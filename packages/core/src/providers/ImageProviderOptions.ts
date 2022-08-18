/*
 * Copyright (C) 2019-2022 HERE Europe B.V.
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

import {TileProviderOptions} from './TileProvider/TileProviderOptions';

/**
 * Options to configure the ImageProvider.
 */
export interface ImageProviderOptions extends TileProviderOptions {
    /**
     * An Image url or Image that will be displayed for errored tile requests.
     */
    errorImage: string | HTMLImageElement

    /**
     * PreProcessor for remote data sources.
     * The PreProcessor will be executed just after data is being received from remote backend.
     * If the processor function is returning the processed data then its treated as a synchronous processor.
     * If the processor function does not return any value (undefined) or a Promise then its treated as asynchronous processor.
     * An asynchronous processor that's not using a Promise MUST call the input.ready(..) callback when data processing is finished.
     *
     * Due to the execution of the processor in a separate worker thread the processor function must be scope independent.
     * The processor must be a "standalone function/class" that only depends on its own scope and only accesses its own local variables.
     * No references to the outer scope of the processor function are allowed.
     *
     * @example
     * ```
     * // PreProcessor:
     *  ({data: any[], ready: (HTMLImageElement) => void, tile?:{x:number,y:number,z:number}) => HTMLImageElement | Promise<HTMLImageElement>
     * ```
     */
    // preProcessor?: () => void;
    preProcessor?(input: {
        data: any,
        ready: (data: HTMLImageElement) => void,
        tile?: { x: number, y: number, z: number }
    }): HTMLImageElement | Promise<HTMLImageElement>;
}
