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

import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {replacePlugin} from 'rolldown/plugins';
import {transform as transformCSS} from 'lightningcss';
import html from '@rollup/plugin-html';
import copy from 'rollup-plugin-copy';
import virtual from '@rollup/plugin-virtual';
import {dirname, join, resolve} from 'node:path';

const require = createRequire(import.meta.url);
const fs = require('node:fs');
const settings = require('./settings.json');
const pkg = require('./package.json');
const tsServicePath = require.resolve('typescript/lib/typescript.js');

const env = process.env;
const apiPath = env.API_PATH || env['api-path'];
const tokenPath = env.TOKEN_PATH || env['token-path'];
const DEST = env.destination || settings.path.destination;
const SRC = env.resource || settings.path.resource;
const examplesdir = 'examples';
const exclude = env.exclude;
const production = env.BUILD == 'production';
const ts = (new Date()).getTime();
const pathCfg = settings.path['xyz-maps'];

for (let module in pathCfg) {
    if (production) {
        pathCfg[module] = pathCfg[module].replace('.js', '.min.js');
    }

    let path = env[module + '-path'];
    if (!path && apiPath) {
        path = join(apiPath, pathCfg[module].split('/').pop());
    }
    if (path) {
        pathCfg[module] = path;
    }
}

settings.path.doc = env.DOC_PATH || env['doc-path'] || settings.path.doc;
settings.monaco.theme = env.theme || settings.monaco.theme;
settings.path.token = tokenPath || settings.path.token;

if (exclude !== undefined) {
    let value = exclude.split('=');
    if (value.length == 1) {
        settings.exclude[value[0]] = true;
    } else if (value[1] == 'true' || value[1] == 'false') {
        settings.exclude[value[0]] = JSON.parse(value[1]);
    }
}

let exampleList = JSON.parse(fs.readFileSync(examplesdir + '/examples.json', 'utf8'));

for (let section in exampleList) {
    exampleList[section].forEach((example) => {
        const html = fs.readFileSync(join(examplesdir, example.file), 'utf8');
        const htmlTitle = html.match(/<title>(.*)<\/title>/)[1];
        example.title = example.title || htmlTitle.replace(/XYZ Maps Example: ?/, '');
        example.section = section;
    });
}

// cleanup dist dir
if (fs.existsSync(DEST)) {
    fs.rmSync(DEST, {recursive: true});
}

// "/*!" marks the banner as a legal comment, which the minifier keeps
const banner = '/*!\n * ' + pkg.name + '\n * (c) 2019-2022 HERE\n */\n';
const target = 'es2017';
const transform = {
    target: target,
    jsx: 'react',
    // same class field emit as tsc for target ES2017 (useDefineForClassFields: false)
    assumptions: {setPublicClassFields: true},
    typescript: {removeClassFieldsWithoutInitializer: true}
};
const minify = {
    minify: {compress: {target: target, dropConsole: true}},
    // regular comments are always stripped when minifying, legal ones are kept
    comments: {legal: true, annotation: false, jsdoc: false}
};
const indexMinify = production ? minify : {minify: false};
const cssTargets = {
    chrome: 64 << 16,
    edge: 16 << 16,
    firefox: 57 << 16,
    safari: 11 << 16
};

const cssIdSuffix = '?playground-css';
const lightningCSSPlugin = () => ({
    name: 'lightningcss-runtime-inject',
    resolveId(source, importer) {
        if (source.startsWith('\0') || !/\.css$/i.test(source)) {
            return null;
        }
        const cssPath = resolve(importer ? dirname(importer) : '.', source);
        return cssPath + cssIdSuffix;
    },
    load(id) {
        const cssPath = id.endsWith(cssIdSuffix) ? id.slice(0, -cssIdSuffix.length) : null;
        if (!cssPath || !/\.css$/i.test(cssPath)) {
            return null;
        }

        const source = fs.readFileSync(cssPath, 'utf8');
        const result = transformCSS({
            filename: id,
            code: Buffer.from(source),
            bundle: false,
            sourceMap: false,
            minify: production,
            targets: cssTargets
        });
        const css = Buffer.from(result.code).toString('utf8');
        const marker = createHash('sha256').update(css).digest('hex').slice(0, 16);

        return `
const css = ${JSON.stringify(css)};
const marker = ${JSON.stringify(marker)};
const head = document.head || document.getElementsByTagName('head')[0];
if (head && !head.querySelector('[data-playground-css="' + marker + '"]')) {
    const style = document.createElement('style');
    style.setAttribute('data-playground-css', marker);
    head.appendChild(style);
    style.appendChild(document.createTextNode(css));
}
`;
    }
});

const createIndexPlugins = () => [
    replacePlugin({
        'process.env.NODE_ENV': JSON.stringify('production')
    }, {
        preventAssignment: true
    }),
    virtual({
        settings: 'export default' + JSON.stringify(settings),
        exampleslist: 'export default ' + JSON.stringify(exampleList),
        ts: 'export default ' + ts
    }),
    lightningCSSPlugin(),
    copy({
        targets: [{
            src: './examples', dest: DEST
        }, {
            src: join(SRC, 'assets'), dest: DEST
        }, {
            src: tsServicePath, dest: DEST
        }]
    }),
    html({
        fileName: 'index.html',
        title: 'XYZ Maps Playground',
        template: ({title}) => `
<!DOCTYPE html>
<html lang="en">
<link rel="icon" type="image/x-icon" href="./assets/icon/favicon.png">
<meta name="viewport" content="width=device-width, initial-scale=1.0, minimum-scale=1.0, user-scalable=no">
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  ${env['html-metadata'] || ''}
  <script src="${settings.path.token}"></script>
  <script src="./typescript.js"></script>
</head>
<body>
  <div id="app"></div>
  <script src="index.js"></script>
</body>
</html>
`
    })
];

const rolldownConfig = [{
    input: './src/index.tsx',
    output: {
        file: join(DEST, 'index.js'),
        format: 'umd',
        name: 'pg',
        sourcemap: true,
        strict: true,
        globals: {
            jquery: '$'
        },
        banner: banner,
        ...indexMinify
    },
    plugins: createIndexPlugins(),
    transform: transform,
    treeshake: production
}];

// do not create token.js if custom(remote) path is used
if (!tokenPath) {
    const credentialsPath = join(SRC, 'credentials.json');
    let credentials;

    try {
        credentials = JSON.parse(fs.readFileSync(credentialsPath));
    } catch (e) {
        throw Error(credentialsPath + ' not found! Please refer to README.md for details');
    }

    rolldownConfig.unshift({
        input: './src/token.ts',
        output: {
            file: join(DEST, 'token.js'),
            format: 'iife',
            strict: false,
            banner: banner,
            ...minify
        },
        plugins: [
            virtual({
                access_token: `export const TOKEN="${credentials.access_token}";
                export const APIKEY="${credentials.api_key}";`
            })
        ],
        transform: transform,
        treeshake: production
    });
}

export default rolldownConfig;
