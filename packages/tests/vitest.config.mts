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
import {project} from './vitest/projects.mts';

// One project per component. Run a single one with e.g. `pnpm test --project editor`.
// `pnpm test --mode dev` runs against the dev bundles (dist/xyz-maps-<name>.js) instead of the minified ones.
// The integration tests need an XYZ Hub and run with `pnpm test:integration` (vitest.integration.config.mts).
export default defineConfig(({mode}) => ({
    test: {
        silent: 'passed-only',
        projects: [project('common', mode), project('core', mode), project('display', mode), project('editor', mode)],
        reporters: ['default', ['json', {outputFile: 'dist/vitest/report.json'}]]
    }
}));
