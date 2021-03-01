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
import {Project, SyntaxKind, JSDocableNode} from 'ts-morph';

const JS_DOCTAG_REGEX = /\/\*\*\s*\n([^\*]|(\*(?!\/)))*\*\//;

export const setReleaseTags = async (dtsPath: string, releaseTag: 'internal' | 'beta' | 'public' = 'internal') => {
    const project = new Project({});
    const sourceFiles = project.addSourceFilesAtPaths(dtsPath + '/**/*.d.ts');

    for (let sourceFile of sourceFiles) {
        sourceFile.forEachDescendant((node, traversal) => {
            const leadingCommentRanges = node.getLeadingCommentRanges();
            const comment = leadingCommentRanges.pop();

            if (comment?.getText().match(JS_DOCTAG_REGEX)) {
                return;
            }

            switch (node.getKind()) {
            // case SyntaxKind.PropertySignature:
            case SyntaxKind.PropertyDeclaration:
            case SyntaxKind.ClassDeclaration:
            case SyntaxKind.MethodDeclaration:
            case SyntaxKind.Constructor:
            case SyntaxKind.VariableStatement:
            case SyntaxKind.TypeAliasDeclaration:
            case SyntaxKind.InterfaceDeclaration:
                (<JSDocableNode><unknown>node).addJsDoc({description: `@${releaseTag}`});
                traversal.skip();
            }
        });
    }
    return await project.save();
};
