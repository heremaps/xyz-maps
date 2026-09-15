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
import {Feature as EditorFeature} from './Feature';
import {Feature, Style, StyleGroup} from '@here/xyz-maps-core';

type Shape = Feature & {
    __?: {
        [prop: string]: any;
        b?: { [behavior: string]: any };
    }
};
const getPrivateData = (shape: Shape, prop?: string) => {
    // const data = shape.__ ||= {b: {...defaultBehavior}};
    const data = shape.__ ||= {};
    // const data = shape.__ ||= {b: getDefaultShapeBehavior(shape)};
    return prop ? data[prop] : data;
};


export function getOrSetShapeBehavior(shape: EditorFeature | Shape, args: IArguments | [options?: any, value?: any]) {
    let behavior = getPrivateData(shape, 'b') || {};

    let [options, value] = args;

    switch (args.length) {
    case 0:
        return behavior;
    case 1:
        if (typeof options == 'string') {
            // getter
            return behavior[options];
        }
        break;
    case 2:
        const opt = {};
        opt[options] = value;
        options = opt;
    }
    // setter
    behavior = {...behavior, ...options};

    if (options.dragPlane) {
        delete behavior.dragAxis;
    } else if (options.dragAxis) {
        delete behavior.dragPlane;
    }

    shape.__.b = behavior;
}

export type AltitudeCapabilities = {
    usesTerrainAltitude: boolean,
    usesAltitude: boolean,
    usesAbsoluteAltitude: boolean
};

export function getAltitudeCapabilities(feature: EditorFeature, relativePosition: number = -1): AltitudeCapabilities {
    const editor = feature._e();
    let usesAbsoluteAltitude = false;
    let usesTerrainAltitude = false;

    if (editor.displayProvidesTerrain) {
        const styleGroup = editor.getResolvedStyle(feature);
        const isPointFeature = feature.geometry.type === 'Point';
        for (let style of styleGroup) {
            if (!isPointFeature && style.type !== 'Line' && style.type !== 'Polygon') continue;
            if (relativePosition !== -1 && !(relativePosition >= style.from && relativePosition<= style.to ) ) continue;

            const altitude = style.altitude;
            usesTerrainAltitude ||= altitude === 'terrain';
            usesAbsoluteAltitude ||= altitude === true || Number.isFinite(altitude) && altitude > 0;
        }
    }

    return {
        usesAbsoluteAltitude,
        usesTerrainAltitude,
        usesAltitude: usesAbsoluteAltitude || usesTerrainAltitude
    };

    // const usesTerrainAltitude = editor.displayProvidesTerrain &&
    //     style.some((s) => matchesGeometry(s) && s.altitude === 'terrain');
    // // treat boolean true and positive numeric altitude values as 3D */
    // // const usesAltitude = usesTerrainAltitude || style.some((s) => s.altitude > 0);
    //
    //
    // const usesAbsoluteAltitude = editor.displayProvidesTerrain &&
    //     style.some((s) => matchesGeometry(s) && s.altitude > 0);
    //
    // console.log(feature.class, {usesTerrainAltitude, usesAltitude});
    //
    // return {usesTerrainAltitude, usesAltitude};
}

export const isAltitudeEditEnabled = (shape: Shape, parentFeature: EditorFeature) => {
    const editor = parentFeature._e();
    const shapeProperties = shape.properties;
    const data = shapeProperties.AREA || shapeProperties.LINE || shapeProperties.NAVLINK;
    return data.usesTerrainAltitude ? editor.displayProvidesTerrain : data.usesAltitude;
};
