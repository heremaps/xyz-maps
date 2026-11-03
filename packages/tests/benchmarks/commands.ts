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
export type HeapUsage = {usedSize: number; totalSize: number; embedderHeapUsedSize?: number; backingStorageSize?: number};
export type ProfileMetrics = {heap: HeapUsage; metrics: {metrics: {name: string; value: number}[]}};
export type ProfileResult = {
    before: ProfileMetrics;
    after: ProfileMetrics & {retainedHeap: HeapUsage};
    liveHeap: {tiles: number; empty: HeapUsage; held: HeapUsage; released: HeapUsage};
};

export function getBenchmarkBackend(gl: WebGLRenderingContext | WebGL2RenderingContext) {
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    return {
        renderer: gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER),
        vendor: gl.getParameter(info ? info.UNMASKED_VENDOR_WEBGL : gl.VENDOR),
        version: gl.getParameter(gl.VERSION)
    };
}

declare module 'vitest/internal/browser' {
    interface BrowserCommands {
        writeBufferBenchmark(json: string): Promise<void>;
        startBufferProfile(): Promise<ProfileMetrics>;
        stopBufferProfile(label: string): Promise<ProfileMetrics & {retainedHeap: HeapUsage}>;
        measureBufferHeap(): Promise<HeapUsage>;
    }
}
