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
import {Zone} from '../../API/EZoneSelector';
import Navlink from '../../features/link/NavLink';
import Line from '../../features/line/Line';
import InternalEditor from '../../IEditor';
import {MultiZone} from './Zone';
import ObjectOverlay from '../../features/Overlay';


let UNDEF;

function mergeConnectedPaths(path1, path2) {
    return path1.concat(path2.slice(1));
}

function createStyle(zIndex, color, sw, sda?) {
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

type MultiLinkSegment = {
    from: number,
    to: number,
    link: Navlink | Line,
    reversed: boolean
}


class MultiLink {
    private zones = [];
    private feature: any;
    private overlay: ObjectOverlay;
    private completePath: any;
    private style: { strokeWidth: any; strokeLinejoin: string; strokeLinecap: string; type: string; stroke: any; zIndex: any; strokeDasharray: any }[];
    private links: MultiLinkSegment[] = [];

    private iEdit: InternalEditor;

    constructor(iEditor: InternalEditor, link: Navlink | Line, style?) {
        const overlay = iEditor.objects.overlay;

        this.iEdit = iEditor;

        let completePath;

        if (link === UNDEF) {
            return null;
        }

        completePath = this.completePath = link.coord();

        const mlStyle = this.style = style || createDefaultStyle();

        this.overlay = overlay;
        this.feature = overlay.addPath(completePath, mlStyle);

        this.hide();

        this.links.push({
            from: 0,
            to: completePath.length - 1,
            link: link,
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
        this.zones.forEach((zone) => {
            zone.remove();
        });
        this.zones.length = 0;
    }

    coord() {
        return this.completePath.map((c) => c.slice());
    }

    hide() {
        this.overlay.remove(this.feature);
    }

    show(zones: Zone[]) {
        const {overlay} = this;

        this.removeZones();

        overlay.addFeature(this.feature, this.style);

        zones.forEach((zone) => {
            if (['L', 'R', 'B'].indexOf(zone.side) != -1) {
                let multiZone = new MultiZone(this, overlay, zone);
                this.zones.push(multiZone);
                multiZone.draw();
            }
        });
    };

    addLink(link: Navlink) {
        const newPath = link.coord();
        const {links} = this;

        oTools.defaults(link);

        function match(c1, c2) {
            return c1[0] === c2[0] && c1[1] === c2[1];
        }

        const addChild = (from, to, reversed?) => {
            if (reversed) {
                newPath.reverse();
            }

            if (from === 0) {
                for (let i = 0; i < links.length; i++) {
                    links[i].from += to;
                    links[i].to += to;
                }
                this.completePath = mergeConnectedPaths(newPath, completePath);
            } else {
                this.completePath = mergeConnectedPaths(completePath, newPath);
            }

            links.unshift({
                from: from,
                to: to,
                link: link,
                reversed: !!reversed
            });
        };

        const completePath = this.completePath;

        if (match(newPath[newPath.length - 1], completePath[0])) {
            // '0->N'
            addChild(0, newPath.length - 1);
        } else if (match(newPath[0], completePath[0])) {
            // '0->0'
            addChild(0, newPath.length - 1, true);
        } else if (match(newPath[0], completePath[completePath.length - 1])) {
            // 'N->0'
            addChild(
                completePath.length - 1,
                completePath.length + newPath.length - 2
            );
        } else if (match(newPath[newPath.length - 1], completePath[completePath.length - 1])) {
            // 'N->N';
            addChild(
                completePath.length - 1,
                completePath.length + newPath.length - 2,
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


    getZones() {
        return this.zones;
    }

    getZoneSegments(zone) {
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

            // 0 0 or 1 1 -> not on segment
            if (mPos[0] !== mPos[1]) {
                segments.push([
                    child.link,
                    mPos[0],
                    mPos[1],
                    child.reversed
                ]);
            }
        });
        return segments;
    };
}

export default MultiLink;
