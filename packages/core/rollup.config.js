// rollup.config.js

import commonjs from 'rollup-plugin-commonjs';
import nodeResolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import {uglify} from 'rollup-plugin-uglify';
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

const banner = '/*\n * ' + pkg.name + '\n * (@c) 2019 HERE\n */\n';

const createPlugins = (uglify) => {
    return [
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
        }) : false,
        virtual({
            'buildInfo': 'export default ' + JSON.stringify({
                version: pkg.version + (production ? '':'+DEV' ),
                revision: git.short(),
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
    plugins: createPlugins(uglify),
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

if (production) {
    rollupConfig.push({
        input: 'build/bundle.js',
        output: {
            name: 'here.xyz.maps',
            extend: true,
            file: 'dist/' + file.replace('.', '.esm.'),
            format: 'esm',
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
    });
}

export default rollupConfig;
