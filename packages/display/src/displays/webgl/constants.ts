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

const TO_RADIANS = Math.PI / 180;

// Maximum pitch (in radians) used for calculating the world-coordinate tile grid.
// When the actual map pitch exceeds this value, the grid is still computed using this capped pitch value.
// helping to control performance and memory usage while maintaining reasonable horizon coverage.
// Experimentally determined to provide the best balance between performance and view distance.
export const GRID_PITCH_CLAMP = 68 * TO_RADIANS;

// Maximum pitch (in radians) at which fixed (non-adaptive) grid tiles are allowed to render.
// If the actual pitch exceeds this value, fixed tiles are culled and no longer displayed.
// Adaptive tiles may still render above this threshold by scaling appropriately.
export const FIXED_TILE_PITCH_THRESHOLD = 60 * TO_RADIANS;

// Depth slots for logical render-order levels, deliberately decoupled from the real depth buffer precision.
// Render order is applied by narrowing the depth range per level (see GLRender.getDepthForZIndex), so the spacing
// between levels must exceed the depth buffer quantization. On a 24-bit buffer these 16 bits leave a 256-step margin,
// keeping overlapping non-flat geometry of adjacent `zIndex` levels apart, e.g. a line's outline and inline style.
// The margin is needed because non-flat ranges start at 0, so the effective spacing scales with the projected depth,
// and the alpha color pass uses depthFunc EQUAL, making even a single-step deviation visible.
// A per-level polygon offset would be more explicit (its units are relative to the depth buffer resolution), but
// requires an identical offset in the alpha depth/color pass and dropping the per-draw reset in
// Program.configureRenderState.
export const Z_INDEX_DEPTH_SLOTS = 1 << 16;
