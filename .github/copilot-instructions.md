# XYZ Maps — Copilot Instructions

## Repository Overview

XYZ Maps is a TypeScript/JavaScript open-source map editor and rendering library by HERE Europe. It is a **Yarn workspaces monorepo** managed with **Lerna**.

### Package dependency order (build/understand bottom-up)

```
@here/xyz-maps-common   ← utility classes, geometry, expressions, task scheduler
       ↓
@here/xyz-maps-core     ← providers, tile layers, style definitions, GeoJSON features
       ↓
@here/xyz-maps-display  ← WebGL/Canvas map renderer (Map class, GLRender, GLSL shaders)
       ↓
@here/xyz-maps-editor   ← map editing API (Editor class, editable features, drawing tools)
```

`@here/xyz-maps-test` (in `packages/tests/`) is the test-only package, not published.

## Build, Test & Lint Commands

```bash
# Install dependencies
yarn install

# Dev build (all packages, with sourcemaps)
yarn run build-dev

# Watch mode (rebuilds on change)
yarn run watch-dev

# Production/release build (minified, no sourcemaps)
yarn run build-release

# Run all tests (requires credentials.json + environments.json in packages/tests/)
yarn run test

# Run tests for a single component, optionally filtered by string
yarn run test -- --editor=true
yarn run test -- --editor="drawing"      # filter by spec name substring
yarn run test -- --core=true --browser=ChromeHeadless --singleRun=true

# Lint and auto-fix
yarn run eslint:fix

# Debug server (http://localhost:8080/debug)
yarn run server

# Playground server (http://localhost:8081/packages/playground/dist)
yarn run playground

# Build API docs
yarn run build-doc
```

### Per-package scripts (run from package directory or via lerna --scope)

Each package has its own `rollup.config.js` and supports:
- `yarn run build-dev` / `yarn run watch-dev` / `yarn run build-release`
- `yarn run build-dts` — generates `.d.ts` declaration bundles

## Architecture

### Build pipeline

Each package uses a **two-pass Rollup build**:
1. **Pass 1 (AMD, inline sourcemaps)** — TypeScript → AMD modules into `build/`
2. **Pass 2 (UMD)** — AMD bundle in `build/` → single UMD file in `dist/`

The `BUILD` env var controls mode: `BUILD=production` minifies and drops `console.*` calls; dev builds include sourcemaps and append `+DEV` to the version string.

The global namespace for all packages is `here.xyz.maps` (UMD export name). Webpack users must access this namespace explicitly (see comment in `packages/display/src/index.ts`).

### Core package (`packages/core/src/`)

- **`providers/`** — data source abstraction. Hierarchy: `TileProvider` → `FeatureProvider` → `GeoJSONProvider` / `RemoteTileProvider` / `HTTPProvider` / `SpaceProvider` / `IMLProvider`. Providers store features in an R-tree (`RTree`, backed by rbush).
- **`layers/`** — `TileLayer`, `MVTLayer`, `CustomLayer`. Layers connect providers to the display.
- **`styles/`** — Per-geometry style interfaces (`LineStyle`, `PolygonStyle`, `CircleStyle`, etc.) and `LayerStyle`/`XYZLayerStyle` containers.
- **`tile/`** — `Tile` class representing a WebMercator 256×256 tile; identified by quadkey.
- **`workers.ts`** — worker entry point (bundled separately as AMD, loaded at runtime).

### Display package (`packages/display/src/`)

- **`Map.ts`** — primary public class, manages camera, layers, event dispatching.
- **`displays/webgl/`** — WebGL rendering engine:
  - `GLRender.ts` — main render loop and draw calls
  - `program/` — one `Program.ts` subclass per geometry type (Line, Polygon, Circle, Icon, Text, …)
  - `glsl/` — GLSL shaders (vertex + fragment per style type); processed by `rollup-plugin-glslify`
  - `buffer/` — typed-array geometry buffer factories per style type
  - `Atlas.ts`, `IconAtlas.ts`, `GlyphTexture.ts` — texture atlas management
- **`displays/canvas/`** — 2D canvas fallback renderer
- **`behavior/`** — pan, zoom, rotate gesture handling

### Editor package (`packages/editor/src/`)

- **`API/Editor.ts`** — primary public class.
- **`features/`** — editable feature types: `Navlink`, `Line`, `Area`, `Marker`, `Place`, `Address`. Each has associated `*Shape` point handles and geometry tools in `oTools.ts`.
- **`tools/`** — drawing board, transform handles, range selector.
- **`map/`** — editor overlay layer, hooks into the display's event system.

### Common package (`packages/common/src/`)

Provides: `JSUtils`, `LRU`, `TaskManager`/`Task`/`TaskSequence`, `Pool`, `geometry`, `geotools`, `AStar`, `Expressions/` (a mini expression DSL used in style definitions).

## Key Conventions

### Commit messages
Follow **Conventional Commits** (e.g., `feat:`, `fix:`, `chore:`). Every commit must include a **DCO sign-off**:
```
git commit -s -m "fix: correct tile bounds calculation"
```

### TypeScript
- `target: ES2015`, `moduleResolution: node`
- Root `tsconfig.json` uses TypeScript project references; each package has its own `tsconfig.json`
- Cross-package imports resolve via `paths` alias `@here/xyz-maps-*` → `packages/*/src`

### ESLint
Config extends `eslint-config-google`. Key active rules:
- 4-space indentation
- No trailing commas (`comma-dangle: error`)
- `var` is allowed (`no-var: 0`)
- `prefer-const` is off

Lint runs automatically on staged files via Husky + lint-staged.

### Tests
- Tests live in `packages/tests/specs/{common,core,display,editor,integration}/`
- Framework: **Karma + Mocha + Chai** (including `chai-almost` for float comparisons)
- Tests run **in-browser** (Chrome by default); requires:
  - `packages/tests/environments.json` — XYZ Hub endpoint and tile image server URL
  - `packages/tests/credentials.json` — access token
- Build release artifacts before testing: `yarn run build-release`

### Style definitions
Style values can be **static** or **expression-based** (using the `Expressions` DSL from `@here/xyz-maps-common`). Expression objects are evaluated at render time against feature properties and zoom level — do not assume style property values are always primitive types.

### GLSL shaders
Shaders in `packages/display/src/displays/webgl/glsl/` are imported as strings via `rollup-plugin-glslify`. Edits to `.glsl` files require a rebuild.
