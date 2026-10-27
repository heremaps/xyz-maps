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

import {KindRouter} from 'typedoc';

/**
 * TypeDoc plugin: legacy URL router.
 *
 * Restores the pre-0.28 URL scheme so old deep links keep working. TypeDoc 0.28
 * names pages from the npm package, e.g.
 * `interfaces/_here_xyz-maps-editor.EditorOptions.html` to
 * `interfaces/editor.editoroptions.html`.
 */
class LegacyUrlRouter extends KindRouter {
    getIdealBaseName(reflection) {
        // Default: "<dir>/<Module>.<Symbol>", e.g. "interfaces/_here_xyz-maps-editor.EditorOptions"
        const idealName = super.getIdealBaseName(reflection);
        const slashIdx = idealName.indexOf('/');
        const dir = slashIdx === -1 ? '' : idealName.slice(0, slashIdx + 1);
        let baseName = slashIdx === -1 ? idealName : idealName.slice(slashIdx + 1);

        baseName = baseName.replace(/_here_xyz-maps-/g, '');
        baseName = baseName.toLowerCase();

        return `${dir}${baseName}`;
    }
}

export function load(app) {
    app.renderer.defineRouter('legacy', LegacyUrlRouter);
}
