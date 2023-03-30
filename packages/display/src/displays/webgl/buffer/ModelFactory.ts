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
import {Texture} from '../Texture';
import {ModelBuffer} from './templates/ModelBuffer';
import {TemplateBufferBucket} from './templates/TemplateBufferBucket';
import {ModelStyle} from '@here/xyz-maps-core';

class ModelTexture extends Texture {
    ref: number = 0;
}

export type ModelData = ModelStyle['data'];

type Model = {
    textures: { [name: string]: ModelTexture }
    parts: { attributes: any, uniforms: any, bbox: any, index?: number[] | Uint16Array | Uint32Array, first?: number, count?: number }[]
}

class ModelFactory {
    private models: { [id: string]: Model } = {};
    private unusedTexture: ModelTexture;
    private gl: WebGLRenderingContext;
    private onBufferDestroyed: (buffer) => void;

    constructor(gl: WebGLRenderingContext) {
        const unusedTexture = new ModelTexture(gl, {width: 1, height: 1, pixels: new Uint8Array([255, 255, 255, 255])});
        unusedTexture.ref = Infinity;
        this.unusedTexture = unusedTexture;
        this.gl = gl;

        this.onBufferDestroyed = (buffer) => {
            if (buffer.attributes.a_position.ref === 0) {
                delete this.models[buffer.id];
            }
        };
    }

    private initTexture(name, imgData, textures) {
        let texture = textures[name];
        if (!texture) {
            texture = new ModelTexture(this.gl, imgData, true);
            textures[name] = texture;
        }
        return texture;
    }

    initModel(id: number, data: ModelData) {
        const {geometries, materials, faces} = data;
        const imgTexData = data.textures || {};


        const sharedAttr = new WeakMap();

        if (!this.models[id] && geometries && faces) {
            const parts: Model['parts'] = [];
            const modelTextures = {
                unusedTexture: this.unusedTexture
            };

            for (let face of faces) {
                // for (let i = 0; i < geometries.length; i++) {
                const geom = geometries[face.geometryIndex];

                if (!geom) continue;

                const material = {
                    diffuse: [1, 1, 1],
                    diffuseMap: 'unusedTexture',
                    opacity: 1,
                    illumination: 1,
                    ...materials?.[face.material]
                };

                let attributes = sharedAttr.get(geom);
                let index;

                if (material.mode == 'Points') {
                    material.pointSize = material.pointSize == undefined ? 1 : material.pointSize;
                } else {
                    material.pointSize = 0;
                }
                delete material.mode;


                if (!attributes) {
                    attributes = ModelBuffer.init(geom);
                    // sharedAttr.set(geom, attributes);
                }


                if (geom.index) {
                    index = geom.index;
                }

                const bbox = geom.bbox ||= ModelBuffer.calcBBox(geom);

                for (let key in material) {
                    if (key.endsWith('Map')) {
                        const textureName = material[key];
                        const imgData = imgTexData[textureName];
                        material[key] = this.initTexture(textureName, imgData, modelTextures);
                    }
                }

                parts.push({attributes, bbox, uniforms: material, index, first: face.first, count: face.count});
            }

            this.models[id] = {textures: modelTextures, parts};
        }
    }

    createModelBuffer(id: string, cullFace?) {
        const model = this.models[id];
        let bufferBucket;
        if (model) {
            bufferBucket = new TemplateBufferBucket<ModelBuffer>();
            let {parts} = model;
            let positionOffset;
            let modelMatrix;
            let undef;

            for (let i = 0; i < parts.length; i++) {
                let {attributes, bbox, uniforms, index, first, count} = parts[i];

                let buffer = new ModelBuffer(undef, undef, modelMatrix, positionOffset);
                // share a single buffer for the model-matrix data across multiple GeometryBuffers of the same model.
                modelMatrix = buffer.flexAttributes.a_modelMatrix;
                positionOffset = buffer.flexAttributes.a_offset;

                for (let name in attributes) {
                    let attribute = attributes[name];
                    attribute.ref = (attribute.ref || 0) + 1;
                    buffer.flexAttributes[name] = attribute;
                }

                for (let name in uniforms) {
                    let uniform = uniforms[name];
                    if (uniform instanceof ModelTexture) {
                        uniform.ref++;
                    }

                    buffer.uniforms[name] = uniform;
                }

                if (index) {
                    buffer.setIndex(index);
                } else {
                    buffer.setArray(first || 0, count);
                }


                buffer.bbox = bbox;
                buffer.cullFace = cullFace;
                buffer.id = id;

                bufferBucket.set(i, buffer);
            }

            (bufferBucket.get(0) as ModelBuffer).destroy = this.onBufferDestroyed;
        }
        return bufferBucket;
    }

    addPosition(
        bufferBucker: TemplateBufferBucket<ModelBuffer>,
        x: number,
        y: number,
        z: number,
        scale: number[],
        translate: number[],
        rotate: number[],
        transform: number[]
    ) {
        const {buffers} = bufferBucker;
        buffers[0].addInstance(x, y, z, scale, translate, rotate, transform);
        for (let i = 1; i < buffers.length; i++) {
            // buffers[i].addPosition(x, y, z, scale, translate, rotate, transform);
            buffers[i].instances = buffers[0].instances;
        }
    }
}

export {ModelFactory};
