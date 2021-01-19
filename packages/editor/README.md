# XYZ Maps JS: Editor

XYZ Maps is an experimental and work in progress open-source map editor written in TypeScript/JavaScript.
The editor module provides an API for editing map data that can be used to easily access, add, remove and edit various types of map data.
Changes can be automatically synchronized with various remote backends services.

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
