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
export const TerrainRenderMode = {
    NONE: 0,
    OFFSCREEN: 1,
    ONSCREEN: 2
} as const;

export type TerrainRenderMode = typeof TerrainRenderMode[keyof typeof TerrainRenderMode];

export const TerrainOcclusionMode = {
    NONE: 0,
    TERRAIN: 1
} as const;

export type TerrainOcclusionMode = typeof TerrainOcclusionMode[keyof typeof TerrainOcclusionMode];

export type TerrainRenderPolicyResult = {
    renderMode: TerrainRenderMode;
    occlusion: TerrainOcclusionMode;
};

type PolicyValue = TerrainRenderMode | TerrainRenderPolicyResult;
type AlignmentPolicy = { [alignment: string]: PolicyValue };

type Policy = TerrainRenderMode | AlignmentPolicy;

const NONE_POLICY: TerrainRenderPolicyResult = {
    renderMode: TerrainRenderMode.NONE,
    occlusion: TerrainOcclusionMode.NONE
};

const DEFAULT_ONSCREEN_POLICY: TerrainRenderPolicyResult = {
    renderMode: TerrainRenderMode.ONSCREEN,
    occlusion: TerrainOcclusionMode.NONE
};

const OFFSCREEN_POLICY: TerrainRenderPolicyResult = {
    renderMode: TerrainRenderMode.OFFSCREEN,
    occlusion: TerrainOcclusionMode.NONE
};

const RENDER_POLICY_BY_MODE: { [mode: number]: TerrainRenderPolicyResult } = {
    [TerrainRenderMode.NONE]: NONE_POLICY,
    [TerrainRenderMode.OFFSCREEN]: OFFSCREEN_POLICY,
    [TerrainRenderMode.ONSCREEN]: DEFAULT_ONSCREEN_POLICY
};

const VIEWPORT_OCCLUSION_POLICY: TerrainRenderPolicyResult = {
    renderMode: TerrainRenderMode.ONSCREEN,
    occlusion: TerrainOcclusionMode.TERRAIN
};

const ONSCREEN = TerrainRenderMode.ONSCREEN;
const OFFSCREEN = TerrainRenderMode.OFFSCREEN;

const TERRAIN_RENDER_POLICY: { [type: string]: Policy } = {
    Line: OFFSCREEN,
    Polygon: OFFSCREEN,
    Extrude: ONSCREEN,
    Text: {
        map: ONSCREEN,
        viewport: VIEWPORT_OCCLUSION_POLICY
    },
    Icon: {
        map: ONSCREEN,
        viewport: VIEWPORT_OCCLUSION_POLICY
    },
    Circle: {
        map: ONSCREEN,
        viewport: VIEWPORT_OCCLUSION_POLICY
    },
    Rect: {
        map: ONSCREEN,
        viewport: VIEWPORT_OCCLUSION_POLICY
    },
    Heatmap: OFFSCREEN,
    VerticalLine: ONSCREEN,
    Box: ONSCREEN,
    Sphere: ONSCREEN,
    Model: ONSCREEN,
    Terrain: ONSCREEN
};

export function getTerrainRenderPolicy(
    type: string,
    geomType: string,
    alignment: string | undefined,
    altitude: number | boolean | 'terrain'
): TerrainRenderPolicyResult {
    if (altitude !== 'terrain') return NONE_POLICY;

    const policy = TERRAIN_RENDER_POLICY[type];
    if (policy == null) return DEFAULT_ONSCREEN_POLICY;
    if (typeof policy === 'number') return RENDER_POLICY_BY_MODE[policy];

    const resolvedAlignment = alignment || (geomType === 'Point' ? 'viewport' : 'map');
    const value = policy[resolvedAlignment] ?? policy.viewport ?? ONSCREEN;

    return typeof value === 'number'
        ? RENDER_POLICY_BY_MODE[value]
        : value;
}
