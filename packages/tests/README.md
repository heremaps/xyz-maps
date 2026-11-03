## XYZ Maps JS: Tests

Browser tests run with [Vitest browser mode](https://vitest.dev/guide/browser/) and Playwright.
Pure synchronization, recording and matcher regressions run separately in Node, without a DOM.
Specs explicitly import test APIs from `vitest` (`describe`, `it`, `beforeAll`, `afterAll`, etc.).
Use `it.skip` or `describe.skip` for skipped tests. Test API globals are disabled.
Specs use native `expect` from `vitest`. Approximate comparisons use `toEqualWithTolerance` with
explicit absolute tolerances. Inclusive range checks use `toBeGreaterThanOrEqual` and
`toBeLessThanOrEqual`.
No Chai assertion globals are installed.
`vitest/setup.ts` registers the typed tolerance matcher; no Chai plugin or shared tolerance state is used.

### Build XYZ Maps JS

Browser tests run against the bundles in `packages/*/dist`. Build them first in the root directory:

* `pnpm run build-release` for the minified bundles (default)
* `pnpm run build-dev` for the bundles that are used with `--mode dev`

Package imports resolve explicitly to built artifacts, never TypeScript sources.
The component projects use UMD; Vite's dependency optimizer makes their CommonJS exports available as browser imports.
`core-esm` runs the Core specs against ESM release bundles; it is omitted with `--mode dev`.
The test harness neither injects library scripts nor rewrites imports to the libraries' global namespace.
Dependency optimization is refreshed on startup so rebuilt artifacts are not hidden by a stale cache.

### Requirements

* Google Chrome is installed for browser tests. It is used by default.
* To use Playwright's own browsers instead, run `pnpm exec playwright install chromium` (or `firefox`) and set `XYZ_BROWSER`.

### Start the tests

Under the root directory or in `packages/tests`:

```
pnpm run test
```

This runs the Node project `unit` and the browser projects `common`, `core`, `core-esm`, `display` and `editor`.

Run only the pure unit tests, without built bundles or an installed browser:

```
pnpm --filter @here/xyz-maps-test run test:unit
```

The dedicated unit config does not initialize browser projects. Selecting `--project unit` in
the main config still initializes the declared browser projects and therefore requires their bundles.

CI runs these projects with file parallelism and four workers. Manual workflow dispatch can select
a component and serial, four-worker or twelve-worker execution; selecting Core includes both UMD and ESM.
The default is all components with four workers.
Local runs also use file parallelism with at most four workers. Each file has an isolated browser
context; tests inside a file still run sequentially. Use `--no-file-parallelism --maxWorkers 1`
for a serial diagnostic run. Hub integration remains serial.

CI checks pure helpers before building the bundles. After the regular suite, it runs
`test:isolation`, shuffling files and tests only in the explicitly verified browser suites listed in
`vitest/isolated.mts`, plus all Node unit tests. The GitHub run ID is the reproducible shuffle seed.
No automatic test retries are enabled.

CI also runs `pnpm --filter @here/xyz-maps-test run lint` for specs, helpers and Vitest
configuration. Regular and isolation runs write separate JSON reports under `dist/vitest/`;
CI uploads available reports even when a test fails.

### Select tests

Everything after `pnpm run test` is passed to Vitest, see `vitest run --help`.

```
pnpm run test --project editor                  # a single component, can be repeated
pnpm run test --project core --project core-esm # Core against both release formats
pnpm run test --project editor specs/editor/navlink   # only spec files whose path contains the string
pnpm run test --project editor -t "drawing"     # only tests whose name matches
pnpm run test --mode dev                        # run against dist/xyz-maps-<name>.js instead of the minified bundles
pnpm run test --bail 1                          # stop after the first failure
pnpm run test --browser.headless=false          # show the browser
pnpm run watch                                  # rerun on changes (in packages/tests)
```

### Environment variables

| Variable | Default | Description |
|---|---|---|
| `XYZ_COMMON_SRC`, `XYZ_CORE_SRC`, `XYZ_DISPLAY_SRC`, `XYZ_EDITOR_SRC` | | Path of the bundle of a single component |
| `XYZ_BROWSER` | `chrome` | `chrome` (installed Google Chrome), `chromium` or `firefox` (Playwright browsers) |
| `XYZ_SOFTWARE_RENDERING` | | Set to `1` to force SwiftShader software rendering in Chrome or Chromium (not Firefox) |
| `XYZ_ENVIRONMENTS` | `./environments.json` | Path of the environments file |
| `XYZ_IMAGE_URL`, `XYZ_HUB_URL` | | Overwrite `image` and `xyzhub` of the environments file |
| `XYZ_CREDENTIALS` | `./credentials.json` | Path of the credentials file (integration tests only) |
| `XYZ_ACCESS_TOKEN` | | Overwrite `access_token` of the credentials file (integration tests only) |

Example: `XYZ_BROWSER=firefox pnpm run test --project display`

The specs load data from `assets/` through the path `/base/tests/assets/`.
Environment and credentials files must contain JSON objects. Missing optional files default to an empty object;
invalid JSON or other file errors are reported.

### Integration tests

The integration tests create spaces in an XYZ Hub and delete them afterwards. They are not part of `pnpm run test`.

Create `environments.json` in `packages/tests` with your settings:

```javascript
{
    "xyzhub": "YOUR_XYZHUB_ENDPOINT",
    "image": "{LOCALHOST}/base/tests/assets/tiles/{QUADKEY}.png"
}
```

Create `credentials.json` in `packages/tests` with your credentials. The file is ignored by git.

```javascript
{
    "access_token": "YOUR_ACCESS_TOKEN"
}
```

Run them with `pnpm run test:integration`.

### Write specs

Keep browser integration scenarios under `specs/{common,core,display,editor}`. Pure tests belong
under `specs/unit/<responsibility>/*.spec.ts`; do not import browser input, DOM fixtures or
library implementations into pure helper regressions. Real rendering, picking and native input
coverage stays in the browser projects.

Use `kebab-case.spec.ts` for local spec filenames and `kebab-case` for folders. Name a
scenario's JSON fixture after its spec, without `.spec` (for example,
`navlink-shape-insertion.spec.ts` and `navlink-shape-insertion.json`). Shared fixtures may
retain their own descriptive names.

