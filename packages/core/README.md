# XYZ Maps JS: Core

XYZ Maps is an experimental and work in progress open-source map editor written in TypeScript/JavaScript.
The core module of XYZ Maps provides the most basic functionality and is used by all other modules of xyz-maps.
Main functionalities of the module are: DataProviders, TileLayers, Geometric Classes and Styling definitions.

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
