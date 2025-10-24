/*
 * Copyright (C) 2019-2025 HERE Europe B.V.
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

import {TaskSequence} from '@here/xyz-maps-common';
import {Tile} from '@here/xyz-maps-core';
import {Layer} from '../../../Layers';
import {FeatureFactory} from '../FeatureFactory';
import {DisplayTileTask} from '../../../BasicTile';
import {HeightMapTileCache} from '../../Display';
import GLTile from '../../GLTile';
import {TerrainTask} from './TerrainTask';
import {FactoryTask, FactoryTaskResult} from './FactoryTask';
import {GeometryBuffer} from '../GeometryBuffer';

export const BUFFER_FACTORY_TASK_PRIORITY = 4;

export class GeometryBufferFactory {
    static startTask(
        displayLayer: Layer,
        // tileSize: number,
        tile: Tile,
        displayTile: GLTile,
        factory: FeatureFactory,
        terrainCache: TerrainHeightMapCache,
        gl: WebGLRenderingContext,
        onInit: () => void,
        onDone: (
            result: FactoryTaskResult['buffers'],
            pending: FactoryTaskResult['pendingResources']
        ) => void
    ): DisplayTileTask {
        // const task = <DisplayTileTask> new CreateRenderBufferTask(factory);
        // task.start({tile, displayLayer, onInit, onDone});

        const tasks = [
            new FactoryTask({
                priority: BUFFER_FACTORY_TASK_PRIORITY,
                factory
            }),
            new TerrainTask({
                priority: BUFFER_FACTORY_TASK_PRIORITY,
                terrainLayer: displayLayer.getTerrainLayer(),
                terrainCache,
                displayTile,
                gl
            })
        ] as const;

        const task = new TaskSequence<typeof tasks>({
            tasks,
            onDone: (data: readonly [FactoryTaskResult, GeometryBuffer['heightMap'] | null]) => {
                onDone?.(data[0].buffers, data[0].pendingResources);
                // Heightmaps must be added to terrainCache only after onDone completes.
                // If added before, they will be directly deleted during resource cleanup triggered by tile refresh/update.
                // This ensures newly created heightmaps persist and prevents wasted computation or missing terrain data.
                const terrainHeightMap = data[1];
                if (terrainHeightMap) {
                    terrainCache.set(tile.quadkey, terrainHeightMap);
                }
            }
        }) as unknown as DisplayTileTask;

        task.start({tile, displayLayer, onInit});
        task.outdated = false;
        // taskManager.start(task);
        return task;
    };
}
