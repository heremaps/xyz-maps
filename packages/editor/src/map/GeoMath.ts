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

import {getDistance, isOnLine, getPntOnLine} from '../geometry';

type Point = [number, number, number?];
type Path = Point[];

class RelativePosition {
    offset: number;
    distance: number;

    constructor(offset: number, distance: number) {
        this.offset = offset;
        this.distance = distance;
    }
}

export const getRelPosOfPointOnLine = (pnt: Point, path: Path): number => {
    let totalDistance = 0;
    let startToPntDistance = 0;

    for (let i = 0; i < path.length - 1; i++) {
        const g1 = path[i];
        const g2 = path[i + 1];

        if (isOnLine(path[i], path[i + 1], pnt) != false) {
            startToPntDistance = totalDistance + getDistance(g1, pnt);
        }
        totalDistance += getDistance(g1, g2);
    }
    return startToPntDistance / totalDistance;
};

export const calcRelPosOfPoiAtLink = (path: Path, p: Point): RelativePosition => {
    let totalLength = 0;
    const segment = {
        lenPntToLine: Infinity,
        lenTotal: 0,
        shp: 0
    };

    for (var i = 0; i < path.length - 1; i++) {
        const g1 = path[i];
        const g2 = path[i + 1];
        var iPnt = getPntOnLine(path[i], path[i + 1], p);

        if (iPnt != false) {
            const lenPntToLine = getDistance(iPnt, p);

            if (lenPntToLine < segment.lenPntToLine) {
                segment.shp = i;
                segment.lenPntToLine = lenPntToLine;
                segment.lenTotal = totalLength + getDistance(g1, iPnt);
            }
        }
        totalLength += getDistance(g1, g2);
    }

    // calc nearest node distance
    let lenToCurShp = 0;
    const nearestShp = {
        shp: -1,
        distancePoi: Infinity,
        length: -1
    };

    for (var i = 0; i < path.length; i++) {
        const dis = getDistance(path[i], p);
        i > 0 &&
        (lenToCurShp += getDistance(
            path[i],
            path[i - 1]
        ));
        if (dis < nearestShp.distancePoi) {
            nearestShp.shp = i;
            nearestShp.distancePoi = dis;
            nearestShp.length = lenToCurShp;
        }
    }

    // calc the side
    if (segment.lenPntToLine < nearestShp.distancePoi) {
        return new RelativePosition(
            segment.lenTotal / totalLength,
            segment.lenPntToLine
        );
        // side: this.calcSideOfLine(p,path[segment.shp],path[segment.shp+1])
    } else {
        return new RelativePosition(
            nearestShp.length / totalLength,
            nearestShp.distancePoi
        );
        // side: this.calcSideOfLine(p,path[index[0]],path[index[1]])
    }
};

export const calcSideOfLine = (p: Point, g1: Point, g2: Point): false | 'L' | 'R' => {
    if (g1[0] == g2[0] && g1[1] == g2[1]) {
        return false;
    }
    const dvx = p[0] - g1[0];
    const dvy = p[1] - g1[1];
    const gvx = g2[0] - g1[0];
    const gvy = g2[1] - g1[1];
    const direction = (dvx * gvy) - (dvy * gvx);
    return direction > 0 ? 'L' : 'R';
};

