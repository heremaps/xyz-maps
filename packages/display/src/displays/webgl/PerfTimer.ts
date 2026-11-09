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

import {
    PerfTimer,
    type MeasureHandle,
    type MeasureLogMode as CommonMeasureLogMode,
    type MeasureOptions as CommonMeasureOptions,
    type MeasureStats
} from '@here/xyz-maps-common';

export type {MeasureHandle, MeasureStats};

export type MeasureLogMode = CommonMeasureLogMode | 'frame';

export type MeasureOptions = Omit<CommonMeasureOptions, 'log'> & {
    log?: MeasureLogMode;
};

export class DisplayPerfTimer extends PerfTimer {
    override measureStart(key: string, options?: MeasureOptions): MeasureHandle {
        return super.measureStart(key, {
            ...options,
            log: options?.log === 'frame' ? 'cycle' : options?.log
        });
    }

    protected override getCycleLabels(): {unit: string, completed: string} {
        return {unit: 'frame', completed: 'completedFrames'};
    }

    nextFrame(): void {
        this.nextCycle();
    }

    override measure<T>(key: string, fn: () => T, options?: MeasureOptions): T {
        const handle = this.measureStart(key, options);
        try {
            return fn();
        } finally {
            this.measureEnd(handle);
        }
    }
}

const perfTimer = new DisplayPerfTimer();

export const measureStart = (key: string, options?: MeasureOptions): MeasureHandle =>
    perfTimer.measureStart(key, options);

export const measurePause = (target: string | MeasureHandle): boolean =>
    perfTimer.measurePause(target);

export const measureResume = (target: string | MeasureHandle): boolean =>
    perfTimer.measureResume(target);

export const measureEnd = (target: string | MeasureHandle, quiet?: boolean): MeasureStats | undefined =>
    perfTimer.measureEnd(target, quiet);

export const nextFrame = (): void => perfTimer.nextFrame();

export const printStats = (key: string, last?: number): void => perfTimer.printStats(key, last);

export const measure = <T>(key: string, fn: () => T, options?: MeasureOptions): T =>
    perfTimer.measure(key, fn, options);

export const measureReset = (key: string): void => perfTimer.measureReset(key);
