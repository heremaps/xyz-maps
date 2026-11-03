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
import type {GeometryBuffer} from '../buffer/GeometryBuffer';
import type {PointBuffer} from '../buffer/types/PointBuffer';
import type {LineBuffer} from '../buffer/types/LineBuffer';
import type {PolygonBuffer} from '../buffer/types/PolygonBuffer';
import type {ExtrudeBuffer} from '../buffer/types/ExtrudeBuffer';
import type {TextBuffer} from '../buffer/types/TextBuffer';
import type {SymbolBuffer} from '../buffer/types/SymbolBuffer';
import type {BoxBuffer} from '../buffer/types/BoxBuffer';
import type {SphereBuffer} from '../buffer/types/SphereBuffer';
import type {ModelBuffer} from '../buffer/types/ModelBuffer';
import type {TerrainModelBuffer} from '../buffer/types/TerrainModelBuffer';
import type {VerticalLineBuffer} from '../buffer/types/VerticalLineBuffer';
import type {ProgramConstructor, ProgramMacros} from './Program';

export type ProgramBufferMap = {
    Circle: PointBuffer;
    Rect: PointBuffer;
    Line: LineBuffer;
    DashedLine: LineBuffer;
    Polygon: PolygonBuffer;
    Extrude: ExtrudeBuffer;
    Text: TextBuffer;
    Icon: SymbolBuffer;
    Box: BoxBuffer;
    Sphere: SphereBuffer;
    Model: ModelBuffer;
    Terrain: TerrainModelBuffer;
    VerticalLine: VerticalLineBuffer;
    // These programs also consume synthetic quads, rather than only feature buffers.
    Image: GeometryBuffer;
    Heatmap: GeometryBuffer;
    Sky: GeometryBuffer;
};

type ProgramConfiguration<Buffer extends GeometryBuffer = GeometryBuffer> = {
    program: ProgramConstructor<Buffer>;
    default?: boolean;
    macros?: ProgramMacros;
};

export type ProgramConfigurationMap = {
    [Name in keyof ProgramBufferMap]: ProgramConfiguration<ProgramBufferMap[Name]>
} & {[name: string]: ProgramConfiguration};
