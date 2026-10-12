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
import {Texture, TextureOptions, ImageData, TextureData} from '../Texture';
import {ModelBuffer} from './templates/ModelBuffer';
import {TemplateBufferBucket} from './templates/TemplateBufferBucket';
import {
    Material,
    ModelAlphaMode,
    ModelData,
    ModelMaterialOverride,
    OBJModelSource
} from '@here/xyz-maps-core';
import {ObjParser} from '../ObjParser';
import {vec3} from '@here/xyz-maps-common';
import {type TypedArray} from './glType';
import {GraphicsDevice} from '../device/GraphicsDevice';

class ModelTexture extends Texture {
    ref: number = 0;
}

type Model = {
    textures: { [name: string]: ModelTexture };
    parts: {
        materialName: string;
        alphaMode?: ModelAlphaMode;
        alphaCutoff?: number;
        attributes: any;
        uniforms: any;
        bbox: any;
        index?: number[] | Uint16Array | Uint32Array;
        first?: number;
        count?: number;
    }[];
};

interface MaterialUniforms extends Omit<Material, 'diffuseMap' | 'specularMap' | 'shininessMap' | 'normalMap' | 'opacityMap' | 'alphaMode'> {
    diffuseMap?: ModelTexture | string;
    specularMap?: ModelTexture | string;
    shininessMap?: ModelTexture | string;
    normalMap?: ModelTexture | string;
    opacityMap?: ModelTexture | string;
    // u_textureSize?: number[];
}

type ModelAlphaOptions = {
    alphaMode?: ModelAlphaMode;
    alphaCutoff?: number;
    materialOverrides?: Record<string, ModelMaterialOverride>;
};

type ModelTextures = {
    [id: string]: ModelTexture;
}

class ModelFactory {
    // false means the model has already been processed and is invalid, preventing further processing.
    private models: { [id: string]: Model | false } = {};
    private inlineSources = new WeakMap<OBJModelSource, {id: string; loading?: Promise<Model | false>}>();
    private inlineId = 0;
    private unusedTexture: ModelTexture;
    private onBufferDestroyed: (buffer) => void;
    private objParser: ObjParser;
    private unusedNormalTexture: ModelTexture;
    private device: GraphicsDevice;

