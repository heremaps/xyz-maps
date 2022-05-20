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

import MarkerTools from './marker/MarkerTools';
import AreaTools from './area/PolygonTools';
import LineTools from './line/LineTools';
import NavlinkTools from './link/NavlinkTools';
import LocationTools from './location/LocationTools';
import {Feature} from './feature/Feature';
import {Marker} from '@here/xyz-maps-editor';
import {vec3} from '@here/xyz-maps-common';
import {getClosestPntOnLine, rayIntersectPlane} from '../geometry';
import InternalEditor from '../IEditor';

const tools = {
    MARKER: MarkerTools,
    AREA: AreaTools,
    LINE: LineTools,
    NAVLINK: NavlinkTools,
    PLACE: LocationTools,
    ADDRESS: LocationTools
};

// avoid circular dependencies
LocationTools.setLinkTools(NavlinkTools);


const createProxy = (p: string) => {
    return function(feature: Feature) {
        const featureClass = feature.class;
        const tool = tools[featureClass][p];
        if (tool) {
            return tool.apply(tool, arguments);
        }
        console.warn('No Tool', p, 'defined for', featureClass);
    };
};


type FeatureTools = {
    getTools(feature: Feature): any;
    getTool(feature: Feature, name: string): (...args) => any;
    private(...args): any;
    getEventListener(feature: Feature, type: string);

    // proxies
    highlight?(feature: Feature);
    deHighlight?(feature: Feature);
    _editable?(feature: Feature, editable: boolean);
    _select?(feature: Feature);
    _setCoords?(feature: Feature, coordinates);
    markAsRemoved?(feature: Feature, animation?: boolean);
    markAsModified?(feature: Feature, saveView?: boolean, visualize?: boolean);

    _getDragBehavior?(feature: Marker): { plane?: number[], axis?: number[] }
    _dragFeatureCoordinate?(toX: number, toY: number, feature, coordinate: number[]);
}

const oTools: FeatureTools = {

    getTools: function(feature: Feature) {
        return tools[feature.class];
    },

    getTool: function(obj, name) {
        const tools = this.getTools(obj);

        return tools && name ? tools[name] : tools;
    },

    private: createProxy('private'),

    getEventListener: function(obj, type) {
        const tools = this.getTools(obj);

        if (tools) {
            return tools._evl[type] || tools.private(obj, type);
        }
        // fallback for overlay objects
        // @ts-ignore
        return obj.__ && obj.__[type] || obj[type];
    }
};

for (const type in tools) {
    for (const t in tools[type]) {
        if (!oTools[t]) {
            oTools[t] = createProxy(t);
        }
    }
}

export default oTools;

// ********* shared utils *********
const getDragBehavior = (feature: Marker): { plane?: number[], axis?: number[] } => {
    const getDragVector = (behavior: string, map) => {
        let b = feature.behavior && feature.behavior(behavior);
        if (b) {
            if (typeof b == 'string') {
                b = map[b.split('').sort().join('').toUpperCase()];
            }
            return b;
        }
    };
    const plane = getDragVector('dragPlane', {
        XY: [0, 0, 1],
        XZ: [0, 1, 0],
        YZ: [1, 0, 0]
    });
    if (plane) return {plane};

    const axis = getDragVector('dragAxis', {
        X: [1, 0, 0],
        Y: [0, 1, 0],
        Z: [0, 0, 1]
    });
    if (axis) return {axis};

    return {plane: [0, 0, 1]};
};


export const dragFeatureCoordinate = (toX: number, toY: number, feature, coordinate: number[], editor?: InternalEditor): number[] => {
    editor = editor || feature._e();

    const behavior = getDragBehavior(feature);
    const display = editor.display;
    const rayStart = display._unprj(toX, toY, -1);
    const rayEnd = display._unprj(toX, toY, 0);
    const rayDir = vec3.sub([], rayEnd, rayStart);
    const pntWorldPx = display._g2w(coordinate);
    const org2d = coordinate[2] === undefined;
    let pntMovedWorldPx;

    if (behavior.plane) {
        pntMovedWorldPx = rayIntersectPlane(rayDir, rayStart, behavior.plane, pntWorldPx);
    } else {
        const dragAxis = behavior.axis;
        const sz = display._prj(display._g2w(coordinate[0], coordinate[1], coordinate[2]))[2];

        // calculate plane normal of dragaxis and mouse ray intersection
        const plane1 = pntWorldPx;
        const plane2 = vec3.add([], pntWorldPx, dragAxis);
        const plane3 = display._unprj(toX, toY, sz);
        const planeNormal = vec3.normalize([], vec3.cross([], vec3.sub([], plane3, plane2), vec3.sub([], plane1, plane2)));
        const iPnt = rayIntersectPlane(rayDir, rayStart, planeNormal, pntWorldPx);


        if (iPnt) {
            const pntWorldPx2 = vec3.add([], pntWorldPx, dragAxis);
            pntMovedWorldPx = getClosestPntOnLine(pntWorldPx2, pntWorldPx, iPnt);
        }
    }

    if (pntMovedWorldPx) {
        coordinate = editor.map.clipGeoCoord(display._w2g(pntMovedWorldPx), true);
        if (coordinate[2] < 0) {
            coordinate[2] = 0;
        }
        if (org2d && coordinate[2] === 0) {
            coordinate.pop();
        }
    }

    return coordinate;
};

