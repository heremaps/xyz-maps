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
import {Texture, TextureOptions} from '../Texture';
import {ModelBuffer} from './templates/ModelBuffer';
import {TemplateBufferBucket} from './templates/TemplateBufferBucket';
import {ModelData} from '@here/xyz-maps-core';
import {ObjParser} from '../ObjParser';
import {vec3} from '@here/xyz-maps-common';

class ModelTexture extends Texture {
    ref: number = 0;
}

type TextureData = HTMLCanvasElement | HTMLImageElement | { width: number; height: number; pixels?: Uint8Array };

type Model = {
    textures: { [name: string]: ModelTexture };
    parts: {
        attributes: any;
        uniforms: any;
        bbox: any;
        index?: number[] | Uint16Array | Uint32Array;
        first?: number;
        count?: number;
    }[];
};

interface MaterialUniforms extends Omit<Material, 'diffuseMap' | 'specularMap' | 'normalMap'> {
    diffuseMap?: ModelTexture | string;
    specularMap?: ModelTexture | string;
    normalMap?: ModelTexture | string;
    u_textureSize?: number[];
}

type ModelTextures = {
    [id: string]: ModelTexture;
}

class ModelFactory {
    // false means the model has already been processed and is invalid, preventing further processing.
    private models: { [id: string]: Model | false } = {};
    private unusedTexture: ModelTexture;
    private gl: WebGLRenderingContext;
    private onBufferDestroyed: (buffer) => void;
    private objParser: ObjParser;
    private unusedNormalTexture: ModelTexture;

    constructor(gl: WebGLRenderingContext) {
        const unusedTexture = new ModelTexture(gl, {width: 1, height: 1, data: new Uint8Array([255, 255, 255, 255])});
        unusedTexture.ref = Infinity;
        this.unusedTexture = unusedTexture;

        const unusedNormalTexture = new ModelTexture(gl, {
            width: 1,
            height: 1,
            data: new Uint8Array([127, 127, 255, 255])
        });
        unusedNormalTexture.ref = Infinity;
        this.unusedNormalTexture = unusedNormalTexture;

        this.gl = gl;

        this.onBufferDestroyed = (buffer) => {
            if (buffer.attributes.a_position.ref === 0) {
                delete this.models[buffer.id];
            }
        };

        this.objParser = new ObjParser();
    }

    destroy() {
        this.objParser.destroy();
    }

    private isValid(model: ModelData): boolean {
        return !!(model?.faces?.length && model.geometries?.[model.faces[0].geometryIndex]);
        // return !!(model?.geometries?.length && model.faces?.length);
    }

    async loadObj(url: string) {
        const data = await this.objParser.load(url);
        return this.initModel(url, data);
    }

    private initTexture(name: string, imgData: TextureData, textures: ModelTextures, options?: TextureOptions) {
        let texture = textures[name];
        if (!texture) {
            texture = new ModelTexture(this.gl, imgData, options);
            textures[name] = texture;
        }
        return texture;
    }

    getModel(id: number | string): Model | false {
        return this.models[id];
    }

    initModel(id: number | string, data: ModelData): Model | false {
        if (this.models[id] != undefined) return this.models[id];

        if (this.isValid(data)) {
            const {geometries, materials, faces} = data;
            const sharedAttr = new WeakMap();
            const imgTexData = data.textures || {};
            const parts: Model['parts'] = [];
            const modelTextures: ModelTextures = {
                unusedTexture: this.unusedTexture,
                unusedNormalTexture: this.unusedNormalTexture
            };

            for (let face of faces) {
                const geom = geometries[face.geometryIndex];

                if (!geom) continue;

                const material = {
                    diffuse: [1, 1, 1],
                    diffuseMap: 'unusedTexture',
                    opacity: 1,
                    illumination: 1,
                    ambient: [1, 1, 1],
                    specular: [1, 1, 1],
                    specularMap: 'unusedTexture',
                    shininess: 0,
                    normalMap: 'unusedNormalTexture',
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
                material.pointSize = (material.mode == 'Points') ? (material.pointSize ?? 1) : 0;

                if (!attributes) {
                    attributes = ModelBuffer.init(geom);
                    // sharedAttr.set(geom, attributes);
                }

                if (geom.index) {
                    index = geom.index;
                }

                const bbox = (geom.bbox ||= ModelBuffer.calcBBox(geom));

                const uniforms: MaterialUniforms = material;


                for (let key in material) {
                    if (key.endsWith('Map')) {
                        const textureName = uniforms[key];
                        const imgData = imgTexData[textureName];

                        let wrap = material.wrap;
                        let wrapS: GLenum = this.gl.REPEAT;
                        let wrapT: GLenum = this.gl.REPEAT;

                        if (typeof wrap == 'string') {
                            wrap = [wrap, wrap];
                        }

                        if (Array.isArray(wrap)) {
                            [wrapS, wrapT] = wrap.map((w) => w == 'clamp'
                                ? this.gl.CLAMP_TO_EDGE
                                : w == 'mirror'
                                    ? this.gl.MIRRORED_REPEAT
                                    : this.gl.REPEAT
                            );
                        }

                        uniforms[key] = this.initTexture(textureName, imgData, modelTextures, {flipY: material.flipY, wrapS, wrapT});
                    }
                }


                const diffuseMap = uniforms.diffuseMap as ModelTexture;
                if (!uniforms.useUVMapping && diffuseMap) {
                    uniforms.u_textureSize = [diffuseMap.width, diffuseMap.height];
                }

                // cleanup to be used as uniforms
                delete uniforms.mode;

                parts.push({attributes, bbox, uniforms, index, first: face.start, count: face.count});
            }

            this.models[id] = {textures: modelTextures, parts};
        } else {
            // invalid model description
            console.warn('ModelError:', data || id);
            this.models[id] = false;
        }
        return this.models[id];
    }

    createModelBuffer(
        id: string,
        specular?: [number, number, number],
        shininess?: number,
        emissive?: [number, number, number],
        cullFace?: number) {
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

                const bufferUniforms = buffer.uniforms;
                for (let name in uniforms) {
                    let uniform = uniforms[name];
                    if (uniform instanceof ModelTexture) {
                        uniform.ref++;
                    }
                    bufferUniforms[name] = uniform;
                }

                if (specular) {
                    bufferUniforms.specular = vec3.add([], bufferUniforms.specular as number[], specular);
                    (bufferUniforms.shininess as number) += shininess;
                }
                if (emissive) {
                    if (bufferUniforms.emissive) {
                        bufferUniforms.emissive = vec3.add([], bufferUniforms.emissive as number[], emissive);
                    } else {
                        bufferUniforms.emissive = emissive;
                    }
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
