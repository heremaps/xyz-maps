import path from 'node:path';
import {playwright} from '@vitest/browser-playwright';
import type {UserWorkspaceConfig} from 'vitest/config';
import type {BrowserConfigOptions} from 'vitest/node';
import type {LibraryComponent, MapMarkup} from './types.ts';
import {type Component, distOf, root, xyzArtifacts, xyzAssets, xyzEnvironment} from './plugins.mts';
import {mapDrag, mapWheel} from './commands.mts';

const src = path.join(root, 'src');

// libs: UMD artifacts available to the project's module dependency graph
// map: markup of the former statics/runner<component>.html that the specs rely on
const COMPONENTS: Record<Component, {libs: LibraryComponent[]; include: string[]; map: MapMarkup}> = {
    common: {
        libs: ['common'],
        include: ['specs/common/*/*.ts'],
        map: 'none'
    },
    core: {
        libs: ['common', 'core'],
        include: ['specs/core/get_cancel_tiles/*.ts', 'specs/core/geometry/*.ts', 'specs/core/layer/*.ts', 'specs/core/provider/*/*.ts'],
        map: 'plain'
    },
    display: {
        libs: ['common', 'core', 'display'],
        include: ['specs/display/*/*.ts'],
        map: 'sized'
    },
    editor: {
        libs: ['common', 'core', 'display', 'editor'],
        include: ['specs/editor/*/*.ts'],
        map: 'sized'
    },
    integration: {
        libs: ['common', 'core', 'display', 'editor'],
        include: [
            'specs/integration/core/layer/*.ts',
            'specs/integration/core/provider/*/*.ts',
            'specs/integration/display/*/*.ts',
            'specs/integration/editor/*.ts'
        ],
        map: 'sized'
    }
};

// XYZ_BROWSER: chrome (default, the installed Google Chrome), chromium or firefox (see "playwright install")
function browser(): Pick<BrowserConfigOptions, 'provider' | 'instances'> {
    const name = process.env.XYZ_BROWSER || 'chrome';
    const softwareRendering = process.env.XYZ_SOFTWARE_RENDERING === '1';
    if (softwareRendering && name === 'firefox') {
        throw new Error('XYZ_SOFTWARE_RENDERING=1 requires XYZ_BROWSER=chrome or chromium.');
    }
    if (name == 'firefox') return {provider: playwright(), instances: [{browser: 'firefox'}]};
    if (name == 'chrome' || name == 'chromium') {
        return {
            provider: playwright({
                launchOptions: {
                    ...(name == 'chrome' ? {channel: 'chrome'} : {}),
                    ...(softwareRendering ? {
                        args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
                    } : {})
                }
            }),
            instances: [{browser: 'chromium'}]
        };
    }
    throw new Error(`Unknown XYZ_BROWSER "${name}". Use chrome, chromium or firefox.`);
}

// mode: the vitest mode, see distOf() in plugins.mts
export function project(component: Component, mode: string): UserWorkspaceConfig {
    const {libs, include, map} = COMPONENTS[component];

    return {
        plugins: [xyzArtifacts(libs, distOf(mode)), xyzAssets(), xyzEnvironment(component)],
        resolve: {
            alias: [
                // bare module names of the specs, same mapping as "paths" in tsconfig.json
                {find: /^utils$/, replacement: path.join(src, 'utils/utils.ts')},
                {find: /^editorUtils$/, replacement: path.join(src, 'utils/editorUtils.ts')},
                {find: /^displayUtils$/, replacement: path.join(src, 'utils/displayUtils.ts')},
                {find: /^coreUtils$/, replacement: path.join(src, 'utils/coreUtils.ts')},
                {find: /^triggerEvents$/, replacement: path.join(src, 'utils/triggerEvents.ts')},
                {find: /^TestProviders$/, replacement: path.join(src, 'TestProvider.ts')}
            ]
        },
        define: {
            __XYZ_COMPONENT__: JSON.stringify(component),
            __XYZ_MAP__: JSON.stringify(map)
        },
        test: {
            name: component,
            include,
            setupFiles: [path.join(root, 'vitest/setup.ts')],
            // the timeout of the mocha settings in the former build.js
            testTimeout: 20000,
            hookTimeout: 20000,
            // one spec file after another by default; the CLI can enable parallel browser specs.
            fileParallelism: false,
            browser: {
                enabled: true,
                headless: true,
                screenshotFailures: false,
                commands: {mapDrag, mapWheel},
                // karma used --window-size=1280,1024
                viewport: {width: 1280, height: 1024},
                ...browser()
            }
        }
    };
}
