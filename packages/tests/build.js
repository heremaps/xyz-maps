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

const fs = require('fs');
const rimraf = require('rimraf');
const mkdirp = require('mkdirp');
const argv = require('yargs').argv;
const path = require('path');
const rollup = require('rollup');
const KarmaServer = require('karma').Server;
const cfg = require('karma').config;
const http = require('http');
const request = require('request');

var testReport = {};

var karmaSettings = {
    browser: ['ChromeHeadlessV'],
    singlerun: true // run tests and then exit with an exit code of 0 or 1 depending on whether all tests passed or any tests failed.
};

var mochaSettings = {
    ui: 'bdd',
    reporter: 'html',
    timeout: 20000,
    bail: false
};
var mochaConfigs = ['bail', 'timeout', 'slow', 'grep', 'fgrep', 'invert'];

var environments = {};
var credentials = {};
var environmentsPath = './environments.json';
var credentialsPath = './credentials.json';

var parallelTest = true;

var cleanupServer;
var cleanupServerPort = 8090;

var sourceFiles = {};

let apiComponents = ['editor', 'display', 'core', 'common'];
let testFilter = {};
let compsToRun = [];


function getArguments() {
    // pass credential in argument
    try {
        // credentialsPath = argv.credentials || credentialsPath;
        credentialsPath = argv.credentials || path.join(__dirname, credentialsPath);
        credentials = require(credentialsPath);
        // credentials = JSON.parse(fs.readFileSync(redentialsPath));
    } catch (e) {
        throw e;
        // throw Error(credentialsPath + ' not found! Please refer to README.md for details');
    }

    // pass environment in argument
    try {
        // environmentsPath = argv.environments || environmentsPath;
        environmentsPath = argv.environments || path.join(__dirname, environmentsPath);
        environments = require(environmentsPath);
    } catch (e) {
        throw e;
        // throw Error(environmentsPath + ' not found! Please refer to README.md for details');
    }

    // pass in path of each API component
    apiComponents.forEach((component) => {
        let argvName = component + '-src';
        if (argv[argvName]) {
            sourceFiles[argvName] = argv[argvName];
        }
    });

    parallelTest = argv.parallel ? (argv.parallel === 'true' || argv.parallel === true) : parallelTest;

    // Get CLI parameters
    for (let s in argv) {
        let ls = s.toLowerCase();

        if (karmaSettings.hasOwnProperty(ls)) {
            // browser, singleRun are set here
            karmaSettings[ls] = argv[s];
        } else if (apiComponents.indexOf(ls) > -1) {
            if (argv[s] == 'true' || argv[s] == true) {
                compsToRun.push(ls);
            } else if (typeof argv[s] == 'string' && argv[s] != 'false') {
                compsToRun.push(ls);
                testFilter[ls] = decodeURI(argv[s]);
            } else if (argv[s] == 'false') {
                apiComponents.splice(apiComponents.indexOf(ls), 1);
            }
        } else if (mochaConfigs.indexOf(ls) > -1) {
            mochaSettings[ls] = argv[ls] || mochaSettings[ls];
        }
    }

    if (compsToRun.length == 0) compsToRun = apiComponents;

    // set browsers to test in
    if (karmaSettings.browser === true || karmaSettings.browser === 'true') {
        // test default in chrome
        karmaSettings.browser = ['Chrome'];
    } else if (typeof karmaSettings.browser == 'string' && karmaSettings.browser !== 'false') {
        karmaSettings.browser = karmaSettings.browser.split(',');
    }
};

function buildTestsWatch() {
    getArguments();

    var rollupConfigs = require('./rollup.config')({
        mochaSettings,
        compsToRun,
        testFilter,
        environments,
        credentials,
        cleanupServerPort
    });

    rollupConfigs.forEach(async (config) => {
        const watchOptions = Object.assign({output: config.output}, config.input);

        const watcher = rollup.watch(watchOptions);

        watcher.on('event', (event) => {
            console.log('Bundle status:', event.code);
        });
    });
};

async function buildTests(done) {
    getArguments();

    var rollupConfigs = require('./rollup.config')({
        mochaSettings,
        compsToRun,
        testFilter,
        environments,
        credentials,
        cleanupServerPort
    });

    let bundles = [];
    let outputConfigs = [];
    let outputs = [];

    rollupConfigs.forEach(async (config) => {
        // create a bundle
        bundles.push(rollup.rollup(config.input));
        outputConfigs.push(config.output);
    });

    (await Promise.all(bundles)).forEach(async (bundle, i) => {
        outputs.push(bundle.write(outputConfigs[i]));
    });

    return Promise.all(outputs);
};

