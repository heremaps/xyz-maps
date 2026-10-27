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

const isChangelogNoneMarker = (line) => /^Changelog:\s*none\s*$/i.test(line.trim());

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
        git(projectRoot).raw(['log', '--first-parent', from + '..' + to, '--format=%H%x1f%B%x00'], function(err, result) {
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

const CHANGELOG_SCOPE_ORDER = ['editor', 'display', 'core', 'common', 'general'];

const orderByType = (scopes) => {
    const typeOrder = ['improved', 'improve', 'added', 'add', 'fixed', 'fix'];

    for (let scope in scopes) {
        scopes[scope].sort((a, b) => typeOrder.indexOf(a.type) - typeOrder.indexOf(b.type));
    }

    return scopes;
};

const orderByScope = (scopes) => {
    const orderedScopes = {};

    Object.keys(scopes).sort((a, b) => {
        const aName = a === NO_SCOPE ? 'general' : a.toLowerCase();
        const bName = b === NO_SCOPE ? 'general' : b.toLowerCase();
        const aIndex = CHANGELOG_SCOPE_ORDER.indexOf(aName);
        const bIndex = CHANGELOG_SCOPE_ORDER.indexOf(bName);
        const aOrder = aIndex === -1 ? CHANGELOG_SCOPE_ORDER.length : aIndex;
        const bOrder = bIndex === -1 ? CHANGELOG_SCOPE_ORDER.length : bIndex;

        return aOrder - bOrder || aName.localeCompare(bName) || a.localeCompare(b);
    }).forEach((scope) => {
        orderedScopes[scope] = scopes[scope];
    });

    return orderedScopes;
};

const parseCommitLogs = async (projectRoot, from, to) => {
    let logs = await getCommitlogs(projectRoot, from, to);

    let scopes = {};
    let length = 0;
    const excluded = [];

    if (logs) {
        logs.split('\0').forEach((record) => {
            const separator = record.indexOf('\x1f');
            if (separator === -1) {
                return;
            }

            const hash = record.slice(0, separator).trim();
            const commit = record.slice(separator + 1);

            if (!commit.trim()) {
                return;
            }

            let entries = [];
            commit.split(/\r?\n/).forEach((line) => {
                if (isChangelogNoneMarker(line)) {
                    entries.forEach((text) => excluded.push({hash, entry: text}));
                    entries = [];
                    return;
                }

                const entry = line.match(/^([a-z]+(\([a-z]+\))?:){1}.+/i);
                if (entry) {
                    entries.push(entry[0]);
                }
            });

            entries.forEach((log) => {
                if (log) {
                    const entry = log;

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
                        desc: log[1],
                        hash: hash,
                        entry: entry
                    });
                }
            });
        });
    }


    return {
        scopes: orderByScope(orderByType(scopes)),
        length: length,
        excluded: excluded
    };
};

const createMarkup = async (newVersion, logs, docsBaseUrl) => {
    let now = new Date;
    const pad = (value) => String(value).padStart(2, '0');
    let timeString = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate());
    let changelog = '';
    let text = '';

    if (logs.length) {
        let scopes = logs.scopes;

        changelog += '\n';

        for (let name of Object.keys(scopes)) {
            let section = '';

            scopes[name].forEach((log) => {
                const type = normalizeChangelogType(log.type);
                section += '* ' + type + ':' + resolveDocsLinks(log.desc, docsBaseUrl) + '\n';
            });

            if (logs.length > 1) {
                let heading = name == NO_SCOPE ? 'general' : name;
                section = '### ' + heading + '\n' + section;
            }

            text += section;
        }

        changelog = text + changelog;
        changelog = '## ' + newVersion + ' (' + timeString + ')\n' + changelog;

        return changelog;
    }
};

const formatReport = (logs) => {
    const lines = [];
    const addGroup = (title, items) => {
        lines.push('[changelog] ' + title + ' (' + items.length + '):');
        items.forEach(({hash, entry}) => lines.push('  ' + hash.slice(0, 9) + ' ' + entry));
    };

    addGroup('included', Object.values(logs.scopes).flat());
    addGroup('excluded by "Changelog: none"', logs.excluded);

    return lines.join('\n');
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

    report: async (options) => {
        options = options || {};
        const logs = await changelog.parse(options);

        console.log(formatReport(logs));
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
