/*
 * Copyright (C) 2019-2022 HERE Europe B.V.
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

import oTools from '../../features/link/NavlinkTools';
import MultiLink from './MultiLink';
import InternalEditor from '../../IEditor';
import {Map} from '@here/xyz-maps-display';
import {Navlink} from '../../features/link/Navlink';
import {InternalRangeOptions} from './Range';
import {GeoJSONCoordinate} from '@here/xyz-maps-core';
import {Feature} from '../../features/feature/Feature';


type LineSegment = { id: number | string, coordinates: GeoJSONCoordinate[], feature?: Navlink | Feature };

class MultiSelector {
    private multiLink: MultiLink = null;
    private lines: LineSegment[] = [];

    // private onMvcStart: () => void;
    private display: Map;

    private mlStyle;

    private iEditor: InternalEditor;
    private first: { lineString: GeoJSONCoordinate[], line?: Navlink, index: number };
    private last: { lineString: GeoJSONCoordinate[], line?: Navlink; index: number };

    constructor(iEditor: InternalEditor) {
        this.iEditor = iEditor;
        this.display = iEditor.display;
    }

    private isConnected(coordinates1: number[][], coordinates2: number[][], line2Index?: number): { i1: number, i2: number } | null {
        const nodes1 = [0, coordinates1.length - 1];
        const nodes2 = typeof line2Index == 'number'
            ? [line2Index]
            : [0, coordinates2.length - 1];

        for (let i2 of nodes2) {
            const coord2 = coordinates2[i2];
            for (let i1 of nodes1) {
                if (oTools.isIntersection(this.iEditor, coordinates1[i1], coord2)) {
                    return {i1: i1, i2: i2};
                }
            }
        }
        return null;
    }

    private getOppositeNodeIndex(coordinates: number[][], i: number) {
        return i == 0 ? coordinates.length - 1 : 0;
    }

    getCollection(): MultiLink {
        return this.multiLink;
    }

    show(zones: InternalRangeOptions[]) {
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

        const {multiLink, lines} = this;

        for (let {feature} of lines) {
            if (feature instanceof Feature) {
                oTools.defaults(feature);
            }
        }

        this.lines = [];

        if (multiLink) {
            multiLink.destroy();
            this.multiLink = null;
        }
    };

    addLineSegment(lineSegment: LineSegment) {
        let {multiLink, lines} = this;
        let candidateNode;
        let isFirstLine;
        let connected;

        const lineString = lineSegment.coordinates;
        const feature = lineSegment.feature;

        if (lineString != null) {
            isFirstLine = !lines.length;

            // handling of first selected line
            if (isFirstLine) {
                multiLink = new MultiLink(this.iEditor, lineString, this.mlStyle, feature);
                this.multiLink = multiLink;
                this.first = {lineString, index: null};

                connected = true;
            } else {
                for (let {id} of lines) {
                    if (lineSegment.id == id) {
                        return false;
                    }
                }

                const firstLineCoordinates = <GeoJSONCoordinate[]> this.first.lineString;

                let connected = this.isConnected(lineString, firstLineCoordinates, this.first.index);

                if (connected) {
                    if (!this.last) {
                        // make sure connectable index of first line is set.
                        this.first.index = this.getOppositeNodeIndex(firstLineCoordinates, connected.i2);
                        this.last = {lineString, index: this.getOppositeNodeIndex(lineString, connected.i1)};
                    } else {
                        this.first = {lineString, index: this.getOppositeNodeIndex(lineString, connected.i1)};
                    }
                } else if (this.last) {
                    connected = this.isConnected(lineString, this.last.lineString, this.last.index);
                    if (connected) {
                        this.last = {lineString, index: this.getOppositeNodeIndex(lineString, connected.i1)};
                    }
                }


                if (connected) {
                    multiLink.addLink(lineString, feature);
                }
            }

            if (connected) {
                if (feature instanceof Feature) {
                    oTools.deHighlight(feature);
                }
                lines.push(lineSegment);
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
