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
const git = require('simple-git');
const {join, dirname, resolve} = require('path');
const {readFileSync, writeFileSync} = require('fs');
const NO_SCOPE = 'NONE';
const DEFAULT_DOCS_BASE_URL = 'https://heremaps.github.io/xyz-maps/';
const CHANGELOG_TYPE_ALIASES = {
    added: 'add',
    fixed: 'fix',
    improved: 'improve'
};

const normalizeChangelogType = (type) => CHANGELOG_TYPE_ALIASES[type.toLowerCase()] || type;

const hasNoChangelogTrailer = (commit) => {
    const paragraphs = commit.trim().split(/\r?\n(?:[ \t]*\r?\n)+/);
    const footer = paragraphs[paragraphs.length - 1];

    return footer.split(/\r?\n/).some((line) => /^Changelog:\s*none\s*$/i.test(line.trim()));
};

const normalizeDocsBaseUrl = (docsBaseUrl) => {
    const url = new URL(docsBaseUrl);

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        throw new TypeError('docsBaseUrl must be an absolute HTTP(S) URL.');
    }

    if (!url.pathname.endsWith('/')) {
        url.pathname += '/';
    }

    return url;
};

const resolveDocsLinks = (description, docsBaseUrl) => description.replace(
    /\]\((?:<((?:\.\/)?docs\/[^>\s]+)>|((?:\.\/)?docs\/[^)\s]+))/g,
    (match, angledHref, href) => {
        const relativeUrl = angledHref || href;
        const absoluteUrl = new URL(relativeUrl, docsBaseUrl).toString();

        return match.replace(relativeUrl, absoluteUrl);
    }
);

const getCommitlogs = async (projectRoot, from, to) => {
    return new Promise((resolve, reject) => {
        git(projectRoot).raw(['log', '--first-parent', from + '..' + to, '--format=%B%x00'], function(err, result) {
            if (err) {
                reject(err);
            } else {
                resolve(result);
            }
        });
    });
};

const getLastReleaseTag = async (projectRoot) => {
    return new Promise((resolve, reject) => {
        git(projectRoot).tag(['-l', '--sort=v:refname'], (err, result) => {
            if (err) {
                reject(err);
            } else {
                let tags = result.trim().split(/\n/);
                resolve(tags.filter((tag) => tag.match(/^v?\d+.\d+.\d+$/)).pop());
            }
        });
    });
};

const orderByType = (scopes) => {
    const typeOrder = ['improved', 'improve', 'added', 'add', 'fixed', 'fix'];

    for (let scope in scopes) {
        scopes[scope].sort((a, b) => typeOrder.indexOf(a.type) - typeOrder.indexOf(b.type));
    }

    return scopes;
};

const parseCommitLogs = async (projectRoot, from, to) => {
    let logs = await getCommitlogs(projectRoot, from, to);

    let scopes = {};
    let length = 0;

    if (logs) {
        logs.split('\0').forEach((commit) => {
            if (!commit.trim() || hasNoChangelogTrailer(commit)) {
                return;
            }

            const entries = commit.match(/^([a-z]+(\([a-z]+\))?:){1}.+/mgi);

            entries && entries.forEach((log) => {
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

                    log = log.split(/:(.+)/);

                    scopes[scope].push({
                        type: log[0],
                        desc: log[1]
                    });
                }
            });
        });
    }


    return {
        scopes: orderByType(scopes),
        length: length
    };
};

const createMarkup = async (newVersion, logs, docsBaseUrl) => {
    let now = new Date;
    let timeString = now.getFullYear() + '-' + (now.getMonth() + 1) + '-' + now.getDate();
    let changelog = '';
    let text = '';

    if (logs.length) {
        let scopes = logs.scopes;

        changelog += '\n';

        for (let name in scopes) {
            scopes[name].reverse().forEach((log) => {
                const type = normalizeChangelogType(log.type);
                text = '* ' + type + ':' + resolveDocsLinks(log.desc, docsBaseUrl) + '\n' + text;
            });

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

const getProjectRoot = (options) => resolve(options.path || process.cwd());
const getPath = (filename, projectRoot) => join(projectRoot, filename);

const changelog = {

    parse: async (options) => {
        options = options || {};

        const projectRoot = getProjectRoot(options);
        const to = options.to || 'HEAD';
        const from = options.from || await getLastReleaseTag(projectRoot);

        return await parseCommitLogs(projectRoot, from, to);
    },

    getMarkup: async (options) => {
        options = options || {};
        const projectRoot = getProjectRoot(options);
        let logs = await changelog.parse(options);
        let version = options.version || require(getPath('package.json', projectRoot)).version;
        let docsBaseUrl = options.docsBaseUrl === undefined ? DEFAULT_DOCS_BASE_URL : options.docsBaseUrl;

        return await createMarkup(version, logs, normalizeDocsBaseUrl(docsBaseUrl));
    },

    update: async (options) => {
        options = options || {};
        const text = await changelog.getMarkup(options);
        const projectRoot = getProjectRoot(options);
        const path = getPath(options.filename || 'CHANGELOG.md', projectRoot);
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
