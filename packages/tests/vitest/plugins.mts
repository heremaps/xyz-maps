import fs from 'node:fs';
import path from 'node:path';
import type {Plugin} from 'vitest/config';
import type {LibraryBundle, LibraryComponent, Component} from './types.ts';

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

// The libraries are UMD builds that find each other through the global namespace.
const GLOBALS: { [pkg: string]: string } = {
    '@here/xyz-maps-common': 'here.xyz.maps.common',
    '@here/xyz-maps-core': 'here.xyz.maps',
    '@here/xyz-maps-display': 'here.xyz.maps',
    '@here/xyz-maps-editor': 'here.xyz.maps.editor'
};

const MIME: { [ext: string]: string } = {
    '.json': 'application/json',
    '.png': 'image/png',
    '.obj': 'text/plain',
    '.mtl': 'text/plain'
};

const LIBS_ID = 'virtual:xyz-libs';

/**
 * Provides the library bundles as strings. vitest/setup.ts runs them as classic scripts in the order of
 * the given components, so that they set up the global namespace themselves.
 *
 * dist 'dev' uses dist/xyz-maps-<name>.js instead of the minified dist/xyz-maps-<name>.min.js, see distOf().
 * XYZ_<NAME>_SRC=<path> uses a different file for a single component, e.g. XYZ_EDITOR_SRC=../editor/dist/xyz-maps-editor.js
 */
export function xyzLibs(components: LibraryComponent[], dist: Dist): Plugin {
    return {
        name: 'xyz-libs',
        enforce: 'pre',
        resolveId(id: string) {
            if (id === LIBS_ID) return '\0' + LIBS_ID;
        },
        load(id: string) {
            if (id !== '\0' + LIBS_ID) return;

            const libs: LibraryBundle[] = components.map((name) => {
                const custom = process.env[`XYZ_${name.toUpperCase()}_SRC`];
                const file = custom
                    ? path.resolve(process.cwd(), custom)
                    : path.join(root, '..', name, 'dist', `xyz-maps-${name}${dist == 'dev' ? '' : '.min'}.js`);

                if (!fs.existsSync(file)) {
                    throw new Error(`Cannot find "${file}". Build the packages first with "pnpm run build-release" (--mode dev: "pnpm run build-dev").`);
                }
                this.addWatchFile(file);

                // a sourceMappingURL comment would make the browser look for the map next to the page
                const code = fs.readFileSync(file, 'utf8').replace(/^\/\/# sourceMappingURL=.*$/gm, '');
                return {component: name, name: path.basename(file), code};
            });
            return `export default ${JSON.stringify(libs)};`;
        }
    };
}

/**
 * Rewrites `import {A} from '@here/xyz-maps-core'` of the specs and helpers of this package to
 * `const {A} = globalThis.here.xyz.maps`, which is what the UMD externals of the former rollup build did.
 */
export function xyzGlobals(): Plugin {
    return {
        name: 'xyz-globals',
        // after the typescript transform, so that imports that are only used as types are already gone
        enforce: 'post',
        transform(code: string, id: string) {
            const file = id.split('?')[0];
            if (!file.startsWith(root) || file.includes('/node_modules/') || !code.includes('@here/xyz-maps-')) return;

            const importRe = /import\s+([^;'"]*?)\s*from\s*['"](@here\/xyz-maps-[a-z]+)['"]\s*;?/g;
            const out = code.replace(importRe, (match: string, clause: string, pkg: string) => {
                const ns = GLOBALS[pkg];
                if (!ns) throw new Error(`xyz-globals: no global known for "${pkg}" in ${file}`);
                const source = `globalThis.${ns}`;
                const lines: string[] = [];
                const named = clause.match(/\{([^}]*)\}/);
                const star = clause.match(/\*\s*as\s+([\w$]+)/);
                const def = clause.replace(/\{[^}]*\}/, '').replace(/\*\s*as\s+[\w$]+/, '').replace(/,/g, '').trim();

                if (def) lines.push(`const ${def} = ${source};`);
                if (star) lines.push(`const ${star[1]} = ${source};`);
                if (named) {
                    const props = named[1].split(',').map((s) => s.trim()).filter(Boolean)
                        .map((s) => s.replace(/\s+as\s+/, ': '));
                    if (props.length) lines.push(`const {${props.join(', ')}} = ${source};`);
                }
                // keep the line count so that stack traces still point to the right line
                return lines.join(' ') + '\n'.repeat((match.match(/\n/g) || []).length);
            });

            if (/from\s*['"]@here\/xyz-maps-/.test(out) || /import\s*['"]@here\/xyz-maps-/.test(out)) {
                throw new Error(`xyz-globals: unhandled import of @here/xyz-maps-* in ${file}`);
            }
            return {code: out, map: null};
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
