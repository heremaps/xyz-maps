## XYZ Editor JS: Test Playground

### Build XYZ-MAPS JS

Playground is working with XYZ-MAPS JS, therefore please make sure XYZ-MAPS JS
is available before building the playground.

* build in root directory `yarn run build-release`

### Setup Credentials

Create `credentials.json` in ./playground with your credentials:
```javascript
{
    "access_token": "YOUR_ACCESS_TOKEN"
}
```

### Start build

Build Playground with predefined configures:
```
yarn run build
```

### Build Playground with parameters

Usage: `yarn run build [OPTIONS]`

Options:

```
    --common-path   Path of component 'common'                      [string] [default: '../../common/dist/xyz-maps-common.js']
    --core-path     Path of component 'core'                        [string] [default: '../../core/dist/xyz-maps-core.js']
    --display-path  Path of component 'display'                     [string] [default: '../../display/dist/xyz-maps-display.js']
    --editor-path   Path of component 'editor'                      [string] [default: '../../editor/dist/xyz-maps-editor.js']
    --plugins-path  Path of component 'plugins'                     [string] [default: '../../editor/dist/xyz-maps-plugins.js']

    --destination   Destination directory of built playground       [string] [default: './dist']

    --doc-path      Path to doc that is linked in the Playground    [string] [default: '../../docs/dist/']
```

## License

Copyright (C) 2019-2020 HERE Europe B.V.

This project is licensed under the Apache License, Version 2.0 - see the [LICENSE](LICENSE) file for details
