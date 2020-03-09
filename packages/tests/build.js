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
const spawn = require('cross-spawn');


var karmaSettings = {
    browser: ['Chrome'],
    singlerun: true // run tests and then exit with an exit code of 0 or 1 depending on whether all tests passed or any tests failed.
};

var mochaSettings = {
    ui: 'bdd',
    reporter: 'html',
    timeout: 20000,
    bail: false
};
var mochaConfigs = ['bail', 'timeout', 'slow', 'grep', 'fgrep', 'invert'];

var environments = {
    xyzhub: undefined,
    image: undefined
};
var credentials = {
    access_token: undefined
};
var environmentsPath = './environments.json';
var credentialsPath = './credentials.json';

var parallelTest = true;

var cleanupServerPort = 8090;

let apiComponents = ['editor', 'display', 'core', 'common'];
let compsToRun = [];

function parseArgv(arg, dataPath, data) {
    try {
        dataPath = path.join(__dirname, dataPath);

        if (Array.isArray(arg)) {
            arg.forEach((v)=>{
                if (typeof v == 'string') {
                    dataPath = v;
                } else {
                    data = Object.assign(data, v);
                }
            });
        } else if (typeof arg == 'object') {
            data = Object.assign(data, arg);
        } else if (typeof arg == 'string') {
            dataPath = arg;
        }

        let dataTemp;
        for (let key in data) {
            if (data[key] === undefined) {
                dataTemp = dataTemp || require(dataPath);
                data[key] = dataTemp[key];
            }
        }
    } catch (e) {
        throw e;
    }
    return data;
}

function getRollupConfig() {
    // get credential in argument
    credentials = parseArgv(argv.credentials, credentialsPath, credentials);

    // get environment in argument
    environments = parseArgv(argv.environments, environmentsPath, environments);

    let testFilter = {};
    let compListCopy = Object.assign([], apiComponents);

    // Get mochaSettings and components to run
    for (let s in argv) {
        let ls = s.toLowerCase();
        if (compListCopy.indexOf(ls) > -1) {
            if (argv[s] === 'true' || argv[s] === true) {
                compsToRun.push(ls);
            } else if (typeof argv[s] == 'string' && argv[s] != 'false') {
                compsToRun.push(ls);
                testFilter[ls] = decodeURI(argv[s]);
            } else if (argv[s] === 'false' || argv[s] === false) {
                compListCopy.splice(compListCopy.indexOf(ls), 1);
            }
        } else if (mochaConfigs.indexOf(ls) > -1) {
            mochaSettings[ls] = argv[ls] || mochaSettings[ls];
        }
    }

    if (compsToRun.length == 0) compsToRun = compListCopy;

    return require('./rollup.config')({
        mochaSettings,
        compsToRun,
        testFilter,
        environments,
        credentials,
        cleanupServerPort
    });
};

function buildTestsWatch() {
    var rollupConfigs = getRollupConfig();

    rollupConfigs.forEach(async (config) => {
        const watchOptions = Object.assign({output: config.output}, config.input);

        const watcher = rollup.watch(watchOptions);

        watcher.on('event', (event) => {
            console.log('Bundle status:', event.code);
        });
    });
};

async function buildTests(done) {
    let bundles = [];
    let outputConfigs = [];
    let outputs = [];

    var rollupConfigs = getRollupConfig();

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
    // start xyzhub
    if (argv.startHub === true || argv.startHub === 'true') {
        await startHub();
    }

    // all test components are built here
    await buildTests();

    // start server for listening to messages that test is cancelled manually(reload page, close browser)
    // the server will clear the spaces that were created by these tests.
    let cleanupServer = new CleanupServer(cleanupServerPort);

    let testReport = {};

    startTests(compsToRun, function(results) {
        for (let cmp in results) {
            var file = 'dist/' + cmp + '/output/report.json';
            var output = JSON.parse(fs.readFileSync(file));

            testReport[cmp] = output;
            testReport[cmp + '-report-path'] = file;
        }
        cleanupServer.close();
        if (done) done();
    });

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

function validateFile(id, filePath, karmaBasePath) {
    const p = path.isAbsolute(filePath) ? filePath : path.join(__dirname, karmaBasePath, filePath);

    if (!fs.existsSync(p)) {
        throw Error('File not found for "' + id + '": "' + filePath + '" with basePath: "' + karmaBasePath + '"');
        return;
    }
};

function getKarmaConfig(comp) {
    const karmaConfigPath = './karma.' + comp + '.conf.js';
    const karmaConfig = require(karmaConfigPath).karmaConfig;


    karmaConfig.files.forEach((file) => {
        if (file.id ) {
            var sourceFiles = {};

            // pass in path of each API component
            apiComponents.forEach((component) => {
                let argvName = component + '-src';
                if (argv[argvName]) {
                    sourceFiles[argvName] = argv[argvName];
                }
            });

            // Use custom API path if it is passed in with arguments
            if (sourceFiles[file.id]) {
                file.pattern = sourceFiles[file.id];
            }

            // validate if file exists
            validateFile(file.id, file.pattern, karmaConfig.basePath);
        }
    });

    for ( a in argv) {
        let la = a.toLowerCase();
        if (karmaSettings.hasOwnProperty(la)) {
            // browser, singleRun are get here
            karmaSettings[la] = argv[a];
        }
    }

    // set browsers to test in
    if (typeof karmaSettings.browser == 'string') {
        karmaSettings.browser = karmaSettings.browser.split(',');
    }

    return cfg.parseConfig(path.resolve(karmaConfigPath), {
        'browsers': karmaSettings.browser,
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

function startTests(comps, done) {
    let parallel = argv.parallel ? (argv.parallel === 'true' || argv.parallel === true) : parallelTest;

    let finishedTests = 0;
    let testResults = {};

    function startKarma(comp, callback) {
        // clean old report
        cleanReport(comp);

        // get configure
        let config = getKarmaConfig(comp);

        let server = new KarmaServer(config, callback);
        server.start();
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

async function startHub() {
    let args = ['bash', './start-hub.sh'];
    if (argv.kill) {
        args.push('kill', true);
    }

    return new Promise((resolve, reject) => {
        spawn('sudo', args, {stdio: 'inherit'})
            .on('close', resolve)
            .on('error', reject);
    });
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

if (argv.localHub) {
    startHub();
}
