## XYZ Maps JS: Tests

The tests run in a real browser with [Vitest browser mode](https://vitest.dev/guide/browser/) and Playwright.
Specs explicitly import test APIs from `vitest` (`describe`, `it`, `beforeAll`, `afterAll`, etc.).
Use `it.skip` or `describe.skip` for skipped tests. Test API globals are disabled.
Specs use native `expect` from `vitest`. Approximate comparisons use `toEqualWithTolerance` with
explicit absolute tolerances. Inclusive range checks use `toBeGreaterThanOrEqual` and
`toBeLessThanOrEqual`.
No Chai assertion globals are installed.
`vitest/setup.ts` registers the typed tolerance matcher; no Chai plugin or shared tolerance state is used.

### Build XYZ Maps JS

The tests run against the bundles in `packages/*/dist`. Build them first in the root directory:

* `pnpm run build-release` for the minified bundles (default)
* `pnpm run build-dev` for the bundles that are used with `--mode dev`

Package imports resolve explicitly to these UMD files, not ESM entry points or TypeScript sources.
Vite's dependency optimizer makes their CommonJS exports available as browser imports.
The test harness neither injects library scripts nor rewrites imports to the libraries' global namespace.
Dependency optimization is refreshed on startup so rebuilt artifacts are not hidden by a stale cache.

### Requirements

* Google Chrome is installed. It is used by default.
* To use Playwright's own browsers instead, run `pnpm exec playwright install chromium` (or `firefox`) and set `XYZ_BROWSER`.

### Start the tests

Under the root directory or in `packages/tests`:

```
pnpm run test
```

This runs `common`, `core`, `display` and `editor`. Each of them is a Vitest project.

CI runs these projects with file parallelism and four workers. Manual workflow dispatch can select
a component and serial, four-worker or twelve-worker execution; the default is all components with four workers.
Local runs remain serial unless overridden with `--fileParallelism --maxWorkers 4`.

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

Use the registered matcher for absolute numeric tolerances, including nested coordinates:

```typescript
expect(actual).toEqualWithTolerance(expected, 1e-7);
```

The tolerance is explicit, finite and non-negative. Each numeric difference must be less than or equal
to it; non-numeric fields and structure use native equality with strict key checking. This is not
decimal precision like `toBeCloseTo`. The matcher does not change ordinary equality or configure
shared tolerance state.

* Do not use `done` callbacks or `this.timeout()`, Vitest does not support them. Return a promise or use `async`.
* A spec file must not import another spec file. Put shared helpers into `src/utils`.
* Vitest does not check types. Run `pnpm run typecheck` for specs, helpers, browser setup and setup declarations
  (`tsconfig.json`), plus strict checking of Node-side plugins, projects and both Vitest configs (`tsconfig.vitest.json`).
* The imports `utils`, `editorUtils`, `displayUtils`, `coreUtils`, `triggerEvents` and `TestProviders` refer to `src/utils` and `src/TestProvider.ts`, see `vitest/projects.mts`.
