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
export class Pool<T, C extends any[] = any[], D extends any[] = any[]> {
    protected free: T[] = [];
    protected used = new Set<T>();

    constructor(
        protected readonly create: (...args:C) => T,
        protected readonly destroy?: (item: T, ...args: D) => void
    ) {
    }

    acquire(...p: C): T {
        const item = this.free.pop() ?? this.create(...p);
        this.used.add(item);
        return item;
    }

    clear(...d: D): void {
        for (const item of this.free) this.destroy?.(item, ...d);
        for (const item of this.used) this.destroy?.(item, ...d);
        this.free.length = 0;
        this.used.clear();
    }
    release(item: T): void {
        const used = this.used.delete(item);
        if (used) {
            this.free.push(item);
        }
    }

    /**
     * Releases all currently acquired items back into the pool.
     * Does not destroy items\; see `clear()` for destruction.
     */
    releaseAll(): void {
        for (const item of this.used) this.free.push(item);
        this.used.clear();
    }

    get size(): number {
        return this.free.length + this.used.size;
    }

    get usedCount(): number {
        return this.used.size;
    }

    get freeCount(): number {
        return this.free.length;
    }
}
