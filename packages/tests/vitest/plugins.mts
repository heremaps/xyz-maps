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
import fs from 'node:fs';
import path from 'node:path';
import type {Plugin} from 'vitest/config';
import type {LibraryComponent, Component} from './types.ts';

export const root = path.resolve(import.meta.dirname, '..');
const assetsDir = path.join(root, 'assets');

export type {Component} from './types.ts';

export type Dist = 'min' | 'dev';

/**
 * Maps the vitest mode to the flavor of the library bundles.
 * The default mode "test" uses the minified bundles, `--mode dev` the dev bundles.
 */
export function distOf(mode: string): Dist {
    if (mode == 'test') return 'min';
    if (mode == 'dev') return 'dev';
    throw new Error(`Unknown mode "${mode}". Use "--mode dev" for the dev bundles or leave the mode out for the minified bundles.`);
}

const MIME: { [ext: string]: string } = {
    '.json': 'application/json',
    '.png': 'image/png',
    '.obj': 'text/plain',
    '.mtl': 'text/plain'
};

/**
 * Resolves package imports to the built UMD artifacts, never the ESM entry points or TypeScript sources.
 * Linked workspace packages need explicit dependency optimization for their CommonJS exports.
 */
export function xyzArtifacts(components: LibraryComponent[], dist: Dist): Plugin {
    const alias = components.map((name) => {
        const custom = process.env[`XYZ_${name.toUpperCase()}_SRC`];
        const file = custom
            ? path.resolve(process.cwd(), custom)
            : path.join(root, '..', name, 'dist', `xyz-maps-${name}${dist == 'dev' ? '' : '.min'}.js`);
        if (!fs.existsSync(file)) {
            throw new Error(`Cannot find "${file}". Build the packages first with "pnpm run build-release" (--mode dev: "pnpm run build-dev").`);
        }
        return {find: `@here/xyz-maps-${name}`, replacement: file};
    });
    return {
        name: 'xyz-artifacts',
        config() {
            return {
                resolve: {alias},
                optimizeDeps: {
                    include: alias.map(({find}) => find),
                    force: true
                }
            };
        }
    };
}

/**
 * Serves packages/tests/assets under /base/tests/assets/, the path karma used for them.
 * The spec data refers to it both as "base/tests/assets/..." and as "{LOCALHOST}/base/tests/assets/...".
 */
export function xyzAssets(): Plugin {
    return {
        name: 'xyz-assets',
        configureServer(server) {
            server.middlewares.use((req, res, next) => {
                const match = /\/base\/tests\/assets\/([^?#]*)/.exec(req.url || '');
                if (!match) return next();

                const file = path.join(assetsDir, decodeURIComponent(match[1]));
                if (!file.startsWith(assetsDir + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
                    res.statusCode = 404;
                    return res.end();
                }
                res.setHeader('Content-Type', MIME[path.extname(file)] || 'application/octet-stream');
                fs.createReadStream(file).pipe(res);
            });
        }
    };
}

function isJsonObject(data: unknown): data is Record<string, unknown> {
    return typeof data === 'object' && data !== null && !Array.isArray(data);
}

function readJson(file: string): Record<string, unknown> {
    try {
        const data: unknown = JSON.parse(fs.readFileSync(file, 'utf8'));
        if (!isJsonObject(data)) {
            throw new Error(`Expected a JSON object in "${file}".`);
        }
        return data;
    } catch (e: unknown) {
        if (e instanceof Error && 'code' in e && e.code == 'ENOENT') return {};
        throw e;
    }
}

/**
 * Provides the "environments" and "credentials" modules of src/utils.
 * Environments: environments.json (XYZ_ENVIRONMENTS=<path>), overridable with XYZ_HUB_URL and XYZ_IMAGE_URL.
 * Credentials: credentials.json (XYZ_CREDENTIALS=<path>) or XYZ_ACCESS_TOKEN. Only the integration tests get them.
 */
export function xyzEnvironment(component: Component): Plugin {
    const modules: { [id: string]: () => object } = {
        environments: () => {
            const environments = readJson(path.resolve(root, process.env.XYZ_ENVIRONMENTS || 'environments.json'));
            if (process.env.XYZ_HUB_URL) environments.xyzhub = process.env.XYZ_HUB_URL;
            if (process.env.XYZ_IMAGE_URL) environments.image = process.env.XYZ_IMAGE_URL;
            return environments;
        },
        credentials: () => {
            if (component != 'integration') return {};

            const credentials = readJson(path.resolve(root, process.env.XYZ_CREDENTIALS || 'credentials.json'));
            if (process.env.XYZ_ACCESS_TOKEN) credentials.access_token = process.env.XYZ_ACCESS_TOKEN;
            return credentials;
        }
    };

    return {
        name: 'xyz-environment',
        enforce: 'pre',
        resolveId(id: string) {
            if (modules[id]) return '\0virtual:' + id;
        },
        load(id: string) {
            const name = id.replace('\0virtual:', '');
            if (id.startsWith('\0virtual:') && modules[name]) {
                return `export default ${JSON.stringify(modules[name]())};`;
            }
        }
    };
}
