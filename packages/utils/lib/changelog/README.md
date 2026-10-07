# Changelog

Creates and updates CHANGELOG.md based on git commit logs.<br>
In addition to <https://conventionalcommits.org> multiple Conventional Commits logs are allowed for a single commit message.

## Usage
```javascript
const changelog = require('changelog');

await changelog.update();
```

## API

### `.parse([options])`
returns object containing parsed conventional commit messages

### `.getMarkup([options])`
returns markup formatted string of conventional commit messages

### `.update([options])`
updates CHANGELOG.md with latest conventional commit messages

---

#### `.options.from` (optional)
defaults to last semver tag

#### `.options.to` (optional)
defaults to HEAD

#### `.options.filename` (optional)
defaults to CHANGELOG.md

#### `.options.path` (optional)
path to project root.
defaults to current directory

#### `.options.docsBaseUrl` (optional)
base URL used to resolve relative documentation links in commit messages.
defaults to `https://heremaps.github.io/xyz-maps/`.
Links written as `[text](docs/...)` or `[text](./docs/...)` are made absolute using this base URL.
Use a path without a leading slash; absolute links and other relative links are left unchanged.

---

### License

Copyright (C) 2019-2022 HERE Europe B.V.

This project is licensed under the Apache License, Version 2.0 - see the [LICENSE](LICENSE) file for details
