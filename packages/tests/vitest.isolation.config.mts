/*
 * Copyright (C) 2019-2026 HERE Europe B.V.
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
import {defineConfig} from 'vitest/config';
import {existsSync} from 'node:fs';
import path from 'node:path';
import {isolatedSpecs} from './vitest/isolated.mts';
import {project, unitProject} from './vitest/projects.mts';
import {root} from './vitest/plugins.mts';

const missing = isolatedSpecs.filter((file) => !existsSync(path.join(root, file)));
if (missing.length) throw new Error(`Unknown isolation specs: ${missing.join(', ')}`);

export default defineConfig(({mode}) => ({
    test: {
        silent: 'passed-only',
        maxWorkers: 4,
        reporters: ['default', ['json', {outputFile: 'dist/vitest/report-isolation.json'}]],
        projects: [
            unitProject(),
            ...(['common', 'core', 'display', 'editor'] as const).map((component) => {
                const config = project(component, mode);
                return {
                    ...config,
                    test: {
                        ...config.test,
                        include: isolatedSpecs.filter((file) => file.startsWith(`specs/${component}/`)),
                        sequence: {shuffle: true}
                    }
                };
            })
        ]
    }
}));
