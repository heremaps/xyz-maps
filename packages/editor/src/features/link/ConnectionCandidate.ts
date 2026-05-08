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

import {GeoJSONCoordinate} from '@here/xyz-maps-core';
import {Navlink} from './Navlink';
import oTools from './NavlinkTools';

/**
 * A ConnectionCandidate represents a possible connection between a NavlinkShape and a nearby Navlink.
 * It is returned by {@link NavlinkShape.getConnectionCandidates} and provides information about the
 * target link, the connection point, and the distance.
 * The connection can be established by calling {@link ConnectionCandidate.connect}.
 */
class ConnectionCandidate {
    /**
     * The target Navlink to which the connection can be established.
     */
    readonly link: Navlink;

    /**
     * The geographical coordinate on the target link's geometry where the connection would be established.
     */
    readonly point: GeoJSONCoordinate;

    /**
     * The distance in meters between the shape's position and the connection point on the target link.
     */
    readonly distance: number;

    /**
     * The segment index on the target link where the connection point is located.
     */
    readonly segment: number | null;

    private readonly _navlink: Navlink;
    private readonly _index: number;
    private readonly _ignoreZ: boolean;

    /**
     * @internal
     */
    constructor(navlink: Navlink, shapeIndex: number, targetLink: Navlink, point: GeoJSONCoordinate, distance: number, segment: number | null, ignoreZ: boolean) {
        this._navlink = navlink;
        this._index = shapeIndex;
        this._ignoreZ = ignoreZ;

        this.link = targetLink;
        this.point = point;
        this.distance = distance;
        this.segment = segment;
    }

    /**
     * Connects the NavlinkShape to the target Navlink.
     * This will create a new shape on the target link at the connection point and split the target link at that position.
     * If the shape is not a node (start/end point) of the Navlink, the own Navlink will also be split.
     *
     * @returns Object containing the resulting split links, or null if the connection could not be established.
     */
    connect(): {
        /** The two new Navlinks created by splitting the target link. */
        targetSplittedInto?: [Navlink, Navlink],
        /** The two new Navlinks created by splitting the own link (if the shape was not a node). */
        splittedInto?: [Navlink, Navlink]
    } | null {
        const foundPos = this.point.slice();
        foundPos[2] ||= 0;

        return oTools.connectShpToLink(
            this._navlink,
            this._index,
            this.link,
            foundPos,
            undefined,
            this._ignoreZ
        );
    }
}

export {ConnectionCandidate};

