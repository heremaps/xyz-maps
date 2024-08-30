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
import replace from '@rollup/plugin-replace';
import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import html from '@rollup/plugin-html';
import postcss from 'rollup-plugin-postcss';
import copy from 'rollup-plugin-copy';
import virtual from '@rollup/plugin-virtual';
import json from '@rollup/plugin-json';
import settings from './settings.json';
import {join} from 'path';
import terser from '@rollup/plugin-terser';
import fs from 'fs';
import nodeResolve from 'resolve';
const tsServicePath = nodeResolve.sync('typescript/lib/typescriptServices.js');

const env = process.env;
const DEST = env['destination'] || settings.path.destination;
const SRC = env['resource'] || settings.path.resource;
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
    if (!path && env['api-path']) {
        path = join(env['api-path'], pathCfg[module].split('/').pop());
    }
    if (path) {
        pathCfg[module] = path;
    }
}

settings.path.doc = env['doc-path'] || settings.path.doc;
settings.monaco.theme = env['theme'] || settings.monaco.theme;
settings.path.token = env['token-path'] || settings.path.token;

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
    fs.rmdirSync(DEST, {recursive: true});
}

const rollupConfig = [{
    input: './src/index.tsx',
    output: {
        file: join(DEST, 'index.js'),
        format: 'umd',
        name: 'pg',
        sourcemap: true,
        globals: {
            jquery: '$'
        }
    },
    plugins: [
        replace({
            'process.env.NODE_ENV': JSON.stringify('production')
        }),
        virtual({
            'settings': 'export default' + JSON.stringify(settings),
            'exampleslist': 'export default ' + JSON.stringify(exampleList),
            'ts': 'export default ' + ts
        }),
        json(),
        resolve(),
        commonjs(),
        postcss({
            inject: true,
            minimize: production
        }),
        typescript(),
        production && terser(),
        copy({
            targets: [{
                src: './examples', dest: DEST
            }, {
                src: join(SRC, 'assets'), dest: DEST
            }, {
                src: join(tsServicePath), dest: DEST
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
  <script src="./typescriptServices.js"></script>
</head>
<body>
  <div id="app"></div>
  <script src="index.js"></script>
</body>
</html>
`
        })
    ],
    treeshake: production
}];

// do not create token.js if custom(remote) path is used
if (!env['token-path']) {
    let credentialsPath = join(SRC, 'credentials.json');
    let credentials;

    try {
        credentials = JSON.parse(fs.readFileSync(credentialsPath));
    } catch (e) {
        throw Error(credentialsPath + ' not found! Please refer to README.md for details');
        // throw Error(e);
    }

    rollupConfig.unshift({
        input: './src/token.ts',
        output: {
            file: join(DEST, 'token.js'),
            format: 'iife',
            strict: false
        },
        plugins: [
            virtual({
                'access_token': `export const TOKEN="${credentials.access_token}";
                export const APIKEY="${credentials.api_key}";`
            }),
            typescript(),
            terser()
        ],
        treeshake: production
    });
}

export default rollupConfig;
