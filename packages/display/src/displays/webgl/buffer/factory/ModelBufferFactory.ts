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
import {vec3} from '@here/xyz-maps-common';
import type {ModelAlphaMode, ModelMaterialOverride} from '@here/xyz-maps-core';
import {ModelBuffer} from '../types/ModelBuffer';
import {GeometryBufferBucket} from '../GeometryBufferBucket';
import {ModelResourceCache} from './ModelResourceCache';

type ModelAlphaOptions = {
    alphaMode?: ModelAlphaMode;
    alphaCutoff?: number;
    materialOverrides?: Record<string, ModelMaterialOverride>;
};

export class ModelBufferFactory {
    constructor(private resources: ModelResourceCache) {
    }

    createModelBuffer<TBuffer extends ModelBuffer>(
        id: string, specular: [number, number, number], shininess: number, emissive: [number, number, number],
        cullFace: number, ModelBufferClass: new (...args: ConstructorParameters<typeof ModelBuffer>) => TBuffer,
        alphaOptions?: ModelAlphaOptions, fragmentTileClip?: boolean
    ): GeometryBufferBucket<TBuffer> | undefined;
    createModelBuffer(
        id: string, specular: [number, number, number], shininess: number, emissive: [number, number, number],
        cullFace: number, ModelBufferClass?: typeof ModelBuffer, alphaOptions?: ModelAlphaOptions, fragmentTileClip?: boolean
    ): GeometryBufferBucket<ModelBuffer> | undefined;
    createModelBuffer(
        id: string, specular: [number, number, number], shininess: number, emissive: [number, number, number],
        cullFace: number,
        ModelBufferClass: new (...args: ConstructorParameters<typeof ModelBuffer>) => ModelBuffer = ModelBuffer,
        alphaOptions?: ModelAlphaOptions, fragmentTileClip: boolean = false
    ) {
        const model = this.resources.getModel(id);
        if (!model) return;

        const bucket = new GeometryBufferBucket<ModelBuffer>();
        let modelMatrix: ModelBuffer['flexAttributes']['a_modelMatrix'];
        let positionOffset: ModelBuffer['flexAttributes']['a_offset'];
        for (let i = 0; i < model.parts.length; i++) {
            const {
                materialName,
                alphaMode,
                alphaCutoff,
                attributes,
                bbox,
                uniforms,
                index,
                first,
                count
            } = model.parts[i];
            const buffer = new ModelBufferClass(undefined, undefined, modelMatrix, positionOffset);
            buffer.fragmentTileClip = fragmentTileClip;

            const override = alphaOptions?.materialOverrides?.[materialName];
            const requestedAlphaMode = override?.alphaMode ?? alphaOptions?.alphaMode ?? alphaMode ?? 'auto';
            buffer.alphaMode = requestedAlphaMode === 'auto'
                ? (Number(uniforms.opacity) < 1 || uniforms.opacityMap ? 'blend' : 'opaque')
                : requestedAlphaMode;

            buffer.alphaCutoff = override?.alphaCutoff ?? alphaOptions?.alphaCutoff ?? alphaCutoff ?? 0.5;
            modelMatrix = buffer.flexAttributes.a_modelMatrix;
            positionOffset = buffer.flexAttributes.a_offset;

            for (const name in attributes) {
                buffer.flexAttributes[name] = attributes[name];
            }
            const bufferUniforms = buffer.uniforms;
            for (const name in uniforms) {
                bufferUniforms[name] = uniforms[name];
            }
            bufferUniforms.alphaCutoff = buffer.alphaCutoff;
            if (specular) {
                bufferUniforms.specular = vec3.add([], bufferUniforms.specular, specular);
                bufferUniforms.shininess += shininess;
            }
            if (emissive) {
                bufferUniforms.emissive = vec3.add([], bufferUniforms.emissive, emissive);
            }
            if (index) {
                buffer.setIndex(index);
            } else {
                buffer.setArray(first || 0, count);
            }
            buffer.bbox = bbox;
            buffer.cullFace(cullFace === undefined ? 0 : cullFace);
            buffer.id = id;

            this.resources.acquireBuffer(model, buffer);
            bucket.set(i, buffer);
        }
        return bucket;
    }

    addPosition(
        bucket: GeometryBufferBucket<ModelBuffer>, x: number, y: number, z: number,
        scale?: number[], translate?: number[], rotate?: number[], transform?: number[]
    ) {
        const {buffers} = bucket;
        const [first] = buffers;
        first.addInstance(x, y, z, scale, translate, rotate, transform);
        for (let i = 1; i < buffers.length; i++) {
            const buffer = buffers[i];
            buffer.instances = first.instances;
            buffer.uniforms.u_normalMatrix = first.uniforms.u_normalMatrix;
        }
    }
}
