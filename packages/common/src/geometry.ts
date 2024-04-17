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
import {add, dot, scale, sub, Vec3} from './Vec3';
import {distance} from './geotools';


type Point = [number, number, number?] | number[];

const geometry = {
    centroid(polygon: Point[][]): Point {
        const interior = polygon[0];
        const x0 = interior[0][0];
        const y0 = interior[0][1];
        let signedArea = 0;
        let cx = 0;
        let cy = 0;
        let x1;
        let y1;

        for (let i = 0, {length} = interior, j = length - 1, x2, y2, a; i < length; j = i, i++) {
            x1 = interior[i][0] - x0;
            y1 = interior[i][1] - y0;
            x2 = interior[j][0] - x0;
            y2 = interior[j][1] - y0;
            a = y1 * x2 - y2 * x1;
            cx += (x1 + x2) * a;
            cy += (y1 + y2) * a;
            signedArea += a;
        }
        signedArea *= 3;

        return signedArea ? [cx / signedArea + x0, cy / signedArea + y0] : [x1, y1];
    },

    findPointOnLineString(polyline: Point[], point: Point, ignoreZ: boolean = false): { point: Point, segment: number } {
        point = [point[0], point[1], ignoreZ ? 0 : point[2] ?? 0];

        let minDistance = Infinity;
        let segment = null;
        let closestPoint;

        for (let j = 1, i = 0, l0 = [0, 0, 0], l1 = [0, 0, 0], len = polyline.length; j < len; i = j++) {
            l0[0] = polyline[i][0];
            l0[1] = polyline[i][1];
            l1[0] = polyline[j][0];
            l1[1] = polyline[j][1];
            if (ignoreZ) {
                l0[2] = 0;
                l1[2] = 0;
            } else {
                l0[2] = polyline[i][2] ?? 0;
                l1[2] = polyline[j][2] ?? 0;
            }
            const p = geometry.getClosestPntOnLine(l0, l1, point, true);
            const d = distance(p, point);
            if (d < minDistance) {
                closestPoint = p;
                minDistance = d;
                segment = i;
            }
        }
        return {point: closestPoint, segment};
    },
    getClosestPntOnLine(l1: Vec3, l2: Vec3, p: Vec3, clamp?: boolean): Point {
        const l1p = sub([], p, l1);
        const l1l2 = sub([], l2, l1);
        const dir = sub([], l2, l1);
        let t = dot(l1l2, l1p) / dot(l1l2, l1l2);
        if (clamp) {
            t = Math.max(0, Math.min(1, t));
        }
        scale(dir, dir, t);
        return add(dir, dir, l1);
    },

    intersectBBox(ax: number, ax2: number, ay: number, ay2: number, bx: number, bx2: number, by: number, by2: number): boolean {
        return ax <= bx2 &&
            bx <= ax2 &&
            ay <= by2 &&
            by <= ay2;
    }
};

export default geometry;
