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
const git = require('simple-git');
const {join, dirname, resolve} = require('path');
const {readFileSync, writeFileSync} = require('fs');
const NO_SCOPE = 'NONE';
let cwd;

const getCommitlogs = async (from, to) => {
    // git log --first-parent master `git describe --tags --abbrev=0` ' + from + '..' + to + ' --format="%B"
    return new Promise((resolve, reject) => {
        git(cwd).raw(['log', '--first-parent', 'master', from + '..' + to, '--format=%B'], function(err, result) {
            if (err) {
                reject(err);
            } else {
                resolve(result);
            }
        });
    });
};

const getLastReleaseTag = async () => {
    return new Promise((resolve, reject) => {
        git(cwd).tag(['-l', '--sort=v:refname'], (err, result) => {
            if (err) {
                reject(err);
            } else {
                let tags = result.trim().split(/\n/);
                resolve(tags.filter((tag) => tag.match(/^v?\d+.\d+.\d+$/)).pop());
            }
        });
    });
};

const parseCommitLogs = async (from, to) => {
    let logs = await getCommitlogs(from, to);

    let scopes = {};
    let length = 0;

    if (logs) {
        logs = logs.match(/^([a-z]+(\([a-z]+\))?:){1}.+/mgi);

        logs && logs.forEach((log) => {
            if (log) {
                let scope = log.match(/^[a-z]+\(.+\):/i);
                // group by scope...
                if (scope) {
                    scope = scope[0];
                    scope = scope.slice(scope.indexOf('('), -1);
                    log = log.replace(scope, '');
                    // remove brackets
                    scope = scope.slice(1, -1);
                } else {
                    scope = NO_SCOPE;
                }

                if (!scopes[scope]) {
                    length++;
                    scopes[scope] = [];
                }

                log = log.split(':');

                scopes[scope].push({
                    type: log[0],
                    desc: log[1]
                });
            }
        });
    }

    return {
        scopes: scopes,
        length: length
    };
};

const createMarkup = async (newVersion, logs) => {
    let now = new Date;
    let timeString = now.getFullYear() + '-' + (now.getMonth() + 1) + '-' + now.getDate();
    let changelog = '';
    let text = '';

    if (logs.length) {
        let scopes = logs.scopes;

        changelog += '\n';

        for (let name in scopes) {
            scopes[name].reverse().forEach((log) => text = '* ' + log.type + ':' + log.desc + '\n' + text);

            if (logs.length > 1) {
                let heading = name == NO_SCOPE ? 'general' : name;
                text = '### ' + heading + '\n' + text;
            }
        }

        changelog = text + changelog;
        changelog = '## ' + newVersion + ' (' + timeString + ')\n' + changelog;

        return changelog;
    }
};

const getPath = (filename) => join(resolve(), filename);

const changelog = {

    parse: async (options) => {
        options = options || {};

        cwd = options.path;

        const to = options.to || 'HEAD';
        const from = options.from || await getLastReleaseTag();

        return await parseCommitLogs(from, to);
    },

    getMarkup: async (options) => {
        options = options || {};
        let logs = await changelog.parse(options);
        let version = options.version || require(getPath('package.json')).version;

        return await createMarkup(version, logs);
    },

    update: async (options) => {
        options = options || {};
        const text = await changelog.getMarkup(options);
        const path = getPath(options.filename || 'CHANGELOG.md');
        let clog;

        if (text) {
            try {
                clog = readFileSync(path, 'utf8');
            } catch (e) {
                clog = '';
            }

            console.log(text);

            writeFileSync(path, text + clog, 'utf8');
        }
    }
};

module.exports = changelog;
