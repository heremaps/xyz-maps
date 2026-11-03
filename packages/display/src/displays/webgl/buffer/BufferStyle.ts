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

import type {Expression} from '@here/xyz-maps-common';
import type {LinearGradient} from '@here/xyz-maps-core';
import type {TerrainRenderMode, TerrainOcclusionMode} from './TerrainRenderPolicy';

export type BufferColor = number[] | Float32Array;

// Resolved, batch-shared style values; property evaluation remains in FeatureBufferBuilder.
export type BufferStyle = {
    altitude: number | boolean | 'terrain';
    terrainRenderMode: TerrainRenderMode;
    terrainOcclusion: TerrainOcclusionMode;
    unit: string;
    font: string;
    fill: BufferColor | LinearGradient;
    fillIntensity: number;
    opacity: number;
    stroke: BufferColor;
    strokeWidth: number | Expression;
    strokeLinecap: string;
    strokeLinejoin: string;
    strokeDasharray: {pattern: number[] | Expression; units: string[]};
    strokeDashimage: string;
    width: number | Expression;
    height: number;
    depth: number;
    rotation: number;
    offsetX: number;
    offsetY: number;
    offsetZ: number;
    offsetUnit: string | string[];
    alignment: string;
    modelMode: [number, number] | null;
    scaleByAltitude: boolean;
    light: string;
    shininess: number;
    specular: [number, number, number];
    emissive: [number, number, number];
    showWireframe?: boolean | number[];
    showBBox?: boolean | number[];
};

export type CommonBufferStyle = Pick<BufferStyle,
    'altitude' | 'terrainRenderMode' | 'terrainOcclusion' | 'scaleByAltitude' |
    'offsetX' | 'offsetY' | 'offsetZ' | 'offsetUnit' | 'alignment' |
    'light' | 'shininess' | 'specular' | 'emissive'>;

export type PaintBufferStyle = Partial<Pick<BufferStyle, 'fill' | 'fillIntensity' | 'stroke' | 'strokeWidth'>>;

export type ResolvedBufferStyle<Keys extends keyof BufferStyle> =
    CommonBufferStyle & Partial<Pick<BufferStyle, Exclude<Keys, 'fill'>>> &
    Partial<Pick<{fill: BufferColor}, Extract<Keys, 'fill'>>>;

export type SharedBufferStyle = CommonBufferStyle & Partial<BufferStyle>;