async function test(done) {
    // all test components are built here
    await buildTests();

    // start server for listening to messages that test is cancelled manually(reload page, close browser)
    // the server will clear the spaces that were created by these tests.
    cleanupServer = new CleanupServer(cleanupServerPort);

    testReport = {};

    startTests(compsToRun, function(results) {
        for (let cmp in results) {
            var file = 'dist/' + cmp + '/output/report.json';
            var output = JSON.parse(fs.readFileSync(file));

            testReport[cmp] = output;
            testReport[cmp + '-report-path'] = file;
        }
        cleanupServer.close();
        if (done) done();
    }, parallelTest);

    console.log('\x1b[32m%s\x1b[0m', 'All components finish!!');

    let error = false;

    for (let i in testReport) {
        if (testReport[i].summary) {
            console.log(i, testReport[i].summary, 'summary');

            if (testReport[i].summary.failed || testReport[i].summary.exitCode || testReport[i].summary.error) {
                error = true;
            }
        }
    }

    if (error) {
        throw Error('tests failed');
    }

    return new Promise(function(resolve) {
        resolve(testReport);
    });
};


// Start tests without building
function simpleRun(done) {
    getArguments();

    testReport = {};

    startTests(compsToRun, function(results) {
        for (let cmp in results) {
            var file = 'dist/' + cmp + '/output/report.json';
            var output = JSON.parse(fs.readFileSync(file));

            testReport[cmp] = output;
            testReport[cmp + '-report-path'] = file;
        }
        if (done) done();
    }, parallelTest);
};


function validateFile(id, filePath, karmaBasePath) {
    const p = path.isAbsolute(filePath) ? filePath : path.join(__dirname, karmaBasePath, filePath);

    if (!fs.existsSync(p)) {
        throw Error('File not found for "' + id + '": "' + filePath + '" with basePath: "' + karmaBasePath + '"');
        return;
    }
};

function getKarmaConfig(comp, browsers) {
    const karmaConfigPath = './karma.' + comp + '.conf.js';
    const karmaConfig = require(karmaConfigPath).karmaConfig;

    karmaConfig.files.forEach((file) => {
        if (file.id ) {
            // Use custom API path if it is passed in with arguments
            if (sourceFiles[file.id]) {
                file.pattern = sourceFiles[file.id];
            }

            // validate if file exists
            validateFile(file.id, file.pattern, karmaConfig.basePath);
        }
    });

    return cfg.parseConfig(path.resolve(karmaConfigPath), {
        'browsers': browsers,
        'singleRun': (karmaSettings.singlerun === 'true' || karmaSettings.singlerun === true),
        'files': karmaConfig.files
    });
}

function cleanReport(comp) {
    var output = 'dist/' + comp + '/output/';

    mkdirp(output, function(e) {
        rimraf(output + '*', function(e) {
            console.log('\x1b[32m%s\x1b[0m', 'Outputs cleaned for ' + comp);
        });
    });
}

function startTests(comps, done, parallel) {
    let finishedTests = 0;
    let testResults = {};

    function startKarma(comp, callback) {
        // clean old report
        cleanReport(comp);

        // get configure
        let config = getKarmaConfig(comp, karmaSettings.browser);

        let server = new KarmaServer(config, callback);
        server.start();

        // server.addListener('browser_log', function(e, b, c) {
        //     console.log(b, "ffffffff");
        // });
    }

    if (parallel) {
        comps.forEach((comp) => {
            function completed(result) {
                finishedTests++;
                testResults[comp] = result;

                if (finishedTests == comps.length) {
                    done(testResults);
                }
            }

            startKarma(comp, completed);
        });
    } else {
        let comp = comps.pop();

        function completed(result) {
            testResults[comp] = result;

            if (comps.length == 0) {
                done(testResults);
            } else {
                comp = comps.pop();

                startKarma(comp, completed);
            }
        }

        startKarma(comp, completed);
    }
}

// Cleanup leftover spaces in case test is interrupted(close browser, reload page)
function CleanupServer(port) {
    this.server = http.createServer().listen(port);
    this.server.on('request', (req, response) => {
        let spaces = [];
        req.on('data', (chunk) => {
            spaces.push(chunk);
        }).on('end', () => {
            spaces = Buffer.concat(spaces).toString();
            spaces.split(',').forEach((space) => {
                console.log('cleanup(delete) space', space);
                request.delete({
                    method: 'DELETE',
                    url: environments.xyzhub + '/spaces/' + space,
                    headers: {
                        'Authorization': 'Bearer ' + credentials.access_token
                    }
                });
            });
        });
    });

    this.port = port;

    this.close = ()=>this.server.close();
}


if (argv.test) {
    test();
}

if (argv.buildTests) {
    buildTests();
}

if (argv.buildTestsWatch) {
    buildTestsWatch();
}
