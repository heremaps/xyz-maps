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

## Start developing

1. Install node module dependencies
    ```
    yarn install
    ```
    In case yarn is not installed already: [install yarn](https://yarnpkg.com/en/docs/install)

2. watch for source code changes and build dev version
    ```
    yarn run watch-dev
    ```
    Builds are located in located in `./dist/`


## Other

* build dev version once `yarn run build-dev` (located in packages/*/dist/)

* build release version only `yarn run build-release` (minified...)


## License

Copyright (C) 2019-2021 HERE Europe B.V.

This project is licensed under the Apache License, Version 2.0 - see the [LICENSE](LICENSE) file for details
