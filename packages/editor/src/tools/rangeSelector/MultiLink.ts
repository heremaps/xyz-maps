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
import {Navlink} from '../../features/link/Navlink';
import {Line} from '../../features/line/Line';
import InternalEditor from '../../IEditor';
import {InternalRangeOptions, Range} from './Range';
import ObjectOverlay from '../../features/Overlay';
import {GeoJSONCoordinate, GeoJSONFeature, Style, StyleGroup, Feature, LineStyle} from '@here/xyz-maps-core';
import {JSUtils} from '@here/xyz-maps-common';

function mergeConnectedPaths(path1, path2) {
    return path1.concat(path2.slice(1));
}

function createStyle(zIndex: number, color: string, sw: number, sda?: number[]): LineStyle {
    return {
        'zIndex': zIndex,
        'type': 'Line',
        'stroke': color,
        'strokeWidth': sw,
        'strokeDasharray': sda || 'none',
        'strokeLinejoin': 'round',
        'strokeLinecap': sda ? 'butt' : 'round'
    };
}

const createDefaultStyle = () => [
    createStyle(0, 'white', 23),
    createStyle(1, 'grey', 20),
    createStyle(2, 'white', 3, [5, 4])
];

export type MultiLinkSegment = {
    from: number,
    to: number,
    feature?: Navlink | Feature,
    lineString: GeoJSONCoordinate[],
    reversed: boolean
}


class MultiLink {
    private ranges: Range[] = [];
    private feature: Feature;
    private overlay: ObjectOverlay;
    private completePath: any;
    private style: Style[];
    private links: MultiLinkSegment[] = [];

    iEdit: InternalEditor;
    zLayer: number;

    constructor(iEditor: InternalEditor, lineString: GeoJSONCoordinate[], style: StyleGroup, feature?: Navlink | Feature) {
        const overlay = iEditor.objects.overlay;

        this.iEdit = iEditor;
        this.completePath = lineString;

        this.style = style || createDefaultStyle();

        this.overlay = overlay;
        this.feature = overlay.addPath(lineString, this.style, {type: 'RANGESELECTOR_LINE'});

        this.hide();

        this.links.push({
            from: 0,
            to: lineString.length - 1,
            feature,
            lineString,
            reversed: false
        });

        // refreshGeometry
        overlay.setFeatureCoordinates(this.feature, this.completePath);
    }

    updateStyle(style) {
        style = style || createDefaultStyle();
        this.style = style;
        this.overlay.layer.setStyleGroup(this.feature, style);
    }

    private removeZones() {
        this.ranges.forEach((zone) => {
            zone.remove();
        });
        this.ranges.length = 0;
    }

    coord() {
        return this.completePath.map((c) => c.slice());
    }

    hide() {
        this.overlay.remove(this.feature);
    }


    private getMaxZLayer() {
        let maxZLayer = this.iEdit.getZLayer(this.overlay.layer);
        for (let {feature} of this.links) {
            let zLayer = this.iEdit.getMaxZLayer(feature);
            if (zLayer > maxZLayer) maxZLayer = zLayer;
        }
        return maxZLayer + 1;
    }

    show(zones: InternalRangeOptions[]) {
        const {overlay} = this;

        this.removeZones();

        let maxZLayer = this.getMaxZLayer();
        this.zLayer = maxZLayer;

        for (let s of this.style) {
            s.zLayer = maxZLayer;
        }

        overlay.addFeature(this.feature, this.style);

        zones.forEach((zone) => {
            if (['L', 'R', 'B'].indexOf(zone.side) != -1) {
                let multiZone = new Range(this, overlay, zone);
                this.ranges.push(multiZone);
                multiZone.update();
            }
        });
    };

    addLink(lineString: GeoJSONCoordinate[], feature: Navlink | Feature) {
        // const newPath = link.coord();
        const {links} = this;

        if (feature instanceof Feature) {
            oTools.defaults(feature);
        }

        function match(c1, c2) {
            return c1[0] === c2[0] && c1[1] === c2[1];
        }

        const addChild = (from, to, reversed?) => {
            const path = JSUtils.clone(lineString);

            if (reversed) {
                path.reverse();
            }

            if (from === 0) {
                for (let i = 0; i < links.length; i++) {
                    links[i].from += to;
                    links[i].to += to;
                }
                this.completePath = mergeConnectedPaths(path, completePath);
            } else {
                this.completePath = mergeConnectedPaths(completePath, path);
            }

            links.unshift({
                from: from,
                to: to,
                feature,
                lineString,
                reversed: !!reversed
            });
        };

        const completePath = this.completePath;

        if (match(lineString[lineString.length - 1], completePath[0])) {
            // '0->N'
            addChild(0, lineString.length - 1);
        } else if (match(lineString[0], completePath[0])) {
            // '0->0'
            addChild(0, lineString.length - 1, true);
        } else if (match(lineString[0], completePath[completePath.length - 1])) {
            // 'N->0'
            addChild(
                completePath.length - 1,
                completePath.length + lineString.length - 2
            );
        } else if (match(lineString[lineString.length - 1], completePath[completePath.length - 1])) {
            // 'N->N';
            addChild(
                completePath.length - 1,
                completePath.length + lineString.length - 2,
                true
            );
        }
        // refreshGeometry();
        this.overlay.setFeatureCoordinates(this.feature, this.completePath);
    };

    //* **************************************************************************************


    destroy() {
        this.hide();
        this.removeZones();
    };

    //* **************************************************************************************


    getRanges() {
        return this.ranges;
    }

    getZoneSegments(zone: Range): MultiLinkSegment[] {
        const m1 = zone.markers[0];
        const m2 = zone.markers[1];
        const segments = [];

        function flip(a) {
            const bak = a[0];
            a[0] = a[1];
            a[1] = bak;
        }

        this.links.forEach((child) => {
            const mPos = [m1.getRelPosOfSubLink(child), m2.getRelPosOfSubLink(child)];

            mPos[0] > mPos[1] && flip(mPos);

            if (child.reversed) {
                flip(mPos);
                mPos[0] = 1 - mPos[0];
                mPos[1] = 1 - mPos[1];
            }

            segments.push({
                navlink: child.feature,
                feature: child.feature,
                from: mPos[0],
                to: mPos[1],
                reversed: child.reversed
            });
        });
        return segments;
    };
}

export default MultiLink;
