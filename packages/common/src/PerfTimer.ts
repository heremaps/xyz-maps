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
    cycleLogEvery: number;
};

type TimerStats = {
    total: number;
    count: number;
};

type CycleTimerStats = {
    total: number;
    count: number;
};

type CycleData = {
    measures: { [key: string]: CycleTimerStats };
    logKeys: { [key: string]: number };
};

export type MeasureLogMode = 'immediate' | 'cycle' | 'silent';

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

export class PerfTimer {
    private readonly statsByKey: { [key: string]: TimerStats } = {};
    private readonly activeByKey: { [key: string]: ActiveMeasure[] } = {};
    private readonly cycleStatsByKey: { [key: string]: CycleTimerStats } = {};
    private activeCycle: CycleData = {measures: {}, logKeys: {}};
    private completedCycles = 0;

    private getStats(key: string): TimerStats {
        let stats = this.statsByKey[key];
        if (!stats) {
            stats = this.statsByKey[key] = {
                total: 0,
                count: 0
            };
        }
        return stats;
    }

    private getActiveStack(key: string): ActiveMeasure[] {
        return this.activeByKey[key] || (this.activeByKey[key] = []);
    }

    private getActiveByTarget(target: string | MeasureHandle): ActiveMeasure | undefined {
        if (typeof target === 'string') {
            const stack = this.activeByKey[target];
            return stack?.[stack.length - 1];
        }
        return target;
    }

    private stopAndGetLast(target: string | MeasureHandle): { key: string, active: ActiveMeasure } | undefined {
        if (typeof target === 'string') {
            const stack = this.activeByKey[target];

            if (!stack?.length) {
                return;
            }

            const active = stack.pop();
            return {key: target, active};
        }

        const active = target;
        const {key} = active;
        const stack = this.activeByKey[key];
        if (!stack?.length) {
            return;
        }

        const index = stack.lastIndexOf(active);
        if (index < 0) {
            return;
        }

        stack.splice(index, 1);
        return {key, active};
    }

    protected getCycleLabels(): {unit: string, completed: string} {
        return {unit: 'cycle', completed: 'completedCycles'};
    }

    measureStart(key: string, options?: MeasureOptions): MeasureHandle {
        const active: ActiveMeasure = {
            key,
            startedAt: performance.now(),
            pausedTotal: 0,
            logMode: options?.log || 'immediate',
            cycleLogEvery: Math.max(1, options?.every || 1)
        };
        this.getStats(key);
        this.getActiveStack(key).push(active);
        return active;
    }

    measurePause(target: string | MeasureHandle): boolean {
        const active = this.getActiveByTarget(target);

        if (!active || active.pausedAt !== undefined) {
            return false;
        }

        active.pausedAt = performance.now();
        return true;
    }

    measureResume(target: string | MeasureHandle): boolean {
        const active = this.getActiveByTarget(target);

        if (!active || active.pausedAt === undefined) {
            return false;
        }

        active.pausedTotal += performance.now() - active.pausedAt;
        active.pausedAt = undefined;
        return true;
    }

    measureEnd(target: string | MeasureHandle, quiet?: boolean): MeasureStats | undefined {
        const stopped = this.stopAndGetLast(target);
        if (!stopped) {
            return;
        }
        const {key, active} = stopped;
        const stats = this.statsByKey[key];
        const now = performance.now();

        if (active.ended) {
            return;
        }

        active.ended = true;

        if (active.pausedAt !== undefined) {
            active.pausedTotal += now - active.pausedAt;
        }

        const last = Math.max(0, now - active.startedAt - active.pausedTotal);

        stats.total += last;
        stats.count++;

        const cycleStats = this.activeCycle.measures[key] || (this.activeCycle.measures[key] = {
            total: 0,
            count: 0
        });
        cycleStats.total += last;
        cycleStats.count++;

        if (!quiet) {
            if (active.logMode === 'immediate') {
                this.printStats(key, last);
            } else if (active.logMode === 'cycle') {
                const currentEvery = this.activeCycle.logKeys[key];
                this.activeCycle.logKeys[key] = currentEvery
                    ? Math.min(currentEvery, active.cycleLogEvery)
                    : active.cycleLogEvery;
            }
        }
        return {
            last,
            total: stats.total,
            count: stats.count,
            avg: stats.total / stats.count
        };
    }

    nextCycle(): void {
        const cycle = this.activeCycle;
        this.completedCycles++;

        for (const key in cycle.measures) {
            const cycleStats = cycle.measures[key];
            const totalStats = this.cycleStatsByKey[key] || (this.cycleStatsByKey[key] = {
                total: 0,
                count: 0
            });
            totalStats.total += cycleStats.total;
            totalStats.count += cycleStats.count;
        }

        this.activeCycle = {
            measures: {},
            logKeys: {}
        };

        for (const key in cycle.logKeys) {
            if (this.completedCycles % cycle.logKeys[key] === 0 && this.cycleStatsByKey[key]) {
                this.printStats(key);
            }
        }
    }

    printStats(key: string, last?: number): void {
        const stats = this.statsByKey[key];
        if (!stats || stats.count === 0) {
            console.log(`[PerfTimer] ${key}: no stats`);
            return;
        }
        const avg = stats.total / stats.count;
        const fmt = (value: number) => `${value.toFixed(3)}ms`;
        const lastStr = last !== undefined ? `last=${fmt(last)} ` : '';
        const completedCycleStats = this.cycleStatsByKey[key];
        const activeCycleStats = this.activeCycle.measures[key];
        const cycleTotal = (completedCycleStats?.total || 0) + (activeCycleStats?.total || 0);
        const totalCalls = (completedCycleStats?.count || 0) + (activeCycleStats?.count || 0);
        const cyclesWithStats = this.completedCycles + Number(!!activeCycleStats);
        const {unit, completed} = this.getCycleLabels();
        const cycleInfo = cyclesWithStats
            ? ` avg/${unit}=${fmt(cycleTotal / cyclesWithStats)} calls/${unit}=${(totalCalls / cyclesWithStats).toFixed(1)}`
                + ` ${completed}=${cyclesWithStats}`
            : '';

        console.log(`[PerfTimer] ${key}: ${lastStr}avg/call=${fmt(avg)} totalCalls=${stats.count}`
            + ` total=${fmt(stats.total)}${cycleInfo}`);
    }

    measure<T>(key: string, fn: () => T, options?: MeasureOptions): T {
        const handle = this.measureStart(key, options);
        try {
            return fn();
        } finally {
            this.measureEnd(handle);
        }
    }

    measureReset(key: string): void {
        this.statsByKey[key] = {
            total: 0,
            count: 0
        };
        this.cycleStatsByKey[key] = {
            total: 0,
            count: 0
        };
    }
}

export default PerfTimer;
