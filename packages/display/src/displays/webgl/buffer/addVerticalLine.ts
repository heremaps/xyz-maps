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

import {VerticalLineBuffer} from './templates/VerticalLineBuffer';

export const TERRAIN_BASE_SENTINEL = -16000;
export const TERRAIN_OFFSET_SENTINEL = -16001;

const addVerticalLine = (
    group,
    x: number,
    y: number,
    z?: number
): number => {
    const usesTerrain = group.shared.altitude === 'terrain';
    const hasTopZ = Number.isFinite(z);
    if (!usesTerrain && !hasTopZ) {
        return;
    }

    let buffer = group.buffer;
    if (!buffer) {
        buffer = group.buffer = new VerticalLineBuffer();
        buffer.setRequiresHeightMap(usesTerrain);
    }
    const position = buffer.flexAttributes.a_position.data;
    const topZ = hasTopZ ? z : TERRAIN_OFFSET_SENTINEL;
    const bottomZ = usesTerrain ? TERRAIN_BASE_SENTINEL : 0;

    position.push(
        x, y, bottomZ,
        x, y, topZ
    );
    return position.length;
};

export {addVerticalLine};
