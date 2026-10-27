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

### `.report([options])`
prints the entries excluded from the changelog by a `Changelog: none` marker. Writes no file. `build-changelog --report` calls it.

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

## Excluding a section from the changelog

Add `Changelog: none` as its own line after a section of conventional commit entries:

```text
fix(editor): correct an internal edge case
Changelog: none

fix(display): preserve the visible map
```

The entries above the marker are excluded, and parsing continues below it. Each marker excludes the entries since the previous marker (or since the beginning of the commit), so a marker at the end excludes all entries in the commit. This also works when `Signed-off-by` or other commit footers follow the marker.

## Changelog section order

Known scopes are rendered in this order:

```text
editor
display
core
common
general
```

Unknown scopes are rendered alphabetically after `general`.

---

### License

Copyright (C) 2019-2022 HERE Europe B.V.

This project is licensed under the Apache License, Version 2.0 - see the [LICENSE](LICENSE) file for details
