## XYZ Editor JS: Documentation

### Build dev version of XYZ Editor JS

Documentation is built on dev version of XYZ-MAPS JS, therefore please make sure dev build of XYZ-MAPS JS
is available before building the doc.

* build dev version in root directory `yarn run build-dev`

### Build Documentation

Build Documentation with predefined configures:
```
yarn run build
```

### Build Documentation with parameters

Usage: `yarn run bundle [OPTIONS]`

Options:
```
--common        Path of component 'common'      [string] [default: '../common/dist/xyz-maps-common.js']
--core          Path of component 'core'        [string] [default: '../core/dist/xyz-maps-core.js']
--display       Path of component 'display'     [string] [default: '../display/dist/xyz-maps-display.js']
--editor        Path of component 'editor'      [string] [default: '../editor/dist/xyz-maps-editor.js']
--destination   Destination directory of doc    [string] [default: './dist']
```


## License

Copyright (C) 2019-2020 HERE Europe B.V.

This project is licensed under the Apache License, Version 2.0 - see the [LICENSE](LICENSE) file for details
