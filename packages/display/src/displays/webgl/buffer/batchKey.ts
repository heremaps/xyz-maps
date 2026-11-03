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
import type {Color} from '@here/xyz-maps-core';
import type {BufferStyle} from './BufferStyle';
import type {TerrainRenderMode, TerrainOcclusionMode} from './TerrainRenderPolicy';

const RENDER_Z_LAYER = 16;
const RENDER_SCALE_BY_ALTITUDE = 32;
const RENDER_NO_DEPTH_TEST = 64;
const RENDER_OPACITY = 16384;
const OFFSET_X_METERS = 256;
const OFFSET_Y_METERS = 512;
const OFFSET_Z_METERS = 1024;
export const OFFSET_CUSTOM_UNITS = 2048;
export const OFFSET_TEXT = 4096;
export const OFFSET_PACKED = 8192;

declare const lightingColorIdentity: unique symbol;
export type LightingColorIdentity = string & {[lightingColorIdentity]: true};

let lastStateFlags: number;
let lastStateZLayer: number;
let lastStateOpacity: number;
let lastStateKey: string;

// Length-prefixed strings cannot consume an adjacent component, even with embedded delimiters.
export function encodeBatchValue(value: unknown): string {
    if (typeof value === 'string') return value.length + ':' + value;
    if (value === undefined) return 'u;';
    if (value === null) return 'null;';
    if (typeof value === 'number') return 'n' + value + ';';
    const text = typeof value === 'object' ? JSON.stringify(value) : String(value);
    return text.length + ':' + text;
}

export function getSizeBatchKey(size: number | Expression): number | string {
    return typeof size === 'number' ? size : 'e' + encodeBatchValue(size.id());
}

export function getUnitBatchKey(unit: string): string {
    return unit === 'px' ? 'p' : unit === 'm' ? 'm' : 'u' + encodeBatchValue(unit);
}

export function getPaintColorIdentity(color: Color): string {
    return color ? String(color) : '';
}

export function getLightingColorIdentity(color: Color): LightingColorIdentity {
    return (color ? encodeBatchValue(color) : '') as LightingColorIdentity;
}

export function getLightingKeyPart(
    light?: string, emissiveIdentity?: LightingColorIdentity, specularIdentity?: LightingColorIdentity, shininess?: number, intensity: number = 1
): string {
    const flags = (light ? 1 : 0) | (emissiveIdentity ? 2 : 0) | (specularIdentity ? 4 : 0) | (intensity !== 1 ? 8 : 0);
    if (!flags) return '';
    let key = 'L' + flags + ':';
    if (light) key += encodeBatchValue(light);
    if (emissiveIdentity) key += emissiveIdentity;
    if (specularIdentity) key += specularIdentity + ':' + shininess;
    if (intensity !== 1) key += ':' + intensity;
    return key;
}

export function getStrokeStyleKey(strokeIdentity: string, width: number | string, prefix: string = '', geometryKey: string = ''): string {
    const color = strokeIdentity || '';
    const size = typeof width === 'string' ? 's' + encodeBatchValue(width) : width ?? '';
    return prefix + 'S' + size + ':' + color.length + ':' + color + geometryKey;
}

export function getFillStrokeStyleKey(
    strokeIdentity: string, width: number | string, fillIdentity: string, prefix: string = '', geometryKey: string = ''
): string {
    const color = fillIdentity || '';
    return getStrokeStyleKey(strokeIdentity, width, prefix) + 'F' + color.length + ':' + color + geometryKey;
}

export function getOffsetUnitFlags(x: string, y: string, z: string): number {
    if (x === 'px' && y === 'px' && z === 'px') return 0;
    return (x === 'm' ? OFFSET_X_METERS : x === 'px' ? 0 : OFFSET_CUSTOM_UNITS) |
        (y === 'm' ? OFFSET_Y_METERS : y === 'px' ? 0 : OFFSET_CUSTOM_UNITS) |
        (z === 'm' ? OFFSET_Z_METERS : z === 'px' ? 0 : OFFSET_CUSTOM_UNITS);
}

export function packOffsets(x: number, y: number, z: number): number | undefined {
    if (x === 0 && y === 0 && z === 0) return 0;
    if (x >= -256 && x <= 255 && Number.isInteger(x) &&
        y >= -256 && y <= 255 && Number.isInteger(y) &&
        z >= -256 && z <= 255 && Number.isInteger(z)) {
        // Three signed 9-bit integers fit losslessly in 27 bits; other numbers stay textual.
        return (x & 511) | ((y & 511) << 9) | ((z & 511) << 18);
    }
}

export function getOffsetStyleKey(
    x: number, y: number, z: number, unitX: string, unitY: string, unitZ: string, prefix: string = '', geometryKey: string = ''
): string {
    if (x === 0 && y === 0 && z === 0 && unitX === 'px' && unitY === 'px' && unitZ === 'px') return prefix + geometryKey;
    const packed = packOffsets(x, y, z);
    const flags = getOffsetUnitFlags(unitX, unitY, unitZ) | (packed === undefined ? OFFSET_TEXT : packed !== 0 ? OFFSET_PACKED : 0);
    let key = prefix + 'O' + flags;
    if (packed !== 0) key += packed !== undefined ? ':' + packed : ':' + x + ':' + y + ':' + z;
    if (flags & OFFSET_CUSTOM_UNITS) key += ':' + encodeBatchValue(unitX) + encodeBatchValue(unitY) + encodeBatchValue(unitZ);
    return key + geometryKey;
}

export function getBatchStateKey(
    renderMode: TerrainRenderMode, occlusion: TerrainOcclusionMode,
    opacity: number, zLayer: number, altitude: BufferStyle['altitude'], depthTest: boolean,
    scaleByAltitude: boolean
): string {
    const flags = (renderMode << 2) | occlusion | (scaleByAltitude ? RENDER_SCALE_BY_ALTITUDE : 0) |
        (altitude && !depthTest ? RENDER_NO_DEPTH_TEST : 0) |
        (zLayer !== undefined ? RENDER_Z_LAYER : 0) |
        (opacity !== 1 ? RENDER_OPACITY : 0);
    // The complete state depends only on these primitives, never on mutable style identity.
    if (lastStateKey !== undefined && flags === lastStateFlags && zLayer === lastStateZLayer && opacity === lastStateOpacity) {
        return lastStateKey;
    }
    // Presence bits omit default-valued fields while keeping every remaining component unambiguous.
    let render = 'F' + (flags >>> 0);
    if (zLayer !== undefined) render += ':' + zLayer;
    if (opacity !== 1) render += ':' + opacity;
    lastStateFlags = flags;
    lastStateZLayer = zLayer;
    lastStateOpacity = opacity;
    lastStateKey = render + ':';
    return lastStateKey;
}
