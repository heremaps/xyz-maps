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
import InternalEditor from '../../IEditor';
import Map from '@here/xyz-maps-display';
import {Zone} from '../../API/EZoneSelector';
import Navlink from '../../features/link/NavLink';

class MultiSelector {
    private multiLink: MultiLink = null;
    private candidates = {
        ref: null,
        nref: null
    };
    private parents = [];

    private onMvcStart: () => void;
    private display: Map;

    private mlStyle;

    constructor(iEdit: InternalEditor) {
        this.display = iEdit.display;
    }

    private isCandidate(line) {
        const {candidates} = this;
        for (const n in candidates) {
            for (const i in candidates[n]) {
                if (line.id === candidates[n][i].link.id) {
                    return n;
                }
            }
        }
        return null;
    };

    getCollection(): MultiLink {
        return this.multiLink;
    }

    show(zones: Zone[]) {
        // if (!this.onMvcStart) {
        // this.display.addEventListener('mapviewchangestart', this.onMvcStart = this.hide.bind(this));
        // }
        if (this.multiLink) {
            this.multiLink.show(zones);
        }
    };

    hide() {
        // this.display.removeEventListener('mapviewchangestart', this.onMvcStart);
        // this.onMvcStart = null;

        const {multiLink, parents} = this;
        for (let i = 0; i < parents.length; i++) {
            oTools.defaults(parents[i]);
        }

        this.parents = [];
        this.candidates = {
            ref: null,
            nref: null
        };

        if (multiLink) {
            multiLink.destroy();
            this.multiLink = null;
        }
    };

    addLink(line: Navlink) {
        let {multiLink, parents, candidates} = this;

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
                parents.push(oTools.deHighlight(line));

                this.multiLink = multiLink = new MultiLink(line._e(), line, this.mlStyle);
            }

            // handling of candidates
            candidateNode = this.isCandidate(line);

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

    setMLStyle(style) {
        this.mlStyle = style;
        if (this.multiLink) {
            this.multiLink.updateStyle(style);
        }
    }
}

export default MultiSelector;
