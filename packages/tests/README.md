## XYZ Maps JS: Tests

The tests run in a real browser with [Vitest browser mode](https://vitest.dev/guide/browser/) and Playwright.
The specs are written with Mocha-style globals (`describe`, `it`, `before`, `after`, `xit`) and Chai.
`vitest/setup.ts` provides them.

### Build XYZ Maps JS

The tests run against the bundles in `packages/*/dist`. Build them first in the root directory:

* `pnpm run build-release` for the minified bundles (default)
* `pnpm run build-dev` for the bundles that are used with `--mode dev`

### Requirements

* Google Chrome is installed. It is used by default.
* To use Playwright's own browsers instead, run `pnpm exec playwright install chromium` (or `firefox`) and set `XYZ_BROWSER`.

### Start the tests

Under the root directory or in `packages/tests`:

```
pnpm run test
```

This runs `common`, `core`, `display` and `editor`. Each of them is a Vitest project.

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

* Do not use `done` callbacks or `this.timeout()`, Vitest does not support them. Return a promise or use `async`.
* A spec file must not import another spec file. Put shared helpers into `src/utils`.
* Vitest does not check types. Run `pnpm run typecheck` for that.
* The imports `utils`, `editorUtils`, `displayUtils`, `coreUtils`, `triggerEvents` and `TestProviders` refer to `src/utils` and `src/TestProvider.ts`, see `vitest/projects.mts`.
