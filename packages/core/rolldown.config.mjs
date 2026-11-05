/*
 * Copyright (C) 2019-2026 HERE Europe B.V.
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
import virtual from '@rollup/plugin-virtual';
import {createPass2EntrySource, createPass2EntrySourceMapPlugin} from './build/pass2-entry.mjs';
import tsconfig from './tsconfig.json' with {type: 'json'};

const require = createRequire(import.meta.url);
const fs = require('fs');
const path = require('path');
const git = require('git-rev-sync');
const pkg = require('./package.json');
const production = process.env.BUILD === 'production';
const module = pkg.name.split('-').pop();
const file = `xyz-maps-${module}${production ? '.min' : ''}.js`;
const sourcemap = !production;

// "/*!" marks the banner as a legal comment, which the minifier keeps
const banner = `/*!\n * ${pkg.name}\n * (c) 2019-${new Date().getFullYear()} HERE\n */\n`;

const target = String(tsconfig.compilerOptions?.target || 'es2017').toLowerCase();

const transform = {
    target,
    // same class field emit as tsc for target ES2017 (useDefineForClassFields: false)
    assumptions: {setPublicClassFields: true},
    typescript: {removeClassFieldsWithoutInitializer: true}
};

const minifyOptions = production ? {
    // the minifier defaults to esnext, keep its output at the same syntax level
    minify: {compress: {target, dropConsole: true}},
    // regular comments are always stripped when minifying, legal ones are kept
    comments: {legal: true, annotation: false, jsdoc: false}
} : {
    minify: false
};

const globals = {
    '@here/xyz-maps-common': 'here.xyz.maps.common'
};
const external = ['@here/xyz-maps-common'];

const buildDir = path.resolve('build');

// Pass-1 output contract. The pass-2 entry generator consumes this contract;
// it does not define the chunk topology independently.
const pass1Chunks = Object.freeze({
    shared: 'shared.js',
    worker: 'workers.js',
    main: 'index.js'
});

// Reproduce the Rollup virtual 'buildInfo' module (version/revision/date).
let gitRevision;
try {
    gitRevision = git.short();
} catch (e) {
    // not a git checkout — leave revision undefined, like the Rollup build
}
const buildInfo = 'export default ' + JSON.stringify({
    version: pkg.version + (production ? '' : '+DEV'),
    revision: gitRevision,
    date: (new Date).toISOString().replace(/\.[0-9]{3}/, '')
});

// ---------------------------------------------------------------------------
// Two-pass inline-worker build.
//
// Pass 1 emits CJS chunks for the shared, worker, and main factories. The generated pass-2 entry combines them into
// the UMD and ESM bundles. `intro.js` initializes the shared factory, serializes the shared and worker factories
// into the inline-worker Blob, and runs the main factory. Shared code is emitted once.
const intro = fs.readFileSync(require.resolve('./build/intro.js'), 'utf8');
// Pass-2 entry generation is kept in a separate helper so this config only
// describes the two Rolldown passes. The helper validates that all pass-1
// chunks exist before assembling the generated entry.
const pass2EntryFileName = 'bundle.gen.js';
const pass2EntryFile = path.join(buildDir, pass2EntryFileName);
const pass2EsmEntryFileName = 'bundle.esm.gen.js';
const pass2EsmEntryFile = path.join(buildDir, pass2EsmEntryFileName);

const pass2Entries = [
    {file: pass2EntryFile, fileName: pass2EntryFileName, includeNamedExports: false},
    ...(production ? [{
        file: pass2EsmEntryFile,
        fileName: pass2EsmEntryFileName,
        includeNamedExports: true
    }] : [])
];

// Pass-1 plugin: assemble the pass-2 entries after the shared/workers/index chunks are written.
const writePass2EntryPlugin = () => ({
    name: 'core-write-pass2-entry',
    writeBundle: async (_options, bundle) => {
        const mainChunk = bundle[pass1Chunks.main];
        if (!mainChunk || mainChunk.type !== 'chunk' || !mainChunk.isEntry) {
            throw new Error(`Missing pass-1 entry metadata: ${pass1Chunks.main}`);
        }
        await Promise.all(pass2Entries.map(async ({file: entryFile, fileName, includeNamedExports}) => {
            const source = await createPass2EntrySource({
                buildDir,
                pass1Chunks,
                pass2EntryFileName: fileName,
                sourcemap,
                includeNamedExports,
                exportNames: mainChunk.exports
            });
            return fs.promises.writeFile(entryFile, source, 'utf8');
        }));
    }
});

const rolldownConfig = [{
    // Pass 1: compile TS entries into one shared CJS chunk + two entry chunks.
    input: ['./src/index.ts', './src/workers.ts'],
    output: {
        dir: 'build',
        format: 'cjs',
        exports: 'named',
        chunkFileNames: pass1Chunks.shared,
        entryFileNames: '[name].js',
        sourcemap: sourcemap ? 'inline' : false,
        globals,
        strict: true
    },
    external,
    plugins: [
        virtual({buildInfo: buildInfo}),
        writePass2EntryPlugin()
    ],
    transform,
    treeshake: production
}, {
    // Pass 2: concatenate the three pass-1 chunks (as capturable factories) and
    // emit the single UMD bundle, prepending the intro.js bootstrap.
    input: pass2EntryFile,
    plugins: sourcemap ? [createPass2EntrySourceMapPlugin(pass2EntryFile)] : [],
    output: {
        file: 'dist/' + file,
        format: 'umd',
        name: 'here.xyz.maps',
        extend: true,
        exports: 'default',
        sourcemap,
        globals,
        strict: true,
        banner,
        intro,
        ...minifyOptions
    },
    external,
    treeshake: false
}];

if (production) {
    rolldownConfig.push({
        // The ESM entry exposes the same static named exports as the pass-1 CommonJS main chunk.
        input: pass2EsmEntryFile,
        output: {
            file: 'dist/' + file.replace('.min.js', '.esm.min.js'),
            format: 'esm',
            exports: 'named',
            sourcemap: false,
            strict: true,
            banner,
            intro,
            ...minifyOptions
        },
        external,
        treeshake: false
    });
}

export default rolldownConfig;
