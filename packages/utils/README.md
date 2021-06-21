## XYZ Maps JS: Utils

Collection of development utilities used to build XYZ Maps modules.

### Utils:

* `build-dts`: Build typescript declarations for the public API interface.
    ```
    Options:
          --version  Show version number                                   [boolean]
      -p, --path     root path of the module                     [string] [required]
          --help     Show help                                             [boolean]
    ```
---
* `build-changelog`: Build typescript declarations for the public API interface.

    #### cli
    ```
    Options:
          --version  Show version number                                          [boolean]
      -p, --path     path to the module to update the changelog for.    [string] [required]
          --help     Show help                                                    [boolean]
    ```
    #### api
    `.parse([options])`: returns object containing parsed conventional commit messages

    `.getMarkup([options])`: returns markup formatted string of conventional commit messages

    `.update([options])`: updates CHANGELOG.md with latest conventional commit messages

    ---

    `.options.from` (optional): defaults to last semver tag

    `.options.to` (optional): defaults to HEAD

    `.options.filename` (optional): defaults to CHANGELOG.md

    `.options.path` (optional): path to project root. defaults to current directory


### License

Copyright (C) 2019-2021 HERE Europe B.V.

This project is licensed under the Apache License, Version 2.0 - see the [LICENSE](LICENSE) file for details
