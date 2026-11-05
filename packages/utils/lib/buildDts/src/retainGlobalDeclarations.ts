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
import * as ts from 'typescript';

// API Extractor omits global augmentations. Preserve the emitted source blocks unchanged.
export const retainGlobalDeclarations = (entryText: string): string => {
    const source = ts.createSourceFile('index.d.ts', entryText, ts.ScriptTarget.Latest, true);
    return source.statements
        .filter((node) => ts.isModuleDeclaration(node) && !!(node.flags & ts.NodeFlags.GlobalAugmentation))
        .map((node) => node.getText(source)).join('\n\n');
};
