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

declare const global: any;
// TODO: create own gloabl that provides required functionality instead of just using window for now.
// required: postMessage, setTimeout, clearTimeout, Math, XMLHTTPRequest...
interface Global extends Window {
    Math: typeof Math;
    // global namespace
    here: { xyz: { maps: any } };

    URL: typeof URL;
}

export default <Global>((typeof window != 'undefined') ? window : global);
