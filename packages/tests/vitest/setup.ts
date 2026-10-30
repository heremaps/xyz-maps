import {afterAll} from 'vitest';
import './matchers';

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
