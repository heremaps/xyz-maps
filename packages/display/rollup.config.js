// rollup.config.js
import typescript from '@rollup/plugin-typescript';
import {uglify} from 'rollup-plugin-uglify';
import {terser} from 'rollup-plugin-terser';
import commonjs from 'rollup-plugin-commonjs';
import nodeResolve from '@rollup/plugin-node-resolve';
import {string} from 'rollup-plugin-string';
import virtual from '@rollup/plugin-virtual';

const fs = require('fs');
const pkg = require('./package.json');

const production = process.env.BUILD === 'production';

let sourcemap = true;
let module = pkg.name.split('-').pop();
let file = 'xyz-maps-' + module + '.js';

if (production) {
    sourcemap = false;
    file = file.replace('.js', '.min.js');
}

const banner = '/*\n * ' + pkg.name + '\n * (c) 2019 HERE\n */\n';
const logoSrc = process.env.logo || './assets/xyz.svg';

console.info('Use logo', logoSrc);

const createPlugins = (uglify) => {
    return [
        virtual({
            'ui-logo-src': `export default "data:image/svg+xml;base64,${fs.readFileSync(logoSrc, 'base64')}"`
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
