# XYZ Editor JS

XYZ Editor is an experimental and work in progress open-source map editor written in TypeScript/JavaScript.

![edit buildings with xyz-editor](packages/docs/xyz-maps.png)

## Prerequisites

* [Node.js](https://nodejs.org) (8.16.0+)
* [Yarn](https://yarnpkg.com/en/docs/install) (1.11.0+)


## Start developing

1. Clone this repository

    ```
    git clone https://github.com/heremaps/xyz-editor.git

    cd xyz-editor
    ```

2. Install node module dependencies
    ```
    yarn install
    ```

3. watch for source code changes and build dev version
    ```
    yarn run watch-dev
    ```
    Builds are located in `./packages/*/dist/`


## Setup your XYZ token

Setup an XYZ token is only required if the XYZ Hub endpoint at xyz.api.here.com is used.
You can get a token by following the instructions in this [guide](https://www.here.xyz/api/getting-token/).

If you are using a [local XYZ Hub](https://github.com/heremaps/xyz-hub#getting-started) simply set `set-access-token` to an empty string.

Running tests / playground and debug pages requires the XYZ token to be provided.

* Configure your XYZ token
    ```
    yarn run set-access-token YOUR_ACCESS_TOKEN
    ```

## Serve debug page

* Start debug server (requires xyz access token)
    ```
    yarn run server
    ```
    browser will start and open http://localhost:8080/debug automatically



## Serve Playground

* Build and start the playground (requires xyz access token)
    ```
    yarn run playground
    ```
    browser will start and open http://localhost:8081/packages/playground/dist automatically


## Other Commands

* Run tests on release build `yarn run test`

* Build development version `yarn run build-dev` (located in packages/*/dist/)

* Build release version only `yarn run build-release` (minified...)

* Build the documentation `yarn run build-doc` (located in packages/docs/dist/)

* Create full release bundle `yarn run bundle-release` (includes documentation and playground)

* Configure XYZ access token `yarn run set-access-token YOUR_ACCESS_TOKEN`


## Guides

* [Getting started](https://github.com/heremaps/xyz-editor/wiki/Getting-started)
* [Display your space](https://github.com/heremaps/xyz-editor/wiki/Display-your-space)
* [Style your data](https://github.com/heremaps/xyz-editor/wiki/Style-your-data)
* [Add interactivity](https://github.com/heremaps/xyz-editor/wiki/Add-interactivity)


## License

Copyright (C) 2019-2020 HERE Europe B.V.

This project is licensed under the Apache License, Version 2.0 - see the [LICENSE](LICENSE) file for details
