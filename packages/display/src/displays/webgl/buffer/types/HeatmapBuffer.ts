import type {Expression} from '@here/xyz-maps-common';
/*
 * Copyright (C) 2019-2023 HERE Europe B.V.
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

import {BufferStyle, FlexAttribute, GeometryBuffer} from '../GeometryBuffer';
import type {BufferUniforms, BufferAttributes, ConfigureBufferStyle} from '../GeometryBuffer';
import type {ResolvedBufferStyle} from '../BufferStyle';
import {FlexArray} from '../FlexArray';
import {PointBuffer} from './PointBuffer';
import {addPoint} from '../geometry/addPoint';
import {Color as StyleColor, LinearGradient} from '@here/xyz-maps-core';
import {Color} from '@here/xyz-maps-common';
import toRGB = Color.toRGB;
import {PASS} from '../../RenderPass';
import type {TextureManager} from '../../TextureManager';
import type {Texture} from '../../Texture';


export const DEFAULT_HEATMAP_GRADIENT: LinearGradient = {
    type: 'LinearGradient',
    stops: {
        1.0: 'white',
        0.9: '#FCFBAE',
        0.8: '#FAD932',
        0.7: '#F26C19',
        0.5: '#C41D6F',
        0.3: '#70009C',
        0.0: '#1E0073'
    }
};


export type HeatmapBufferStyle = Omit<ResolvedBufferStyle<'width' | 'height' | 'opacity'>, 'fill'> &
    {fill?: BufferStyle['fill']};

export type HeatmapBufferUniforms = BufferUniforms & {
    'u_gradient'?: Texture;
    'u_normalizePosition'?: number;
    'u_radius'?: (number | Expression)[];
    'u_weight'?: number;
    'u_intensity'?: number;
    'u_opacity'?: number;
};

export class HeatmapBuffer extends PointBuffer {
    declare uniforms: HeatmapBufferUniforms;
    declare attributes: GeometryBuffer['attributes'] & BufferAttributes<NonNullable<HeatmapBuffer['flexAttributes']>>;
    declare configureStyle: ConfigureBufferStyle<HeatmapBufferStyle>;

    static getGeometryKey(radius: number, fill: StyleColor | LinearGradient, intensity: number): string {
        return 'H' + radius + ':' + JSON.stringify(fill) + ':' + intensity;
    }

    static getBatchKey(
        geometryKey: string, stateKey: string, strokeIdentity: string, width: number | string,
        pointerEvents: boolean, alignment: string, x: number, y: number, z: number,
        unitX: string, unitY: string, unitZ: string
    ): string {
        return this.getPointBatchKey(strokeIdentity, width, undefined, pointerEvents, alignment, x, y, z, unitX, unitY, unitZ, stateKey, geometryKey);
    }

    static verifyAndFixGradient(stops: LinearGradient['stops']): LinearGradient['stops'] {
        let min: string | number = Infinity;
        for (let stop in stops) {
            if (stop < min) min = stop;
        }
        const [r, g, b, a] = toRGB(stops[min]);
        if (a > 0) {
            stops = {...stops};
            stops[min] = `rgba(${r * 255},${g * 255},${b * 255},0)`;
            return stops;
        }
    }

    flexAttributes: {
        'a_position': FlexAttribute,
        'a_weight': FlexAttribute,
    } | null;

    constructor(flat: boolean, tileSize: number) {
        super(true, tileSize);
        this.flexAttributes.a_weight = {
            data: new FlexArray(Float32Array),
            size: 1
        };
    }

    protected configureTypeStyle(
        style: HeatmapBufferStyle,
        meterToPixel: number,
        hasAlphaColor: boolean,
        textureManager?: TextureManager
    ): void {
        if (!textureManager) throw new Error('Heatmap style configuration requires a TextureManager.');
        this.addUniform('u_radius', [style.width, 0]);
        this.addUniform('u_weight', 1);
        this.addUniform('u_intensity', typeof style.height === 'number' ? style.height : 1);
        this.addUniform('u_opacity', style.opacity);
        this.pass = PASS.ALPHA_COLOR | PASS.ALPHA_DEPTH;
        this.flat = true;
        this.depth = this.blend = false;
        const gradient = (style.fill && 'stops' in style.fill ? style.fill.stops : undefined) || DEFAULT_HEATMAP_GRADIENT.stops;
        this.addUniform('u_gradient', textureManager.getGradientTexture(gradient, HeatmapBuffer.verifyAndFixGradient));
    }

    addPoint(x: number, y: number, weight: number = 1.0) {
        this.assertConstructing();
        const {flexAttributes} = this;

        addPoint(x, y, undefined, this.normalizePosition, flexAttributes.a_position.data);
        // 2 triangles, 3 points each
        flexAttributes.a_weight.data.push(weight, weight, weight, weight, weight, weight);
    }
}
