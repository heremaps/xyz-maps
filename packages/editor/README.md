# XYZ Maps JS: Editor

[XYZ Maps](https://github.com/heremaps/xyz-maps) is an experimental and work in progress open-source map editor written in TypeScript/JavaScript.
The editor module provides an API for editing map data that can be used to easily access, add, remove and edit various types of map data.
Changes can be automatically synchronized with various remote backends services.

### Links
* [API Playground](https://heremaps.github.io/xyz-maps/playground/#Display-Pitch_and_Rotate_Map)
* [Documentation](https://heremaps.github.io/xyz-maps/docs/)

## Installation
Install XYZ Map Editor by using
```sh
# install using npm
npm install @here/xyz-maps-editor
```
or
```sh
# install using yarn
yarn add @here/xyz-maps-editor
```

## Example Usage:
Create a map editor
```ts
import MapDisplay from '@here/xyz-maps-display';
import {Editor} from '@here/xyz-maps-editor';

const map = new MapDisplay( display, {
    zoomLevel : 18,
    center: {
        longitude: 8.53422,
        latitude: 50.16212
    },
    // add layers to the display
    layers: layerSetup
});

const editor = new Editor( map, {
    // add the layers that should be edited
    layers: layerSetup
});
```

## Browser scripts and migration

Load common, core, display, then editor UMD bundles. All editor named runtime
exports are available flat under `here.xyz.maps.editor`, including `Editor`,
`Place`, `Navlink`, and `Feature`. Core's `here.xyz.maps.Feature` remains distinct.
In modules, use named imports (alias `Feature` when importing both packages).

The default editor object, `editor.features` wrappers, `PixelCoordinate`, and
`GeoCoordinate` are deprecated but retained. The wrappers are not aliases of
modern feature classes. Migrate `new here.xyz.maps.editor.features.Place(coords)`
to `editor.addFeature({type: 'Feature', properties: {featureClass: 'PLACE'},
geometry: {type: 'Point', coordinates: coords}}, layer)` with GeoJSON coordinate
arrays. Modern feature constructors are not coordinate-based public factories.
Use core `PixelPoint` for pixel positions and core `GeoPoint` for geographic map
positions instead of the legacy coordinate constructors.

## Start developing

1. Install node module dependencies
    ```
    pnpm install
    ```
    In case pnpm is not installed already: [install pnpm](https://pnpm.io/installation)

2. watch for source code changes and build dev version
    ```
    pnpm run watch-dev
    ```
    Builds are located in located in `./dist/`


## Other

* build dev version once `pnpm run build-dev` (located in packages/*/dist/)

* build release version only `pnpm run build-release` (minified...)


## License

Copyright (C) 2019-2026 HERE Europe B.V.

This project is licensed under the Apache License, Version 2.0 - see the [LICENSE](LICENSE) file for details
