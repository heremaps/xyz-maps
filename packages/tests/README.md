## XYZ Editor JS: Tests

### Build XYZ-MAPS JS

Build XYZ Editor JS for tests to run against:

* build in root directory `yarn run build-release`

### Setup Credentials

Create `credentials.json` in ./tests with your credentials:
```javascript
{
    "access_token": "YOUR_ACCESS_TOKEN"
}
```
### Setup Environments

Create `environments.json` in ./tests with your settings:
```javascript
{
    "xyzhub": "YOUR_XYZHUB_ENDPOINT",
    "image": "{LOCALHOST}/base/tests/assets/tiles/{QUADKEY}.png"
}
```

### Start a test

Test is started through a command under root directory:
   ```
   yarn run test
   ```
Runs a test with predefined configures

### Customize a test with parameters

Start a test under 'test/' sub-directory. API is build under root directory `yarn run build-release` beforhand.

    Usage:
        `yarn run test [OPTIONS]`

    Config Options:
        --browser               Run tests in specified browser                           ['Chrome'|'ChromeHeadless'|'Firefox'] [default: 'Chrome']
        --singleRun             Run tests and then exit with an exit code of 0 or 1 depending on whether all tests passed or any tests failed
                                                                                                                      [true|false] [default: true]

    Component Options:
        Tests run against all components by default
        --common                Include or exclude component 'common' or only run tests matching this string                    [true|false|string]
        --core                  Include or exclude component 'core' or only run tests matching this string                      [true|false|string]
        --display               Include or exclude component 'display' or only run tests matching this string                   [true|false|string]
        --editor                Include or exclude component 'editor' or only run tests matching this string                    [true|false|string]

    Mocha Options:
        --bail                  Abort ("bail") after first test failure                                               [true|false] [default: false]
        --timeout               Specify test timeout threshold (in milliseconds)                                          [number] [default: 20000]
        --invert                Inverts matches defined in Component Options                                                              [boolean]

    Sources:
        --common-src            Path of component 'common'                              [string] [default: '../common/dist/xyz-maps-common.min.js']
        --core-src              Path of component 'core'                                    [string] [default: '../core/dist/xyz-maps-core.min.js']
        --display-src           Path of component 'display'                           [string] [default: '../display/dist/xyz-maps-display.min.js']
        --editor-src            Path of component 'editor'                              [string] [default: '../editor/dist/xyz-maps-editor.min.js']
    
    Test Environments:
        --environments          Path of environments file, details of the file see above in `Setup Environments`  
                                                                                                        ['string'] [default: './environments.json']
        --environments.xyzhub   Set/overwrite endpoint of XYZ Hub                                                                        ['string']
        --environments.image    Set/overwrite endpoint of image server                                                                   ['string']
                                         
    XYZ Hub credentials:
        --credentials:          Path of credentials file, details of the file see above in `Setup Credentials`
                                                                                                         ['string'] [default: './credentials.json']
        --credentials.access_token  Set/overwrite access token for XYZ Hub                                                               ['string']

### Other commands

  * Build test: `yarn run build`

  * Rebuild test when test changes: `yarn run watch`
