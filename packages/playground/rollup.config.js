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

import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import postcss from 'rollup-plugin-postcss';
import copy from 'rollup-plugin-copy';
import virtual from '@rollup/plugin-virtual';
import json from '@rollup/plugin-json';
import settings from './settings.json';
import {join} from 'path';
import {uglify} from 'rollup-plugin-uglify';
import buble from '@rollup/plugin-buble';
import del from 'rollup-plugin-delete';
import fs from 'fs';

const env = process.env;
const DEST = env['destination'] || settings.path.destination;
const SRC = env['resource'] || settings.path.resource;
const examplesdir = 'examples';

const exclude = env.exclude;
const production = env.BUILD == 'production';

const ts = (new Date()).getTime();
let credentialsPath = join(SRC, 'credentials.json');
let credential;

try {
    credential = JSON.parse(fs.readFileSync(credentialsPath));
} catch (e) {
    // throw Error(credentialsPath + ' not found! Please refer to README.md for details');
    throw Error(e);
}

credential = {
    'YOUR_APP_ID': credential.app_id,
    'YOUR_APP_CODE': credential.app_code,
    'YOUR_ACCESS_TOKEN': credential.access_token
};

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
settings.codeMirror.theme = env['theme'] || settings.codeMirror.theme;


if (exclude !== undefined) {
    let value = exclude.split('=');
    if (value.length == 1) {
        settings.exclude[value[0]] = true;
    } else if (value[1] == 'true' || value[1] == 'false') {
        settings.exclude[value[0]] = JSON.parse(value[1]);
    }
}

let exampleList = {};
let xyzmapsExampleList = JSON.parse(fs.readFileSync(examplesdir + '/xyzmaps.json', 'utf8'));

const dirs = fs.readdirSync(examplesdir);
dirs.forEach(dir=>{
    if(dir.indexOf('.') == -1) {
        const examples = fs.readdirSync(examplesdir + '/' + dir);
        if(examples) examples.forEach(example=>{
            const content = fs.readFileSync(examplesdir + '/' + dir + '/' + example, 'utf8');
            const title = content.match(/<title>(.*)<\/title>/)[1];
            exampleList['./' + dir + '/' + example] = title;
        })
    }
})

xyzmapsExampleList.forEach(comp=>{
    comp.samples.forEach(seclevsample=>{
        seclevsample.samples.forEach(example=>{
            example.title = example.title || exampleList[example.file].replace(/XYZ Maps Example: ?/, '');
        })
    })
})

export default {
    input: './src/main.js',
    output: {
        file: join(DEST, 'src/playground.js'),
        format: 'umd',
        name: 'pg',
        globals: {
            jquery: '$'
        }
    },
    plugins: [
        del({targets: DEST, force: true}),
        virtual({
            'utag': env['utag-path'] ? fs.readFileSync(env['utag-path'], 'utf8') : 'export default ()=>{}',
            'settings': 'export default' + JSON.stringify(settings),
            'credentials': 'export default' + JSON.stringify(credential),
            'exampleslist': 'export default ' + JSON.stringify(xyzmapsExampleList),
            'ts': 'export default ' + ts
        }),
        json(),
        resolve(),
        commonjs(),
        production && uglify(),
        postcss({
            inject: false
        }),
        buble(),
        copy({
            targets: [{
                src: 'examples', dest: DEST
            }, {
                src: 'static/index.html', dest: DEST, transform: (contents) => contents.toString().replace(/\$\{TIMESTAMP\}/g, ts)
            }, {
                src: join(SRC, 'assets'), dest: DEST
            }]
        })
    ],
    treeshake: production
};
