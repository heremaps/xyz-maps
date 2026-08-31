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

/**
 * GLStateGuard: Intercepts WebGL calls to audit redundancy.
 * Use for profiling during development.
 *
 * @internal
 * @hidden
 */
export const createGLStateGuard = (gl: WebGLRenderingContext | WebGL2RenderingContext) => {
    const stats = new Map();
    const shadowState = new Map(); // Maps function names to the last Array of arguments used

    return new Proxy(gl, {
        get(target, prop) {
            if (prop === 'printAudit') {
                return () => {
                    console.group('WebGL Redundancy Audit');
                    const tableData = {};
                    [...stats.entries()]
                        .sort((a, b) => b[1].redundant - a[1].redundant)
                        .forEach(([name, data]) => {
                            if (data.total > 0) {
                                tableData[name] = {
                                    'Total': data.total,
                                    'Redundant': data.redundant,
                                    'Waste %': ((data.redundant / data.total) * 100).toFixed(1) + '%'
                                };
                            }
                        });
                    console.table(tableData);
                    console.groupEnd();
                };
            }

            const original = target[prop];
            if (typeof original !== 'function') return original;

            return (...args) => {
                if (!stats.has(prop)) {
                    stats.set(prop, {
                        total: 0,
                        redundant: 0,
                        isState: /^(use|bind|enable|disable|colorMask|depth|blend|clearColor|viewport|pixelStore)/.test(prop as string)
                    });
                }

                const entry = stats.get(prop);
                entry.total++;

                if (entry.isState) {
                    const prevArgs = shadowState.get(prop);

                    // Perform Instance Comparison
                    let isRedundant = prevArgs !== undefined && args.length === prevArgs.length;
                    if (isRedundant) {
                        for (let i = 0; i < args.length; i++) {
                            if (args[i] !== prevArgs[i]) {
                                isRedundant = false;
                                break;
                            }
                        }
                    }
                    if (isRedundant) {
                        entry.redundant++;
                    } else {
                        // Store a copy of the arguments for the next comparison
                        shadowState.set(prop, args);
                    }
                }

                return original.apply(target, args);
            };
        }
    });
};
