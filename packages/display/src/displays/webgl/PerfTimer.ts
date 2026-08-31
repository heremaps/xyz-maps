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

type ActiveMeasure = {
    key: string;
    startedAt: number;
    pausedAt?: number;
    pausedTotal: number;
    ended?: boolean;
    logMode: MeasureLogMode;
    frameLogEvery: number;
};

type TimerStats = {
    total: number;
    count: number;
};

export type MeasureLogMode = 'immediate' | 'frame' | 'silent';

export type MeasureOptions = {
    log?: MeasureLogMode;
    every?: number;
};

export type MeasureHandle = ActiveMeasure;

export type MeasureStats = {
    last: number;
    total: number;
    count: number;
    avg: number;
};

type FrameTimerStats = {
    total: number;
    count: number;
};

type FrameData = {
    measures: { [key: string]: FrameTimerStats };
    logKeys: { [key: string]: number };
};

const statsByKey: { [key: string]: TimerStats } = {};
const activeByKey: { [key: string]: ActiveMeasure[] } = {};
const frameStatsByKey: { [key: string]: FrameTimerStats } = {};
let activeFrame: FrameData = {measures: {}, logKeys: {}};
let completedFrames = 0;

const getStats = (key: string): TimerStats => {
    let stats = statsByKey[key];
    if (!stats) {
        stats = statsByKey[key] = {
            total: 0,
            count: 0
        };
    }
    return stats;
};

const getActiveStack = (key: string): ActiveMeasure[] => {
    return activeByKey[key] || (activeByKey[key] = []);
};

const getActiveByTarget = (target: string | MeasureHandle): ActiveMeasure | undefined => {
    if (typeof target === 'string') {
        const stack = activeByKey[target];
        return stack?.[stack.length - 1];
    }
    return target;
};

const stopAndGetLast = (target: string | MeasureHandle): { key: string, active: ActiveMeasure } | undefined => {
    if (typeof target === 'string') {
        const stack = activeByKey[target];

        if (!stack?.length) {
            return;
        }

        const active = stack.pop();
        return {key: target, active};
    }

    const active = target;
    const {key} = active;
    const stack = activeByKey[key];
    if (!stack?.length) {
        return;
    }

    const index = stack.lastIndexOf(active);
    if (index < 0) {
        return;
    }

    stack.splice(index, 1);
    return {key, active};
};

export const measureStart = (key: string, options?: MeasureOptions): MeasureHandle => {
    const active: ActiveMeasure = {
        key,
        startedAt: performance.now(),
        pausedTotal: 0,
        logMode: options?.log || 'immediate',
        frameLogEvery: Math.max(1, options?.every || 1)
    };
    getStats(key);
    getActiveStack(key).push(active);
    return active;
};

export const measurePause = (target: string | MeasureHandle): boolean => {
    const active = getActiveByTarget(target);

    if (!active || active.pausedAt !== undefined) {
        return false;
    }

    active.pausedAt = performance.now();
    return true;
};

export const measureResume = (target: string | MeasureHandle): boolean => {
    const active = getActiveByTarget(target);

    if (!active || active.pausedAt === undefined) {
        return false;
    }

    active.pausedTotal += performance.now() - active.pausedAt;
    active.pausedAt = undefined;
    return true;
};

export const measureEnd = (target: string | MeasureHandle, quiet?: boolean): MeasureStats | undefined => {
    const stopped = stopAndGetLast(target);
    if (!stopped) {
        return;
    }
    const {key, active} = stopped;
    const stats = statsByKey[key];
    const now = performance.now();

    if (active.ended) {
        return;
    }

    active.ended = true;

    if (active.pausedAt !== undefined) {
        // If end is called while paused, exclude the trailing paused segment too.
        active.pausedTotal += now - active.pausedAt;
    }

    const last = Math.max(0, now - active.startedAt - active.pausedTotal);

    stats.total += last;
    stats.count++;

    if (activeFrame) {
        const frameStats = activeFrame.measures[key] || (activeFrame.measures[key] = {
            total: 0,
            count: 0
        });
        frameStats.total += last;
        frameStats.count++;
    }

    if (!quiet) {
        if (active.logMode === 'immediate') {
            printStats(key, last);
        } else if (active.logMode === 'frame') {
            const currentEvery = activeFrame.logKeys[key];
            activeFrame.logKeys[key] = currentEvery
                ? Math.min(currentEvery, active.frameLogEvery)
                : active.frameLogEvery;
        }
    }
    return {
        last,
        total: stats.total,
        count: stats.count,
        avg: stats.total / stats.count
    };
};

export const nextFrame = (): void => {
    const frame = activeFrame;
    completedFrames++;

    for (const key in frame.measures) {
        const frameStats = frame.measures[key];
        const totalStats = frameStatsByKey[key] || (frameStatsByKey[key] = {
            total: 0,
            count: 0
        });
        totalStats.total += frameStats.total;
        totalStats.count += frameStats.count;
    }

    activeFrame = {
        measures: {},
        logKeys: {}
    };

    for (const key in frame.logKeys) {
        if (completedFrames % frame.logKeys[key] === 0 && frameStatsByKey[key]) {
            printStats(key);
        }
    }
};

export const printStats = (key: string, last?: number) => {
    const stats = statsByKey[key];
    if (!stats || stats.count === 0) {
        console.log(`[PerfTimer] ${key}: no stats`);
        return;
    }
    const avg = stats.total / stats.count;
    const fmt = (value: number) => `${value.toFixed(3)}ms`;

    const completedFrameStats = frameStatsByKey[key];
    const activeFrameStats = activeFrame?.measures[key];
    const frameTotal = (completedFrameStats?.total || 0) + (activeFrameStats?.total || 0);
    const totalCalls = (completedFrameStats?.count || 0) + (activeFrameStats?.count || 0);
    const framesWithStats = completedFrames + Number(!!activeFrameStats);
    const frameInfo = framesWithStats
        ? ` avg/frame=${fmt(frameTotal / framesWithStats)} calls/frame=${(totalCalls / framesWithStats).toFixed(1)}`
            + ` completedFrames=${framesWithStats}`
        : '';

    const lastStr = last !== undefined ? `last=${fmt(last)} ` : '';

    console.log(`[PerfTimer] ${key}: ${lastStr}avg/call=${fmt(avg)} totalCalls=${stats.count}`
        + ` total=${fmt(stats.total)}${frameInfo}`);
};

export const measure = <T>(key: string, fn: () => T, options?: MeasureOptions): T => {
    const handle = measureStart(key, options);
    try {
        return fn();
    } finally {
        measureEnd(handle);
    }
};

export const measureReset = (key: string) => {
    statsByKey[key] = {
        total: 0,
        count: 0
    };
    frameStatsByKey[key] = {
        total: 0,
        count: 0
    };
};
