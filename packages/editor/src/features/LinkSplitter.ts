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

import {JSUtils} from '@here/xyz-maps-common';
import locTools from './location/LocationTools';
import linkTools from './link/NavLinkTools';
import Navlink from './link/Navlink';
import {getRelPosOfPointOnLine, calcRelPosOfPoiAtLink} from '../map/GeoMath';
import InternalEditor from '../IEditor';

let UNDEF;


// {
//     link: toLink,
//         index: crossing.index,
//     avoidSplitPointSnapping: true
// } : {
//     link: toLink,
//         point: pnt,
//         index: false,
//         preferSegment: preferSegment,
//         avoidSnapping: true
// }

export interface SplitOptions {
    link: Navlink;
    index?: number;
    preferSegment?: number;
    point?: [number, number, number?];
    avoidSnapping?: boolean;
}

// split at exsiting shape
// or split at existing shape and keep the position of existing shape
export const split = (HERE_WIKI: InternalEditor, options: SplitOptions): [Navlink, Navlink]|false => {
    const parentLink = options.link;
    let splitAtShpIndex = options.index;
    const preferSegment = options.preferSegment;
    const avoidSplitPointSnapping = options.avoidSnapping;
    let path = parentLink.coord();
    const lastIndex = path.length - 1;
    const parentLinkProperties = linkTools._props(parentLink);
    const snapTolerance = HERE_WIKI._config['minShapeDistance'];
    let x;
    let y;

    if (options.point) {
        x = options.point[0];
        y = options.point[1];
    }

    // check if not a node
    if (
        (splitAtShpIndex === 0 || splitAtShpIndex === lastIndex) ||
        (x == path[0][0] && y == path[0][1]) ||
        (x == path[lastIndex][0] && y == path[lastIndex][1])
    ) {
        return false;
    }
    // if split is defined by absolute coordinates...
    if (splitAtShpIndex === UNDEF) {
        const crossing = HERE_WIKI.map.calcCrossingAt(path, options.point, snapTolerance, preferSegment);

        splitAtShpIndex = crossing.index;

        if (crossing.existingShape && (splitAtShpIndex === 0 || splitAtShpIndex === lastIndex)) {
            return false;
        }


        // addNewShape request index of the shape point regardless it is new or existing
        splitAtShpIndex = linkTools.addShp(parentLink, [x, y], null, true, null, preferSegment);

        path = parentLink.coord();
    }

    linkTools.deHighlight(parentLink);

    const provider = parentLink.getProvider();

    const createSplitLink = (path, prefIdx) => {
        // copy link properties to new link
        const props = JSUtils.extend(true, {}, parentLinkProperties);
        const objDef = {
            type: 'Feature',
            geometry: {
                type: 'LineString',
                coordinates: path
            },
            properties: props
        };

        delete props['@ns:com:here:editor'];

        return HERE_WIKI.objects.create(
            [objDef],
            provider,
            prefIdx,
            UNDEF
        );
    };

    const newLink1 = createSplitLink(
        path.slice(0, splitAtShpIndex + 1),
        avoidSplitPointSnapping && splitAtShpIndex
    );
    const newLink2 = createSplitLink(
        path.slice(splitAtShpIndex),
        avoidSplitPointSnapping && 0
    );

    let relPos = getRelPosOfPointOnLine(path[splitAtShpIndex], path);

    if (relPos > 0.995) {
        relPos = 1.0;
    }

    const relPosOfShape = calcRelPosOfPoiAtLink(path, path[splitAtShpIndex]).offset;
    const cObjs = linkTools.getConnectedObjects(parentLink);

    // reconnect cObjs to respective Link
    for (var i in cObjs) {
        const poi = cObjs[i];
        const pos = locTools.getRoutingPosition(poi);
        const oldRelPos = calcRelPosOfPoiAtLink(path, pos).offset;
        const childLink = relPosOfShape > oldRelPos ? newLink1 : newLink2;

        locTools.connect(poi, childLink, pos);

        locTools.markAsModified(poi, false);
    }

    // need to call hook before removal of parent otherwise trs of clinks will already be removed
    HERE_WIKI.hooks.trigger('Navlink.split', {
        link: parentLink,
        index: splitAtShpIndex,
        children: [newLink1, newLink2],
        relativePosition: relPos
    }, provider);

    parentLink.editState('split', Date.now());

    HERE_WIKI.objects.remove(parentLink, {
        animation: false,
        split: true
    });

    return [newLink1, newLink2];
};
