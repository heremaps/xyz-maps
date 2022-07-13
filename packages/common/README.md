# XYZ Maps JS: Common

[XYZ Maps](https://github.com/heremaps/xyz-maps) is an experimental and work in progress open-source map editor written in TypeScript/JavaScript.
The Common module provides commonly used javascript functionality that are required by all other modules of [XYZ Maps](https://github.com/heremaps/xyz-maps).

### Links
* [API Playground](https://heremaps.github.io/xyz-maps/playground/#Display-Pitch_and_Rotate_Map)
* [Documentation](https://heremaps.github.io/xyz-maps/docs/)

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
