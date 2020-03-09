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
        {id: 'common-src', pattern: 'common/dist/xyz-maps-common.min.js', watched: true, served: true, included: true},
        {pattern: 'tests/dist/common/commonTests*.js', watched: true, served: true, included: true},
        {pattern: 'tests/dist/common/specs*.js', watched: true, served: true, included: true}
    ],

    customContextFile: 'tests/dist/common/runnercommon.html',

    customDebugFile: 'tests/dist/common/runnercommon.html',

    jsonReporter: {
        stdout: false,
        outputFile: 'tests/dist/common/output/report.json' // defaults to none
    }
});

export default function(config) {
    config.set(karmaConfig);
};
