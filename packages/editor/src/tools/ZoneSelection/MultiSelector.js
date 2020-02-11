/*
 * Copyright (C) 2019-2020 HERE Europe B.V.
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

import oTools from '../../features/link/NavLinkTools';
import MultiLink from './MultiLink';

function MultiSelector(HERE_WIKI, overlay) {
    let multiLink = null;
    let candidates = {
        ref: null,
        nref: null
    };
    const isCandidate = (line) => {
        for (const n in candidates) {
            for (const i in candidates[n]) {
                if (line.id === candidates[n][i].link.id) {
                    return n;
                }
            }
        }
        return null;
    };
    let parents = [];
    const multiSelector = this;

    this.getCollection = () => multiLink;

    this.show = (zones) => {
        multiLink && multiLink.show(zones);
    };

    this.hide = () => {
        for (let i = 0; i < parents.length; i++) {
            oTools.defaults(parents[i]);
        }

        parents = [];
        candidates = {
            ref: null,
            nref: null
        };

        if (multiLink) {
            multiLink.destroy();
            multiLink = null;
        }
    };

    this.addLink = (line) => {
        let candidateNode;
        let isFirstLine;
        let lastNodeIndex;


        if (line != null) {
            lastNodeIndex = line.coord().length - 1;

            isFirstLine = !parents.length;

            // handling of first selected line
            if (isFirstLine) {
                candidates.ref = line.getConnectedLinks(0, true);
                candidates.nref = line.getConnectedLinks(lastNodeIndex, true);

                // line._editable( false );

                parents.push(oTools.deHighlight(line));

                multiLink = new MultiLink(HERE_WIKI, overlay, line, 'B');
            }

            // handling of candidates
            candidateNode = isCandidate(line);

            if (candidateNode) {
                const curParent = parents[parents.length - 1];
                const nodeCandidates = candidates[candidateNode];

                oTools.deHighlight(curParent);

                for (const j in nodeCandidates) {
                    // unset old candidates
                    oTools.defaults(nodeCandidates[j].link);

                    // check if line is conneted with first or last node
                    if (nodeCandidates[j].link.id == line.id) {
                        candidates[candidateNode] = line.getConnectedLinks(
                            nodeCandidates[j].index == 0 ? lastNodeIndex : 0,
                            true
                        );

                        // set new line as current parent
                        parents.push(line);

                        multiLink.addLink(line);
                    }
                }
            }
        }

        return !!(candidateNode || isFirstLine);
    };


    HERE_WIKI.display.addEventListener('mapviewchangestart', multiSelector.hide);
}

export default MultiSelector;
