import {afterAll, chai} from 'vitest';
import chaiAlmost from 'chai-almost';
// @ts-ignore: provided by vitest/plugins.mts
import libs from 'virtual:xyz-libs';

// defined per project in vitest/projects.mts
declare const __XYZ_COMPONENT__: string;
declare const __XYZ_MAP__: 'none' | 'plain' | 'sized';

const g = <any>globalThis;

const libraryChecks: Record<string, () => boolean> = {
    common: () => typeof g.here?.xyz?.maps?.common?.JSUtils?.extend === 'function',
    core: () => typeof g.here?.xyz?.maps?.TileLayer === 'function',
    display: () => typeof g.here?.xyz?.maps?.Map === 'function',
    editor: () => typeof g.here?.xyz?.maps?.editor?.Editor === 'function'
};

// The libraries are UMD builds. Run them as classic scripts in the same order as karma did.
// They set up the global namespace (here.xyz.maps...) that they use to find each other.
for (const lib of libs) {
    const check = libraryChecks[lib.component];
    if (!check) throw new Error(`Unknown xyz-maps component "${lib.component}" in "${lib.name}"`);

    const script = document.createElement('script');
    script.textContent = lib.code + '\n//# sourceURL=' + lib.name;
    const errors: ErrorEvent[] = [];
    const onError = (event: ErrorEvent) => errors.push(event);
    // Exceptions in classic scripts fire window errors rather than escaping appendChild().
    window.addEventListener('error', onError);
    try {
        document.head.appendChild(script);
    } finally {
        window.removeEventListener('error', onError);
    }
    if (errors.length) {
        const details = errors.map((event) => `${event.message} (${event.filename}:${event.lineno}:${event.colno})`);
        throw new Error(`Failed to load xyz-maps bundle "${lib.name}":\n${details.join('\n')}`);
    }
    if (!check()) {
        throw new Error(`xyz-maps bundle "${lib.name}" did not initialize the expected "${lib.component}" API`);
    }
}

// Karma ran all specs in one page, so a spec could rely on a chai-almost registration made by an earlier spec.
// editor_hooks_spec.ts and link_zlevels_spec.ts use .almost without registering the plugin themselves.
// Specs that call chai.use(chaiAlmost(tolerance)) still override this default.
chai.use(chaiAlmost());

// Lowers the mapviewchangeend trigger delay to speed up tests.
g.__XYZTST_MVCEDelayMs = 10;

// Markup of the former statics/runner<component>.html. The specs and src/utils/triggerEvents.ts rely on #map.
if (__XYZ_MAP__ != 'none' && !document.getElementById('map')) {
    if (__XYZ_MAP__ == 'sized') {
        // a stylesheet rule and not an inline style, because specs validate that the container has no inline style
        const style = document.createElement('style');
        style.textContent = '#map { position: absolute; width: 800px; height: 600px; left: 50px; top: 50px; }';
        document.head.appendChild(style);
    }
    const map = document.createElement('div');
    map.id = 'map';
    document.body.appendChild(map);
}

// The integration tests create spaces in the XYZ Hub. Delete them when the spec file is done.
if (__XYZ_COMPONENT__ == 'integration') {
    afterAll(async () => {
        const {spacePool} = await import('../src/utils/spacePool');
        await new Promise<void>((resolve) => spacePool.clear(resolve));
    });
}