Keep the component boundary and group specs by capability, such as `editor/history`,
`editor/navlink`, `display/viewport`, `display/styles` or `core/tile-requests/{provider,layer}`.
Prefer these focused folders over a catch-all `general` folder. Browser projects discover
`**/*.spec.ts` recursively; Hub integration keeps its existing layout and discovery rules.
Use `describe` for the capability or scenario and `it` for the expected behavior. Distinguish
related scenarios by their actual conditions instead of numbered filenames.

Shared support is organized by responsibility and available through the typed `@test/*` alias:

| Module | Responsibility |
|---|---|
| `@test/fixtures/map`, `@test/fixtures/editor` | Per-test Map/Editor and dataset ownership |
| `@test/synchronization/{editor,viewport,pointer}` | Readiness and deferred-event synchronization |
| `@test/input/{browser,editor}` | Native browser interactions and editor click events |
| `@test/assertions/{canvas,segments}` | Rendering and range-segment assertions |
| `@test/observers/recorders` | Event and observer recording |
| `@test/network/{MonitorXHR,editor}` | Request monitoring and submit/cleanup helpers |

The old `utils`, `editorUtils`, `displayUtils` and `triggerEvents` imports remain compatibility
entry points, including for unchanged Hub specs. Prefer the focused imports in new or restructured
specs. Keep simple features close to their scenarios; retain external JSON for complex shared geometry.

Independent cases must initialize their own mutable state in `beforeEach` or inside the test.
Do not make one test depend on a preceding test's selection, configuration, geometry or history.
An intentionally sequential edit/undo/redo workflow belongs in one named test, with assertions at
each meaningful phase. Keep independent cases separate; do not merge a suite just to hide a dependency.

Editor specs can use `createEditorFixture` from `@test/fixtures/editor` inside a test or `beforeEach`:

```typescript
const {preparedData, display, editor} = await createEditorFixture(
    dataset,
    {center: {longitude: 8.7, latitude: 50.1}, zoomlevel: 18},
    {featureSelectionByDefault: false}
);
```

It prepares fresh data, constructs the Map and Editor, and waits for editor readiness.
Cleanup is registered before construction and runs after the test, including failed setup/assertions:
Editor, Map, then prepared data. Do not construct it in `beforeAll` or replace its owned instances;
pass constructor options directly. Other resources and temporary global settings still need explicit
cleanup, preferably registered before an operation can fail.

