## XYZ Maps JS: Test Playground

### Prepare

The XYZ Maps Playground uses XYZ Maps JS, therefore please make sure a build of XYZ Maps is available.<br>
To build XYZ Maps just run `yarn run build-release` in the git root directory.

### Setup Credentials

Credentials can be set up automatically by running `yarn run set-access-token YOUR_ACCESS_TOKEN` in git root<br>
or manually by creating `credentials.json` in the playground package root.
```javascript
{
    "access_token": "YOUR_ACCESS_TOKEN"
}
```

### Build the Playground with default options
```
yarn run build
```

### Build Playground with custom options

Usage: `yarn run build [OPTIONS]`

Options:

```
    --common-path   Path of component 'common'                  [string] [default: '../../common/dist/xyz-maps-common.js']
    --core-path     Path of component 'core'                    [string] [default: '../../core/dist/xyz-maps-core.js']
    --display-path  Path of component 'display'                 [string] [default: '../../display/dist/xyz-maps-display.js']
    --editor-path   Path of component 'editor'                  [string] [default: '../../editor/dist/xyz-maps-editor.js']
    --plugins-path  Path of component 'plugins'                 [string] [default: '../../editor/dist/xyz-maps-plugins.js']

    --doc-path      Path to the xyz maps documentation          [string] [default: '../../docs/dist/']

    --destination   Destination directory of built playground   [string] [default: './dist']

```

## License

Copyright (C) 2019-2021 HERE Europe B.V.

This project is licensed under the Apache License, Version 2.0 - see the [LICENSE](LICENSE) file for details
