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

export const karmaBaseConfig = {
    browsers: ['Chrome'],

    customLaunchers: {
        ChromeHeadless: {
            base: 'Chrome',
            flags: ['--headless', '--window-size=1280,1024', '--remote-debugging-port=9222']
        }
    },

    frameworks: ['mocha', 'chai'],

    basePath: '../',

    client: {
        clearContext: false,
        captureConsole: false,
        mocha: {
            // change Karma's debug.html to the mocha web reporter
            reporter: 'html',

            // custom ui, defined in required file above
            ui: 'bdd'
        }
    },

    reporters: ['progress', 'json'],

    singleRun: true,

    plugins: [
        'karma-mocha',
        'karma-chai',
        'karma-chrome-launcher',
        'karma-firefox-launcher',
        'karma-json-reporter'
    ]
};
