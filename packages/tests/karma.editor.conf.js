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
const karmaBaseConfig = require('./karma.base.conf').karmaBaseConfig;

export const karmaConfig = Object.assign(karmaBaseConfig, {
    files: [
        {id: 'common-src', pattern: 'common/dist/xyz-maps-common.js', watched: true, served: true, included: true},
        {id: 'core-src', pattern: 'core/dist/xyz-maps-core.js', watched: true, served: true, included: true},
        {id: 'display-src', pattern: 'display/dist/xyz-maps-display.js', watched: true, served: true, included: true},
        {id: 'editor-src', pattern: 'editor/dist/xyz-maps-editor.js', watched: true, served: true, included: true},
        {pattern: 'tests/assets/tiles/*.png', watched: false, included: false, served: true},
        {pattern: 'tests/dist/editor/editorTests*.js', watched: true, served: true, included: true},
        {pattern: 'tests/dist/editor/specs*.js', watched: true, served: true, included: true}
    ],

    customContextFile: 'tests/dist/editor/runnereditor.html',
    // customContextFile: 'tests/image-layer.html',

    customDebugFile: 'tests/dist/editor/runnereditor.html',

    jsonReporter: {
        stdout: false,
        outputFile: 'tests/dist/editor/output/report.json' // defaults to none
    }
});

export default function(config) {
    config.set(karmaConfig);
};