`createMapFixture` provides the same Map/data ownership without constructing an Editor.
Immediately await `waitForViewportReady(display)` after creation when the scenario needs rendered data.

Verify newly independent cases both alone (`-t`) and in shuffled test order. Add verified browser
suites to `vitest/isolated.mts`; listed paths that no longer exist fail configuration rather than
silently dropping coverage.
Replay an isolation run locally with:

```
pnpm --filter @here/xyz-maps-test run test:isolation --sequence.seed 42
pnpm --filter @here/xyz-maps-test run test:isolation --mode dev --sequence.seed 42
```

Do not enable global shuffling until remaining legacy suites with shared workflows have been migrated.
Preserve numeric tolerances;
where useful, also assert invariants such as a fixed anchor, unchanged selection, restored geometry
or the identity of search results rather than only incidental counts.

Use the registered matcher for absolute numeric tolerances, including nested coordinates:

```typescript
expect(actual).toEqualWithTolerance(expected, 1e-7);
```

Use `expectCanvasPixelColor` from `utils` for exact canvas color assertions without repeating
the expected colors in a polling condition and a separate assertion:

```typescript
await expectCanvasPixelColor(container, [{x: 380, y: 280}, {x: 247, y: 327}], ['#9fe030', '#906fff']);
```

It accepts a single position or an array, and one shared color or a color per position.
It preserves `getCanvasPixelColor`'s initial delay and retry budget, reading all positions afresh
on each attempt. Failure reports the positions and the final actual/expected colors.
Both helpers reject empty position lists, missing canvases and unavailable rendering contexts.
Do not add an outer `expect.poll()` loop. Keep `getCanvasPixelColor` for raw samples or custom predicates.

The test `Listener` and `Observer` automatically detach through `onTestFinished`, including when a test fails.
Construct it inside a running test, not in `beforeAll` or at module scope. Keep explicit
`listener.stop()` calls at the intended end of event recording. Restore temporary settings in `finally`
so failed assertions cannot bypass their cleanup; preserve state transitions that intentionally connect
workflow tests.

The tolerance is explicit, finite and non-negative. Each numeric difference must be less than or equal
to it; non-numeric fields and structure use native equality with strict key checking. This is not
decimal precision like `toBeCloseTo`. The matcher does not change ordinary equality or configure
shared tolerance state.

`waitForViewportReady(display, layers?, action?)` waits for action completion, a settled
`mapviewchangeend` and a fresh `viewportReady` from every selected layer. A new
`mapviewchangestart` or `mapviewchange` invalidates the previous end and all earlier layer
readiness. The existing 10 ms end-event settling window is retained; it is not a rendering
completion substitute. A ten-second deadline reports the pending layer IDs and action/view
state. Action, registration and cleanup failures reject, and all subscriptions are removed
on settlement, including after partial registration.

Viewport readiness is not an animation-completion signal: a delayed animation frame may arrive
after a settled view-end event. For animated controls, await `expect.poll()` for the exact target
camera state inside the readiness action, then assert the final state. Do not substitute a fixed sleep.

`waitForEditorReady(editor, action?)` waits for both action completion and a fresh `ready=true`
notification. Signals received during the action count unless followed by `ready=false`; the
editor's initial ready state alone does not complete the wait. Action failures and editor errors
reject immediately. After ten seconds, missing readiness or an unfinished action rejects with
the observed state. Observers, error listeners and the timeout are removed on completion or failure.
After adding an editor layer, await `waitForEditorReady(editor, () => editor.addLayer(layer))`
before interacting with its features.

`editorClick(editor, x, y)` returns the original editor `pointerup` event after both that event and
the native browser click have completed. Browser-action failures propagate; a two-second deadline
covers both waits and the Playwright action. Completion or failure removes the editor listener and timer.

Use `userEvent.click` from `vitest/browser` for ordinary single clicks. Await every action,
including inside viewport/editor readiness callbacks, and preserve coordinates, buttons and modifiers.
Positions are relative to the map container; explicit `modifiers: ['Alt']` preserves the synthetic
helper's existing modifier. Use `button: 'right'` for secondary-button clicks.
The initial pilot specs also verify trusted native events. Hover-count specs finish selection
setup and wait for the Map's deferred `pointermove` when refreshing hover before recording
their measured movement sequence.
`dblclick` delegates to native `userEvent.dblClick`; `mousemove` uses native hover at both endpoints
and retains its existing 75 ms processing allowance. Positive hover transitions still need
`waitForPointerEvent`, since browser-action completion does not guarantee feature picking is finished.
For counted enter/leave sequences, use one `userEvent.hover` per destination and await the expected
pointer event. Replaying a helper's origin hover can re-hit-test newly highlighted geometry and
introduce an extra transition. Assert event targets as well as counts.

