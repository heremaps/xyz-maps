import {afterAll, beforeAll, describe, it} from 'vitest';
import chai from 'chai';
import chaiAlmost from 'chai-almost';
// @ts-ignore: provided by vitest/plugins.mts
import libs from 'virtual:xyz-libs';

// defined per project in vitest/projects.mts
declare const __XYZ_COMPONENT__: string;
declare const __XYZ_MAP__: 'none' | 'plain' | 'sized';

const g = <any>globalThis;

// The libraries are UMD builds. Run them as classic scripts in the same order as karma did.
// They set up the global namespace (here.xyz.maps...) that they use to find each other.
for (const lib of libs) {
    const script = document.createElement('script');
    script.textContent = lib.code + '\n//# sourceURL=' + lib.name;
    document.head.appendChild(script);
}
if (!g.here?.xyz?.maps?.common) {
    throw new Error('xyz-maps libraries are not available after loading them');
}

// Mocha names that the specs use and vitest does not define.
g.xit = it.skip;
g.xdescribe = describe.skip;
g.before = beforeAll;
g.after = afterAll;

// karma-chai provided a global chai 4. The specs call chai.expect and chai.use(chaiAlmost(tolerance)),
// so use the chai 4 of this package instead of the chai bundled with vitest.
g.chai = chai;
// karma-chai also provided the global chai assertion styles. A few specs use them without defining them
// (e.g. common/expressions_spec.ts, common/taskmanager_interrupt_spec.ts, display/stylegroup_line_spec.ts).
// This replaces the global expect of vitest, whose chaining syntax differs (.to.be...).
g.expect = chai.expect;
g.assert = chai.assert;
g.should = chai.should();

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
