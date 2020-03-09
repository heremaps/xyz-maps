#!/bin/bash -e
#
# Copyright (C) 2019-2020 HERE Europe B.V.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#
# SPDX-License-Identifier: Apache-2.0
# License-Filename: LICENSE
#
# simple script for npm publishing
# to be run from travis

set -ex

echo '//registry.npmjs.org/:_authToken=${NPM_TOKEN}' > ~/.npmrc

yarn install
yarn build-release

# packages that should be published
declare -a packages=("common" "core" "display" "editor")

cd packages

for pkg in "${packages[@]}"
do
    cd "$pkg"
    npm publish $1
    cd -
done

echo "published $1 all packages to npm successfully!"