Coordinate drags and anchored wheel input use typed Vitest browser commands backed by Playwright:
the public drag-and-drop/wheel APIs do not cover the existing duration, secondary button and wheel anchor.
Drags retain their duration, interpolated positions, buttons and modifiers, and send their exact
endpoint once before releasing the button. Transformer scaling must not depend on repeated endpoints.
Wheel input retains its coordinate anchor, `-100 * d` pixel delta and 20 ms processing allowance;
the helper also waits for delivery of the native wheel event.
The low-level synthetic `click` helper and manually dispatched events are retained only for deliberate
failure/cancellation or deferred-event regressions, not ordinary interactions.
Hub integration specs remain unmodified and are not part of local validation.
The specs' TypeScript config loads Playwright's option types and maps `vitest/browser` to its
published declaration entry for compatibility with the existing `node` module resolution.

* Do not use `done` callbacks or `this.timeout()`, Vitest does not support them. Return a promise or use `async`.
* A spec file must not import another spec file. Put shared helpers into `src/utils`.
* Vitest does not check types. Run `pnpm run typecheck` for specs, helpers, browser setup and setup declarations
  (`tsconfig.json`), plus strict checking of Node-side plugins, projects, configs and performance-comparator
  specs (`tsconfig.vitest.json`).
* The imports `utils`, `editorUtils`, `displayUtils`, `coreUtils`, `triggerEvents` and `TestProviders` refer to `src/utils` and `src/TestProvider.ts`, see `vitest/projects.mts`.

## Buffer construction performance

The normal test suite also has a `buffers` Chromium project for internal lifecycle
and style-contract regressions (`pnpm test --project buffers`). It covers buffer-owned
batch keys/render configuration, builder delegation, exact grouping, material/debug draws,
terrain normal fallback and texture sharing. It imports display sources and loads GLSL
as strings; these tests and the benchmark use source-aware `tsconfig.performance.json`
because the published declaration bundles deliberately omit internal APIs.
The source loader also supplies the same default UI virtual modules as the Display build,
allowing real Map/render-path regressions without substituting UI or renderer implementations.

Build the packages first. From this package, run on an otherwise idle machine:

```sh
XYZ_BROWSER=chrome XYZ_SOFTWARE_RENDERING=0 XYZ_BENCH_OUTPUT=dist/performance/baseline.json pnpm test:performance
# Repeat with candidate.json after changing buffer construction.
node benchmarks/compare.mjs dist/performance/baseline.json dist/performance/candidate.json
```

The separate, single-worker Chromium suite imports internal display sources; common/core
dependencies still use built artifacts. It does not change public APIs or run in the normal
test suite. Use the same browser, rendering mode, build settings and machine for comparisons.
Reports record the commit, dirty state, runtime, browser, actual WebGL backend and raw samples; keep baseline reports
locally before refactoring. Run at least twice to establish noise rather than enforcing an
arbitrary CI percentage.
Local comparisons normally use the browser's default rendering backend.
Prefer installed Chrome for local GPU-backed runs; bundled Chromium can fall back to SwiftShader
even without explicit software-rendering flags. Check the actual WebGL renderer before interpreting GPU measurements.
`XYZ_SOFTWARE_RENDERING=1` explicitly forces SwiftShader for CI or controlled software-rendering
comparisons; use the same setting for baseline and candidate, and do not compare different backends.

The timed path starts before FeatureBufferBuildTask construction and includes init, every feature chunk,
style processing, geometry generation, and complete finalization/render-state setup.
Scheduler waits, fixture generation, initial renderer/asset setup, correctness checks and actual
drawing are excluded. Inline images and fonts are prepared before timing. The first complete
build remains alive until each case finishes, anchoring shared geometry and gradient resources;
subsequent builds still run the real construction and release paths. Required CPU-side GL calls
such as per-buffer glyph texture synchronization remain timed; no draws or GPU completion are
measured. Reported build/finalize times sum to total; regular renderer release is measured
separately. Models and terrain reuse inline source geometry, with shared instancing across two
material parts; terrain includes a synthetic 33x33 heightmap/mesh, not preview composition, FBO
rendering or TerrainTask texture generation. This is a warm-resource CPU benchmark, not a
first-load, picking or end-to-end rendering benchmark.

