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

Package imports resolve explicitly to these UMD files, not ESM entry points or TypeScript sources.
Vite's dependency optimizer makes their CommonJS exports available as browser imports.
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

This runs the Node project `unit` and the browser projects `common`, `core`, `display` and `editor`.

Run only the pure unit tests, without built bundles or an installed browser:

```
pnpm --filter @here/xyz-maps-test run test:unit
```

The dedicated unit config does not initialize browser projects. Selecting `--project unit` in
the main config still initializes the declared browser projects and therefore requires their bundles.

CI runs these projects with file parallelism and four workers. Manual workflow dispatch can select
a component and serial, four-worker or twelve-worker execution; the default is all components with four workers.
Local runs also use file parallelism with at most four workers. Each file has an isolated browser
context; tests inside a file still run sequentially. Use `--no-file-parallelism --maxWorkers 1`
for a serial diagnostic run. Hub integration remains serial.

CI checks pure helpers before building the bundles. After the regular suite, it runs
`test:isolation`, shuffling files and tests only in the explicitly verified browser suites listed in
`vitest/isolated.mts`, plus all Node unit tests. The GitHub run ID is the reproducible shuffle seed.
No automatic test retries are enabled.

### Select tests

Everything after `pnpm run test` is passed to Vitest, see `vitest run --help`.

```
pnpm run test --project editor                  # a single component, can be repeated
pnpm run test --project editor specs/editor/link   # only spec files whose path contains the string
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

`waitForEditorReady(editor, action?)` waits for both action completion and a fresh `ready=true`
notification. Signals received during the action count unless followed by `ready=false`; the
editor's initial ready state alone does not complete the wait. Action failures and editor errors
reject immediately. After ten seconds, missing readiness or an unfinished action rejects with
the observed state. Observers, error listeners and the timeout are removed on completion or failure.

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
  (`tsconfig.json`), plus strict checking of Node-side plugins, projects and both Vitest configs (`tsconfig.vitest.json`).
* The imports `utils`, `editorUtils`, `displayUtils`, `coreUtils`, `triggerEvents` and `TestProviders` refer to `src/utils` and `src/TestProvider.ts`, see `vitest/projects.mts`.
