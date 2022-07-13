# XYZ Maps JS: Display

[XYZ Maps](https://github.com/heremaps/xyz-maps) is an experimental and work in progress open-source map editor written in TypeScript/JavaScript.
The display module of [XYZ Maps](https://github.com/heremaps/xyz-maps) is a highly customizable vector map display that's optimized for map
editing, larger raw datasets and frequently changing data.

### Links
* [API Playground](https://heremaps.github.io/xyz-maps/playground/#Display-Pitch_and_Rotate_Map)
* [Documentation](https://heremaps.github.io/xyz-maps/docs/)

## Installation
Install XYZ Map Display by using
```sh
# install using npm
npm install @here/xyz-maps-display
```
or
```sh
# install using yarn
yarn add @here/xyz-maps-display
```

## Example Usage:
Create a map display
```ts
import MapDisplay from '@here/xyz-maps-display';

const display = new MapDisplay( mapDiv, {
    zoomLevel : 18,
    center: {
        longitude: 8.53422,
        latitude: 50.16212
    },
    // add layers to the display
    layers: layerSetup
});
```

## Start developing

1. Install node module dependencies
    ```sh
    yarn install
    ```
   In case yarn is not installed already: [install yarn](https://yarnpkg.com/en/docs/install)

2. watch for source code changes and build dev version
    ```sh
    yarn run watch-dev
    ```
   Builds are located in located in `./dist/`

## Other

* build dev version once `yarn run build-dev` (located in packages/*/dist/)

* build release version only `yarn run build-release` (minified...)

# Contributing

Your contributions are always welcome! Please have a look at the [contribution guidelines](CONTRIBUTING.md) first.

## License

Copyright (C) 2019-2022 HERE Europe B.V.

This project is licensed under the Apache License, Version 2.0 - see the [LICENSE](LICENSE) file for details
