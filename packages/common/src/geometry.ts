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
type Point = [number, number, number?] | number[];

export default {
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
    }
};
