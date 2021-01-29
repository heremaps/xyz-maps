/*
 * Copyright (C) 2019-2021 HERE Europe B.V.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * SPDX-License-Identifier: Apache-2.0
 * License-Filename: LICENSE
 */
export const convertImport = (
    line: string,
    mapping: { [module: string]: { ns: string, default?: string } }
): {
    module: string,
    globalImport: string
} => {
    let converted = '';
    line = line.trim();
    if (line.indexOf('import ')) return;

    let esImport = line.slice(7).trim();
    let from = esImport.split(' from ');
    if (!from[1]) return;

    let pkg = from[1].match(/[\"|\''](.*?)[\"|\'']/)[1];
    let defaultModule: string | string[] = from[0].split(/ *\{/)[0].split(',');
    let modules = from[0].match(/\{(.*?)\}/);

    defaultModule = defaultModule[0].trim();

    if (pkg) {
        const global = mapping[pkg];
        if (defaultModule) {
            converted += `var ${defaultModule} = ${global.ns}.${global.default};\n`;
        }
        if (modules) {
            modules = modules[1].split(',');
            for (let module of modules) {
                let mod = module.trim().split(/ +as +/);
                let name = mod[0];
                let alias = mod.pop();
                if (name.indexOf(' ') + alias.indexOf(' ') > -2) return;
                converted += `${converted ? ',' : 'var'} ${alias} = ${global.ns}.${name}`;
            }
            converted += ';';
        }
        return converted && {
            module: pkg,
            globalImport: converted
        };
    }
};