### Startup, retained heap and real rendering

```sh
XYZ_BROWSER=chrome XYZ_SOFTWARE_RENDERING=0 XYZ_BENCH_SUITE=runtime XYZ_BENCH_OUTPUT=dist/performance/runtime-baseline.json pnpm test:performance
# Repeat with runtime-candidate.json after the change.
node benchmarks/compare-runtime.mjs dist/performance/runtime-baseline.json dist/performance/runtime-candidate.json --allow-model-geometry-sharing
```

The opt-in `runtime-1` workload measures 64 fresh builder constructions and process-wide
V8 heap/backing storage after forced GC with those builders held and then released.
Renderer initialization, GC and texture-count probes are outside constructor timing.
The probe records fallback texture creation/deletion separately; it is not GPU memory accounting.

Four deterministic 256x256 Map scenes exercise 1024 points in one versus 32 batches,
1024 translucent polygons with eight outline styles, and 64 instances of a two-material model
whose parts reference the same geometry. Fixtures and resource waits are untimed.
Maps explicitly use `devicePixelRatio: 1`, so their drawing buffers remain 256x256
in both headless and headed runs, including Retina displays. To view the runtime suite,
append `--browser.headless=false` to `pnpm test:performance`; scenes are removed after each
measurement. Compare timings only within the same headless/headed mode.
The first upload records actual ARRAY_BUFFER/ELEMENT_ARRAY_BUFFER `bufferData`/`bufferSubData`
calls and bytes, excluding view UBOs and texture transfers. An untimed settled-frame replay
counts actual native draw calls, including stencil and extra pass draws. These are not stored
draw-command or renderer-statistics counts.

Each of 20 measured batches submits 16 real viewport frames, then drains the GPU with `gl.finish()`.
Reports distinguish CPU submission wall time from GPU-completed wall time per frame;
the latter includes submission and synchronization and is **not isolated GPU execution time**.
Spies, framebuffer readback and output checks are outside timing. Full-frame pixel fingerprints,
buffer/group counts and draw counts must remain identical before comparing performance.
Reports include the actual WebGL vendor/renderer/version, not just software-rendering flags.
Use multiple sequential control/candidate pairs on an idle machine. Small timings near the
browser timer resolution cannot establish a speedup; no CI timing threshold is imposed.
This does not measure network loading, frame pacing, all terrain passes, peak allocation or GPU memory.

`ModelResourceCache` owns parsing, prepared geometry/material resources and whole-model lifetime;
`ModelBufferFactory` only assembles material buffers and instances. Geometry attribute descriptors
are shared by source geometry identity **within a prepared model**, not by style identity or across
unrelated sources. Draw ranges, materials and index descriptors remain separate. Matrix/offset
references include every material buffer. Partial release/rebuild keeps the model cached until
its final buffer is released; deleted GPU attribute cache entries are evicted and marked for
reupload, and individual model textures can be restored from their retained source data.
Restoration retains the source image/data reference while a prepared model is alive, without
copying its pixels; this is a deliberate memory/lifetime tradeoff, not an allocation-free cache.
Fallback textures and the OBJ parser initialize lazily. Cache destruction releases unused
prepared textures and defers active fallback texture disposal until the last buffer release.

Polygon fill keys intentionally retain outline identity: merging equal-fill outline partitions
changes alpha compositing for overlapping translucent polygons at equal zIndex. The source-render
regression compares opaque/translucent output and verifies picking without changing the shader.

