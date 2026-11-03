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
import type {GeometryBufferBucket} from '../GeometryBufferBucket';
import type {PointBuffer, PointBufferStyle} from '../types/PointBuffer';
import type {TextBuffer, TextBufferStyle} from '../types/TextBuffer';
import type {SymbolBuffer, SymbolBufferStyle} from '../types/SymbolBuffer';
import type {BoxBuffer, BoxBufferStyle} from '../types/BoxBuffer';
import type {SphereBuffer, SphereBufferStyle} from '../types/SphereBuffer';
import type {HeatmapBuffer, HeatmapBufferStyle} from '../types/HeatmapBuffer';
import type {LineBuffer, LineBufferStyle} from '../types/LineBuffer';
import type {PolygonBuffer, PolygonBufferStyle} from '../types/PolygonBuffer';
import type {ExtrudeBuffer, ExtrudeBufferStyle} from '../types/ExtrudeBuffer';
import type {VerticalLineBuffer, VerticalLineBufferStyle} from '../types/VerticalLineBuffer';
import type {ModelBuffer, ModelBufferStyle} from '../types/ModelBuffer';
import type {TerrainModelBuffer, TerrainModelBufferStyle} from '../types/TerrainModelBuffer';

type BatchContracts = {
    Circle: [PointBuffer, PointBufferStyle];
    Rect: [PointBuffer, PointBufferStyle];
    Text: [TextBuffer, TextBufferStyle];
    Icon: [SymbolBuffer, SymbolBufferStyle];
    Box: [BoxBuffer, BoxBufferStyle];
    Sphere: [SphereBuffer, SphereBufferStyle];
    Heatmap: [HeatmapBuffer, HeatmapBufferStyle];
    Line: [LineBuffer, LineBufferStyle];
    Polygon: [PolygonBuffer, PolygonBufferStyle];
    Extrude: [ExtrudeBuffer, ExtrudeBufferStyle];
    VerticalLine: [VerticalLineBuffer, VerticalLineBufferStyle];
    Model: [GeometryBufferBucket<ModelBuffer>, ModelBufferStyle];
    Terrain: [GeometryBufferBucket<TerrainModelBuffer>, TerrainModelBufferStyle];
};

export type BufferBatch<Type extends keyof BatchContracts = keyof BatchContracts> = {
    [Kind in Type]: {
        type: Kind;
        zLayer: number;
        depthTest: boolean;
        collision: boolean;
        resolvedStyle: BatchContracts[Kind][1];
        buffer?: BatchContracts[Kind][0];
        pointerEvents?: boolean;
    }
}[Type];

export type ZIndexBatches = {
    index: {[batchKey: string]: number};
    batches: BufferBatch[];
};

export type BatchesByZIndex = {[zIndex: string]: ZIndexBatches};