    constructor(device: GraphicsDevice) {
        const unusedTexture = new ModelTexture(device, {width: 1, height: 1, data: new Uint8Array([255, 255, 255, 255])});
        unusedTexture.ref = Infinity;
        this.unusedTexture = unusedTexture;

        const unusedNormalTexture = new ModelTexture(device, {
            width: 1,
            height: 1,
            data: new Uint8Array([127, 127, 255, 255])
        });
        unusedNormalTexture.ref = Infinity;
        this.unusedNormalTexture = unusedNormalTexture;

        this.device = device;

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

    getSourceId(source: string | ModelData | OBJModelSource): string {
        if (typeof source === 'string') return source;
        if ('format' in source && source.format === 'obj') return this.getInlineId(source);
        return String((source as ModelData & {id?: string | number}).id ||= Math.random());
    }

    getInlineId(source: OBJModelSource): string {
        let entry = this.inlineSources.get(source);
        if (!entry) {
            entry = {id: `inline-obj:${this.inlineId++}`};
            this.inlineSources.set(source, entry);
        }
        return entry.id;
    }

    loadInline(source: OBJModelSource): Promise<Model | false> {
        const id = this.getInlineId(source);
        const entry = this.inlineSources.get(source);
        return entry.loading ||= this.objParser.loadInline(source).then((data) => {
            delete entry.loading;
            return this.initModel(id, data);
        }, (error) => {
            this.models[id] = false;
            throw error;
        });
    }

    private initTexture(name: string, imgData: ImageData, textures: ModelTextures, options?: TextureOptions) {
        let texture = textures[name];
        if (!texture) {
            texture = new ModelTexture(this.device, imgData, options);
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

                const materialName = face.material;
                const material: Material = {
                    diffuse: [1, 1, 1],
                    diffuseMap: 'unusedTexture',
                    opacity: 1,
                    alphaCutoff: 0.5,
                    illumination: 2,
                    ambient: [1, 1, 1],
                    specular: [1, 1, 1],
                    specularMap: 'unusedTexture',
                    shininess: 0,
                    normalMap: 'unusedNormalTexture',
                    useUVMapping: true,
                    ...materials?.[materialName]
                };
                const alphaMode = material.alphaMode;
                const alphaCutoff = material.alphaCutoff;

                let attributes = sharedAttr.get(geom);
                const index = geom.index;

                material.pointSize = material.mode == 'Points' ? (material.pointSize ?? 1) : 0;

                if (!attributes) {
                    attributes = ModelBuffer.init(geom);
                    // sharedAttr.set(geom, attributes);
                }


                const bbox = (geom.bbox ||= ModelBuffer.calcBBox(geom));
                const uniformMaterial = {...material};
                delete uniformMaterial.alphaMode;
                const uniforms: MaterialUniforms = {...uniformMaterial};

                const gl = this.device.gl;

                for (let key in uniforms) {
                    if (key.endsWith('Map')) {
                        const textureName = uniforms[key];
                        let imgData = imgTexData[textureName];
                        let wrap = material.wrap;
                        let wrapS: GLenum = gl.REPEAT;
                        let wrapT: GLenum = gl.REPEAT;

                        if (typeof wrap == 'string') {
                            wrap = [wrap, wrap];
                        }

                        if (Array.isArray(wrap)) {
                            [wrapS, wrapT] = wrap.map((w) => w == 'clamp'
                                ? gl.CLAMP_TO_EDGE
                                : w == 'mirror'
                                    ? gl.MIRRORED_REPEAT
                                    : gl.REPEAT
                            );
                        }

                        const texOptions: TextureOptions = {
                            flipY: material.flipY,
                            premultiplyAlpha: false,
                            wrapS,
                            wrapT
                        };
                        uniforms[key] = this.initTexture(textureName, imgData, modelTextures, texOptions);
                    }
                }

                // const diffuseMap = uniforms.diffuseMap as ModelTexture;
                // if (!uniforms.useUVMapping && diffuseMap) {
                //     const uvScale = material.uvScale || 1;
                //     uniforms.u_textureSize = [diffuseMap.width * uvScale, diffuseMap.height * uvScale];
                // }

                // cleanup to be used as uniforms
                delete uniforms.mode;
                delete uniforms.flipY;

                parts.push({
                    materialName,
                    alphaMode,
                    alphaCutoff,
                    attributes,
                    bbox,
                    uniforms,
                    index,
                    first: face.start,
                    count: face.count
                });
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
        specular: [number, number, number],
        shininess: number,
        emissive: [number, number, number],
        cullFace: number,
        ModelBufferClass: typeof ModelBuffer = ModelBuffer,
        alphaOptions?: ModelAlphaOptions
    ) {
        const model = this.models[id];
        let bufferBucket;
        if (model) {
            bufferBucket = new TemplateBufferBucket<ModelBuffer>();
            let {parts} = model;
            let positionOffset;
            let modelMatrix;
            let undef;

            for (let i = 0; i < parts.length; i++) {
                let {materialName, alphaMode, alphaCutoff, attributes, bbox, uniforms, index, first, count} = parts[i];

                let buffer = new ModelBufferClass(undef, undef, modelMatrix, positionOffset);
                const materialOverride = alphaOptions?.materialOverrides?.[materialName];
                const requestedAlphaMode = materialOverride?.alphaMode
                    ?? alphaOptions?.alphaMode
                    ?? alphaMode
                    ?? 'auto';
                buffer.alphaMode = requestedAlphaMode === 'auto'
                    ? (Number(uniforms.opacity) < 1 || uniforms.opacityMap ? 'blend' : 'opaque')
                    : requestedAlphaMode;
                buffer.alphaCutoff = materialOverride?.alphaCutoff
                    ?? alphaOptions?.alphaCutoff
                    ?? alphaCutoff
                    ?? 0.5;
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
                bufferUniforms.alphaCutoff = buffer.alphaCutoff;

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
        scale?: number[],
        translate?: number[],
        rotate?: number[],
        transform?: number[]
    ) {
        const {buffers} = bufferBucker;
        const [firstBuffer] = buffers;
        firstBuffer.addInstance(x, y, z, scale, translate, rotate, transform);
        for (let i = 1; i < buffers.length; i++) {
            // buffers[i].addInstance(x, y, z, scale, translate, rotate, transform);
            buffers[i].instances = firstBuffer.instances;
            buffers[i].uniforms.u_normalMatrix = firstBuffer.uniforms.u_normalMatrix;
        }
    }
}

export {ModelFactory};
