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
Git ref to start the changelog range from.
defaults to the latest SemVer tag in the selected project root

#### `.options.to` (optional)
Git ref to generate the changelog through.
defaults to HEAD

#### `.options.filename` (optional)
defaults to CHANGELOG.md

#### `.options.path` (optional)
path to project root.
defaults to current directory
used consistently for Git operations, `package.json`, and the changelog file

#### `.options.docsBaseUrl` (optional)
base URL used to resolve relative documentation links in commit messages.
defaults to `https://heremaps.github.io/xyz-maps/`.
Links written as `[text](docs/...)` or `[text](./docs/...)` are made absolute using this base URL.
Use a path without a leading slash; absolute links and other relative links are left unchanged.

## Excluding a commit from the changelog

Add the custom `Changelog: none` trailer as its own line in the commit's final paragraph:

```text
fix(core): correct an internal edge case

Changelog: none
```

This excludes every conventional-commit entry in that Git commit, including when the commit message contains multiple entries.

---

### License

Copyright (C) 2019-2022 HERE Europe B.V.

This project is licensed under the Apache License, Version 2.0 - see the [LICENSE](LICENSE) file for details
