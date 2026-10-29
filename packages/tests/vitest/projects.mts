import path from 'node:path';
import {playwright} from '@vitest/browser-playwright';
import {type Component, root, xyzAssets, xyzEnvironment, xyzGlobals, xyzLibs} from './plugins.mts';

const src = path.join(root, 'src');

// libs: bundles that are loaded for the component, in this order
// map: markup of the former statics/runner<component>.html that the specs rely on
const COMPONENTS: { [name in Component]: { libs: string[]; include: string[]; map: 'none' | 'plain' | 'sized' } } = {
    common: {
        libs: ['common'],
        include: ['specs/common/*/*.ts'],
        map: 'none'
    },
    core: {
        libs: ['common', 'core'],
        include: ['specs/core/get_cancel_tiles/*.ts', 'specs/core/layer/*.ts', 'specs/core/provider/*/*.ts'],
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
function browser() {
    const name = process.env.XYZ_BROWSER || 'chrome';
    if (name == 'firefox') return {provider: playwright(), instances: [{browser: <const>'firefox'}]};
    if (name == 'chromium') return {provider: playwright(), instances: [{browser: <const>'chromium'}]};
    if (name == 'chrome') {
        return {provider: playwright({launchOptions: {channel: 'chrome'}}), instances: [{browser: <const>'chromium'}]};
    }
    throw new Error(`Unknown XYZ_BROWSER "${name}". Use chrome, chromium or firefox.`);
}

export function project(component: Component) {
    const {libs, include, map} = COMPONENTS[component];

    return {
        plugins: [xyzLibs(libs), xyzGlobals(), xyzAssets(), xyzEnvironment(component)],
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
        optimizeDeps: {
            include: ['chai', 'chai-almost']
        },
        define: {
            __XYZ_COMPONENT__: JSON.stringify(component),
            __XYZ_MAP__: JSON.stringify(map)
        },
        test: {
            name: component,
            include,
            globals: true,
            setupFiles: [path.join(root, 'vitest/setup.ts')],
            // the timeout of the mocha settings in the former build.js
            testTimeout: 20000,
            hookTimeout: 20000,
            // one spec file after another. The specs drive a single map with simulated mouse events.
            fileParallelism: false,
            // karma: captureConsole false
            silent: true,
            browser: {
                enabled: true,
                headless: true,
                screenshotFailures: false,
                // karma used --window-size=1280,1024
                viewport: {width: 1280, height: 1024},
                ...browser()
            }
        }
    };
}
