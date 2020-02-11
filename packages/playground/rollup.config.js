import resolve from '@rollup/plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
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

const exclude = env.exclude;
const production = env.BUILD == 'production';
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
            'credentials': 'export default' + JSON.stringify(credential)
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
                src: 'static/index.html', dest: DEST
            }, {
                src: join(SRC, 'assets'), dest: DEST
            }]
        })
    ],
    treeshake: production
};
