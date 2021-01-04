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

import typescript from '@rollup/plugin-typescript';
import {uglify} from 'rollup-plugin-uglify';
import {terser} from 'rollup-plugin-terser';
import commonjs from '@rollup/plugin-commonjs';
import nodeResolve from '@rollup/plugin-node-resolve';
import {string} from 'rollup-plugin-string';
import virtual from '@rollup/plugin-virtual';

const fs = require('fs');
const pkg = require('./package.json');

const production = process.env.BUILD === 'production';

let sourcemap = true;
let module = pkg.name.split('-').pop();
let file = 'xyz-maps-' + module + '.js';

const banner = '/*\n * ' + pkg.name + '\n * (c) 2019-2020 HERE\n */\n';
const logoSrc = process.env.logo || './assets/xyz.svg';
const cOwner = process.env.cOwner || 'XYZ';
const tacUrl = process.env.tacUrl || '';


if (production) {
    sourcemap = false;
    file = file.replace('.js', '.min.js');

    console.info(`Use logo: ${logoSrc} cOwner: ${cOwner}`);
}

const createPlugins = (uglify) => {
    return [
        virtual({
            'ui-logo-src': `export default "data:image/svg+xml;base64,${fs.readFileSync(logoSrc, 'base64')}"`,
            'ui-default-cOwner': `export default "${cOwner}"`,
            'ui-tac-url': `export default "${tacUrl}"`
        }),
        string({
            include: 'src/**/*.glsl'
        }),
        nodeResolve(),
        commonjs(),
        typescript({
            typescript: require('typescript'),
            // only compileroptions are read from tsconfig.json
            include: ['src/**/*'],
            exclude: ['node_modules', 'dist']
        }),
        production ? uglify({
            output: {
                comments: /\(c\)/
            },
            compress: {
                drop_console: true
            }
        }) : false
    ];
};

const rollupConfig = [{
    input: './src/index.ts',
    output: {
        file: 'dist/' + file,
        format: 'umd',
        name: 'here.xyz.maps.Map',
        sourcemap: sourcemap,
        extend: true,
        exports: 'named',
        globals: {
            '@here/xyz-maps-core': 'here.xyz.maps',
            '@here/xyz-maps-common': 'here.xyz.maps.common'
        },
        strict: true,
        banner: banner
    },
    external: ['@here/xyz-maps-core', '@here/xyz-maps-common'],
    plugins: createPlugins(uglify),
    treeshake: production
}];

if (production) {
    rollupConfig.push({
        input: './src/index.ts',
        output: {
            file: 'dist/' + file.replace('.', '.esm.'),
            format: 'esm',
            sourcemap: sourcemap,
            extend: true,
            exports: 'named',
            globals: {
                '@here/xyz-maps-core': 'here.xyz.maps',
                '@here/xyz-maps-common': 'here.xyz.maps.common'
            },
            strict: true,
            banner: banner
        },
        external: ['@here/xyz-maps-core', '@here/xyz-maps-common'],
        plugins: createPlugins(terser),
        treeshake: production
    });
}

export default rollupConfig;
