/*
 * Copyright (C) 2026 HERE Europe B.V.
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

import earcut from 'earcut';

/**
 * Triangulates flat polygon coordinates and returns vertex indices.
 *
 * @param vertices - Flat coordinates with the specified number of dimensions per vertex.
 * @param holes - Starting vertex index of each hole.
 * @param dimensions - Coordinate stride per vertex, defaulting to 2.
 * @hidden
 */
export function triangulatePolygon(vertices: ArrayLike<number>, holes?: ArrayLike<number>, dimensions: number = 2): number[] {
    return earcut(vertices, holes, dimensions);
}
