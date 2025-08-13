/*
 * Copyright (C) 2019-2024 HERE Europe B.V.
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

import {AmbientLight, DirectionalLight} from '@here/xyz-maps-core';
import {vec3, Color} from '@here/xyz-maps-common';
// import multiply = vec3.multiply;
import add = vec3.add;
import toRGB = Color.toRGB;
import {UniformMap} from './program/Program';


export type ProcessedLights = ((AmbientLight|DirectionalLight) & { color: Color.Color; })[];

export const defaultLight: ProcessedLights = [{
    type: 'ambient',
    color: '#fff',
    intensity: 0.3
}, {
    type: 'directional',
    color: '#fff',
    direction: [0, 0, 1],
    intensity: 1.0
}, {
    type: 'directional',
    color: '#fff',
    direction: [-1, 0, 0],
    intensity: 0.2
}];

// const LIGHT_SYMBOL = Symbol.for('lightID');
const UNIFORMS = Symbol();

export const initLightUniforms = (lights: ProcessedLights): UniformMap => {
    const totalAmbientColor = [0, 0, 0];
    let dirLights = 0;
    let uniforms: UniformMap = lights[UNIFORMS];
    if (uniforms) {
        return uniforms;
    }
    lights[UNIFORMS] = uniforms = {};
    for (let light of lights) {
        const color = toRGB(light.color).slice(0, 3);
        switch (light.type) {
        case 'directional':
            const loc = `u_directionalLight[${dirLights++}]`;
            uniforms[`${loc}.color`] = color;
            uniforms[`${loc}.intensity`] = light.intensity ?? 1.0;
            uniforms[`${loc}.direction`] = (light as DirectionalLight).direction;
            // uniforms[`${loc}.direction`] = multiply([0, 0, 0], (light as DirectionalLight).direction, [1, 1, -1]);
            break;
        case 'ambient':
            uniforms['u_ambient.color'] = add(totalAmbientColor, totalAmbientColor, color);
            uniforms['u_ambient.intensity'] = light.intensity ?? 1.0;
        }
    }
    uniforms['u_numDirectionalLights'] = dirLights;
    return uniforms;
};

export const defaultLightUniforms = initLightUniforms(defaultLight);
