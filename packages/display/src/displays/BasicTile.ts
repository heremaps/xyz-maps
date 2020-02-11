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

import {layers} from '@here/xyz-maps-core';

type TileLayer = layers.TileLayer;

let UNDEF;

type PreviewData = any[][];

abstract class BasicTile {
    private tasks: { [id: string]: any };

    quadkey: string;
    layers: TileLayer[];
    luTs: number; // last update timestamp
    private r: boolean[] = [];
    private p: PreviewData[]|false[] = [];

    abstract clear(index: number)
    abstract getData(index: number): any;

    protected init(quadkey: string, layers: TileLayer[]) {
        this.luTs = null;

        this.quadkey = quadkey;

        this.layers = layers;

        this.tasks = {};

        this.r.length = 0;
        this.p.length = 0;
    }

    busy(layer: TileLayer) {
        const id = layer.id;
        for (let t in this.tasks) {
            if (id == this.tasks[t]._lid) {
                return true;
            }
        }
    };

    addTask(task, layer: TileLayer) {
        task._lid = layer.id;

        this.tasks[task.id] = task;
    };


    cancelTasks(layer?: TileLayer) {
        const tasks = this.tasks;
        let task;

        for (let id in tasks) {
            task = tasks[id];

            if (!layer || layer.id == task._lid) {
                task.cancel();
                delete tasks[id];
            }
        }
    };

    removeTask(task, layer) {
        delete this.tasks[task.id];
    };

    index(layer: TileLayer) {
        return this.layers.indexOf(layer);
    };

    ready(index: number, ready?: boolean): boolean {
        if (arguments.length == 2) {
            this.r[index] = ready;

            if (ready) {
                this.luTs = Date.now();
            }
        }
        return this.r[index];
    };

    addLayer(index: number) {
        this.r.splice(index, 0, false);
        this.p.splice(index, 0, UNDEF);
    };

    removeLayer(index: number) {
        this.r.splice(index, 1);
        this.p.splice(index, 1);
    };

    preview(index: number, data?: PreviewData|undefined|false): PreviewData|undefined|false {
        if (arguments.length == 2) {
            this.p[index] = data;
        }
        return this.p[index];
    };
}

export default BasicTile;
