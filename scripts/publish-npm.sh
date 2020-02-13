#!/bin/bash -e
# simple script for npm publishing
set -ex

#echo '//registry.npmjs.org/:_authToken=${NPM_TOKEN}' > ~/.npmrc

yarn install

yarn build-release

# packages that should be published
declare -a packages=("common" "core" "display" "editor")

cd packages

for pkg in "${packages[@]}"
do
    cd "$pkg"
    npm publish --dry-run $1
    cd -
done

echo "\npublished $1 to npm sucessfully!\n"
