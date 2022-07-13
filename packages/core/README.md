# XYZ Maps JS: Core

[XYZ Maps](https://github.com/heremaps/xyz-maps) is an experimental and work in progress open-source map editor written in TypeScript/JavaScript.
The core module of [XYZ Maps](https://github.com/heremaps/xyz-maps) provides the most basic functionality and is used by all other modules of xyz-maps.
Main functionalities of the module are: DataProviders, TileLayers, Geometric Classes and Styling definitions.

### Links
* [API Playground](https://heremaps.github.io/xyz-maps/playground/#Display-Pitch_and_Rotate_Map)
* [Documentation](https://heremaps.github.io/xyz-maps/docs/)

## Installation
Install XYZ Map Core by using
```sh
# install using npm
npm install @here/xyz-maps-core
```
or
```sh
# install using yarn
yarn add @here/xyz-maps-core
```

## Example Usage:
Create a MVTLayer
```ts
import {MVTLayer} from '@here/xyz-maps-core';

// create a MVT Layer
const myLayer = new MVTLayer({
    remote: {
        url: 'https://xyz.api.here.com/tiles/osmbase/512/all/{z}/{x}/{y}.mvt?access_token=' + YOUR_ACCESS_TOKEN
        tileSize : 512
    },
    min: 1,
    max: 20
})
// and add it to the map display
display.addLayer(myLayer);
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

Copyright (C) 2019-2022 HERE Europe B.V.

This project is licensed under the Apache License, Version 2.0 - see the [LICENSE](LICENSE) file for details
