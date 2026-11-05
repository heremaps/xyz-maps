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

import {createRequire} from 'node:module';
import image from 'rollup-plugin-img';

const require = createRequire(import.meta.url);
const pkg = require('./package.json');
const production = process.env.BUILD === 'production';

let sourcemap = true;

const module = pkg.name.split('-').pop();
let file = 'xyz-maps-' + module + '.js';

if (production) {
    sourcemap = false;
    file = file.replace('.js', '.min.js');
}

// "/*!" marks the banner as a legal comment, which the minifier keeps
const banner = '/*!\n * ' + pkg.name + '\n * (c) 2019-2022 HERE\n */\n';

const target = 'es2017';

const transform = {
    target: target,
    // same class field emit as tsc for target ES2017 (useDefineForClassFields: false)
    assumptions: {setPublicClassFields: true},
    typescript: {removeClassFieldsWithoutInitializer: true}
};

const minifyOptions = production ? {
    // the minifier defaults to esnext, keep its output at the same syntax level
    minify: {compress: {target: target, dropConsole: true}},
    // regular comments are always stripped when minifying, legal ones are kept
    comments: {legal: true, annotation: false, jsdoc: false}
} : {
    minify: false
};

const globals = {
    '@here/xyz-maps-display': 'here.xyz.maps',
    '@here/xyz-maps-core': 'here.xyz.maps',
    '@here/xyz-maps-common': 'here.xyz.maps.common'
};
const external = ['@here/xyz-maps-display', '@here/xyz-maps-core', '@here/xyz-maps-common'];

const createPlugins = () => [
    image()
];

const rolldownConfig = [{
    input: './src/index.ts',
    output: {
        file: 'dist/' + file,
        format: 'umd',
        name: 'here.xyz.maps.' + module,
        sourcemap: sourcemap,
        extend: false,
        exports: 'named',
        globals: globals,
        strict: true,
        banner: banner,
        ...minifyOptions
    },
    external: external,
    plugins: createPlugins(),
    transform: transform,
    treeshake: production
}];

if (production) {
    rolldownConfig.push({
        input: './src/index.ts',
        output: {
            file: 'dist/' + file.replace('.', '.esm.'),
            format: 'esm',
            sourcemap: sourcemap,
            extend: false,
            exports: 'named',
            globals: globals,
            strict: true,
            banner: banner,
            ...minifyOptions
        },
        external: external,
        plugins: createPlugins(),
        transform: transform,
        treeshake: production
    });
}

export default rolldownConfig;