Shared resolved-style types live in `display/src/displays/webgl/buffer/BufferStyle.ts`, and
shared key encoders in `batchKey.ts`. Specialized buffers and their style/uniform contracts live in
`buffer/types/`; builders, factories and tile tasks in `buffer/factory/`; geometry generators and pure normal/wireframe
algorithms in `buffer/geometry/`. FlexArray and GeometryBufferBucket are shared infrastructure,
not specialized types. Program generics and `program/ProgramRegistry.ts` check buffer/program
contracts, with general buffers retained for synthetic image, sky and heatmap quads.
These type views do not allocate new runtime style objects or change shader data layouts.
`FeatureBufferBuilder.addFeature()` accumulates `BufferBatch` objects through
`FeatureBufferBuildTask`. The discriminated batch contracts in `factory/BufferBatch.ts` tie
each type to its specialized buffer (or model bucket) and resolved style; `batchesByZIndex`
contains `ZIndexBatches.batches`, not finalized draw commands. Polygon outlines pass resolved
stroke values without mutating/copying their source styles or reevaluating paint callbacks.
Empty model parts are excluded before acquiring attributes/textures, and a bucket is empty
only when all contained buffers are empty. Line projection/placement scratch arrays allocate
on demand, grow for both 2D/3D input, and retain reusable capacity across features/tiles.
The source suite checks frozen shared polygon styles, feature-dependent widths, failing
callbacks, empty material parts/resource release and complete projection beyond the former
fixed capacities. Startup scratch allocations are outside the warm benchmark's timed path.
Specialized buffers own their complete batch keys. Geometry identity is prepared at the original
resolution point to preserve lazy expression/model-ID assignment order; after resolving style values,
the builder prepares the common terrain/depth/opacity/zLayer state once per feature/style iteration and
routes scalar values to the relevant buffer's full-key method. Shared encoders cover only Point style,
Stroke/Fill, offsets or lighting; Line/Polygon do not traverse Point offset logic, and Icon/Model do not
traverse paint logic. Heatmap encodes its gradient once, and VerticalLine encodes its stroke once.
The full Point encoder lives with PointBuffer and is shared directly by Text; Point/Icon entry points
are function aliases rather than additional forwarding calls. Encoders can append the selected
geometry identity while writing the key, avoiding separate full-fragment composition.
Raw paint and lighting colors become immutable identity strings at their original resolution points:
later style callbacks can mutate previously read color arrays. Encoded lighting identities have an
opaque type so raw colors cannot accidentally enter the full-key methods.
Standard zero offsets require no separate offset component or Point offset bits; fractional and
packed offsets have explicit representation flags. There is no cross-feature style-identity cache
or per-feature style projection object.
The common state encoder retains one previous key, keyed only by its complete primitive flag word,
opacity and zLayer. It holds no style/feature references and rebuilds whenever any encoded input changes.
Offset units remain scalar inputs; an independently owned unit array is created only for a new batch,
alongside its shared style. GeometryBuffer keeps direct aliases for shared size and geometry functions,
without forwarding calls. The source project checks complete type-owned keys, alias identity,
normal winding/quantization and indexed/non-indexed wireframe behavior.

Workload 4 contains 38 deterministic, generated families and 78 size cases. The original 26
families and 54 size cases are: points, point-batches,
style-batches, circle-color-batches, circle-width-batches, circle-style-matrix, rectangles, lines, dashed-lines, dynamic-lines, lines-3d, polygons, polygon-outlines,
extrudes, text, icons, boxes, spheres, vertical-lines, heatmap, model, model-modes, clipped-models,
terrain, mesh-terrain and mixed. Most use 128/1024 features; spheres use 16/128, polygons add
16384 for 32-bit indices, and extrudes add 2048. Each case warms up for four batches, then records
twenty batches of eight fresh builds/releases. Twelve additional within-type style matrices cover
Rect, Line/DashedLine, Polygon, Extrude, Text, Icon, Box, Sphere, VerticalLine, Heatmap, Model and Terrain.
The sphere matrix uses 64/128 features. Each matrix independently duplicates its style objects and
asserts exact batch/buffer/draw-group counts. Per-feature Box dimensions, text/icon geometry and
model transforms deliberately merge. Per-style pointerEvents on Line, Icon, Model and Terrain
remain ignored, preserving current behavior rather than introducing a new feature.
Use `XYZ_BENCH_SCENARIO=matrices` for just the new cases, or `legacy` for the original workload-3
fixtures and metadata. Different workload/selector reports are not interchangeable.

