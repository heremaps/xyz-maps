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

import commonjs from '@rollup/plugin-commonjs';
import nodeResolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import {terser} from 'rollup-plugin-terser';
import virtual from '@rollup/plugin-virtual';
import sourcemaps from 'rollup-plugin-sourcemaps';
import git from 'git-rev-sync';
import fs from 'fs';

const pkg = require('./package.json');

const production = process.env.BUILD === 'production';

let strict = true;
let sourcemap = true;

const module = pkg.name.split('-').pop();
let file = 'xyz-maps-' + module + '.js';


if (production) {
    strict = true;
    sourcemap = false;
    file = file.replace('.js', '.min.js');
}

const banner = '/*\n * ' + pkg.name + '\n * (c) 2019-2021 HERE\n */\n';

const createPlugins = () => {
    let gitRevision;
    try {
        gitRevision = git.short();
    } catch (e) {
    }

    return [
        nodeResolve(),
        commonjs(),
        typescript({
            typescript: require('typescript'),
            // only compileroptions are read from tsconfig.json
            include: ['src/**/*'],
            exclude: ['node_modules', 'dist']
        }),
        production ? terser({
            output: {
                comments: /\(c\)/
            },
            compress: {
                drop_console: true
            }
        }) : false,
        virtual({
            'buildInfo': 'export default ' + JSON.stringify({
                version: pkg.version + (production ? '' : '+DEV'),
                revision: gitRevision,
                date: (new Date).toISOString().replace(/\.[0-9]{3}/, '')
            })
        })
    ];
};


const intro = fs.readFileSync(require.resolve('./build/intro.js'), 'utf8');

const globals = {
    '@here/xyz-maps-common': 'here.xyz.maps.common'
};
const external = ['@here/xyz-maps-common'];

const rollupConfig = [{
    input: ['./src/index.ts', 'src/loaders/MVT/MVTWorker.ts'],
    output: {
        dir: 'build',
        format: 'amd',
        sourcemap: 'inline',
        globals: globals,
        exports: 'named',
        chunkFileNames: 'shared.js',
        strict: strict,
        indent: false
    },
    external: external,
    plugins: createPlugins(),
    treeshake: production
}, {
    input: 'build/bundle.js',
    output: {
        name: 'here.xyz.maps',
        extend: true,
        file: 'dist/' + file,
        format: 'umd',
        sourcemap: sourcemap,
        banner: banner,
        globals: globals,
        intro: intro
    },
    external: external,
    treeshake: false,
    plugins: [
        sourcemaps()
    ]
}];


export default rollupConfig;
