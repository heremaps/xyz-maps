import {afterAll, chai} from 'vitest';
import chaiAlmost from 'chai-almost';
// Karma ran all specs in one page, so a spec could rely on a chai-almost registration made by an earlier spec.
// editor_hooks_spec.ts and link_zlevels_spec.ts use .almost without registering the plugin themselves.
// Specs that call chai.use(chaiAlmost(tolerance)) still override this default.
chai.use(chaiAlmost());

// Lowers the mapviewchangeend trigger delay to speed up tests.
globalThis.__XYZTST_MVCEDelayMs = 10;

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
