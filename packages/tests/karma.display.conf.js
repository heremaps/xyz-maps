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

export const karmaConfig = {
    browsers: ['Chrome'],

    customLaunchers: {
        ChromeHeadlessV: {
            base: 'ChromeHeadless',
            flags: ['--window-size=1280,1024', '--no-sandbox']
        }
    },

    frameworks: ['mocha', 'chai'],

    files: [
        {id: 'common-src', pattern: 'common/dist/xyz-maps-common.js', watched: true, served: true, included: true},
        {id: 'core-src', pattern: 'core/dist/xyz-maps-core.js', watched: true, served: true, included: true},
        {id: 'display-src', pattern: 'display/dist/xyz-maps-display.js', watched: true, served: true, included: true},
        {pattern: 'tests/assets/tiles/*.png', watched: false, included: false, served: true},
        {pattern: 'tests/dist/display/displayTests*.js', watched: true, served: true, included: true, nocache: true},
        {pattern: 'tests/dist/display/specs*.js', watched: true, served: true, included: true, nocache: true}
    ],

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

    customContextFile: 'tests/dist/display/runnerdisplay.html',

    customDebugFile: 'tests/dist/display/runnerdisplay.html',

    reporters: ['progress', 'html', 'json'],

    jsonReporter: {
        stdout: false,
        outputFile: 'tests/dist/display/output/report.json' // defaults to none
    },

    htmlReporter: {
        outputDir: 'dist/display/output', // where to put the reports
        focusOnFailures: true, // reports show failures on start
        namedFiles: false, // name files instead of creating sub-directories
        pageTitle: null, // page title for reports; browser info by default
        urlFriendlyName: false // simply replaces spaces with _ for files/dirs
    },

    singleRun: true,

    plugins: [
        'karma-mocha',
        'karma-chai',
        'karma-chrome-launcher',
        'karma-firefox-launcher',
        'karma-json-reporter',
        'karma-html-reporter'
    ]
};

export default function(config) {
    config.set(karmaConfig);
};