The benchmark prints and records **batch groups, finalized render buffers and draw groups**,
including counts by batch/render type and zIndex. It asserts that identical styles merge and
relevant differences split: the point/style grouping cases create 32 batches, while a single model
batch creates two material-part buffers. Model debug modes also exercise additional draw groups.
The Circle-only cases construct 60 independent style objects at zIndex 0: 30 distinct fills or
stroke widths, each repeated in a second style object. Both must produce exactly 30 Circle
batches, buffers and draw groups. This checks within-type splitting and identity-independent merging,
rather than using zIndex or a different geometry type as a proxy.
The Circle matrix changes radius, fill, stroke, stroke width, opacity, each offset and its unit,
alignment, pointer events, altitude, depth test, altitude scale and zLayer independently.
Its 30 variants (again using 60 independent style objects) retain 26 batches: explicit default
boolean values and Circle rotation intentionally do not split the existing batches.
Draw groups are stored draw commands, **not actual GPU draw-call counts**; render passes,
visibility, previews and FBO composition can change the latter.

Output signatures check batch keys/order, attribute and index data, uniforms, texture/descriptor
sharing, render passes, clipping and draw commands outside timing. Unique backing-buffer bytes
describe result storage, not peak heap usage or allocation/GC counts. The comparator validates
all grouping statistics and output before printing before/after grouping counts, median timings
and p10..p90 ranges for total, build, finalize and release. A faster build with different grouping
is rejected, and a percentage below observed run-to-run variation is not evidence of a regression
or improvement.

Batch keys use bounded flag words and a range-checked signed 27-bit offset word for small integer
offsets. Fractional and out-of-range offsets remain lossless numeric strings; free string components
are length-prefixed. Presence bits omit defaults and empty fields without merging distinct values;
lighting flags distinguish equal values in different property slots. Flags use scalar constants so
source transpilation does not introduce runtime enum lookups.
Corrected cases include ambiguous Rect dimensions, offset overflow/fractions,
numeric/expression identities, opacity precision, fill intensity, lighting boundaries/slots,
dash-image suffixes and Sphere units.
Those corrections can legitimately split batches that previously combined incompatible values.
For an intentional key-encoding change only, pass `--allow-key-format-change` to the comparator.
This ignores raw key text, but still checks batch order/index assignment, complete buffer signatures
and every grouping statistic. It does not allow changed counts or altered output.
For intentional model geometry sharing, `--allow-model-geometry-sharing` permits only base
Model/Terrain geometry descriptor identity changes and nonincreasing unique backing-buffer bytes.
All key text/order, attribute/index content, uniforms, instance/debug sharing and grouping remain
checked. The runtime comparator permits nonincreasing model upload counts/bytes with this flag,
but still requires identical framebuffer fingerprints and actual draw counts. Leave the flag
off when no such ownership change is intended.

For isolated runs, set `XYZ_BENCH_SCENARIO` to any family above, such as `model-modes` or `terrain`. Increase
`XYZ_BENCH_WARMUP=32` to check whether short warm-up or workload order affects results;
the default full benchmark remains unchanged. Comparisons require matching warm-up counts
and scenario selection.

With Chromium, `XYZ_BENCH_PROFILE=1` additionally writes CPU `.cpuprofile` files
(100 microsecond sampling), sampled allocation `.heapprofile` files (including collected objects)
and GC/V8 `.trace.json` files beside the JSON report. Open them in Chrome DevTools Memory / Performance.
Scope CPU samples to Factory construction stacks to distinguish key costs from correctness checks,
release and profiler setup; inlined work may be attributed to its caller. Sampling and tracing
perturb execution: use separate **unprofiled** runs for timing comparisons. The comparator
rejects mixed profiled/unprofiled reports. The trace's `buffer-measure-start/end` marks
delimit measured batches; exclude profiler setup/teardown and forced GC outside these marks.
Heap measurements after forced GC separately record empty, 64 simultaneously held tiles,
and released state. These are process-wide V8 heap/backing-store diagnostics, not exact
per-buffer sizes, GPU memory or a proof of leak freedom.

An archived pre-refactor display source can be selected with
`XYZ_BENCH_DISPLAY_SOURCE=/absolute/path/to/packages/display/src` and identified using
`XYZ_BENCH_SOURCE_COMMIT=<sha>`. This redirects display-source imports only; Common/Core
artifacts and gl-matrix still come from the current workspace. Do not install dependencies
inside the archive. Use the same workspace dependencies for both sides. The archive must match
the benchmark's internal import paths; for an older folder layout, apply only mechanical
moves/import updates to the archive, keeping its original runtime implementation.
Preserve the archive's
`tsconfig.json` and `packages/display/tsconfig.json` alongside `packages/display/src`, with
their original relative paths: otherwise Vite can emit type-only class declarations as fields
and change inherited buffer initialization.
