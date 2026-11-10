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
import {Texture, TextureOptions, ImageData, TextureData} from '../../Texture';
import {ModelBuffer} from '../types/ModelBuffer';
import type {FlexAttribute} from '../GeometryBuffer';
import {
    Material,
    ModelAlphaMode,
    ModelData,
    ModelGeometry,
    OBJModelSource
} from '@here/xyz-maps-core';
import {ObjParser} from '../../ObjParser';
import {isTypedArray} from '../glType';
import {GraphicsDevice} from '../../device/GraphicsDevice';

export class ModelTexture extends Texture {
    ref: number = 0;

    constructor(device: GraphicsDevice, private source?: ImageData, options?: TextureOptions) {
        super(device, source, options);
    }

    restore(): void {
        if (this.isDestroyed()) this.set(this.source);
    }
}

export type PreparedModel = {
    references: number;
    textures: { [name: string]: ModelTexture };
    parts: {
        materialName: string;
        alphaMode?: ModelAlphaMode;
        alphaCutoff?: number;
        attributes: NonNullable<ModelBuffer['flexAttributes']>;
        uniforms: MaterialUniforms;
        bbox: number[];
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

type ModelTextures = {
    [id: string]: ModelTexture;
}


const normalizeLegacyModelTexture = (image: ImageData | undefined): ImageData | undefined => {
    const legacyPixels = (image as ImageData & {pixels?: TextureData['data']})?.pixels;
    if (isTypedArray(legacyPixels)) {
        return {
            width: image.width,
            height: image.height,
            data: legacyPixels,
            flipY: (image as TextureData).flipY
        };
    }
    return image;
};

export class ModelResourceCache {
    // false means the model has already been processed and is invalid, preventing further processing.
    private models: { [id: string]: PreparedModel | false } = {};
    private inlineSources = new WeakMap<OBJModelSource, { id: string; loading?: Promise<PreparedModel | false> }>();
    private bufferModels = new WeakMap<ModelBuffer, PreparedModel>();
    private references = 0;
    private destroyed = false;
    private inlineId = 0;
    private unusedTexture: ModelTexture;
    private objParser: ObjParser;
    private unusedNormalTexture: ModelTexture;

    constructor(private device: GraphicsDevice) {}

    private initDefaultTextures() {
        if (this.unusedTexture) return;

        const unusedTexture = new ModelTexture(this.device, {
            width: 1,
            height: 1,
            data: new Uint8Array([255, 255, 255, 255])
        });
        unusedTexture.ref = Infinity;
        this.unusedTexture = unusedTexture;

        const unusedNormalTexture = new ModelTexture(this.device, {
            width: 1,
            height: 1,
            data: new Uint8Array([127, 127, 255, 255])
        });
        unusedNormalTexture.ref = Infinity;
        this.unusedNormalTexture = unusedNormalTexture;
    }

    destroy() {
        if (this.destroyed) return;
        this.destroyed = true;
        this.objParser?.destroy();
        for (const model of Object.values(this.models)) {
            if (!model || model.references) continue;
            for (const texture of new Set(Object.values(model.textures))) {
                if (texture.ref === 0) texture.destroy();
            }
        }
        this.models = {};
        this.inlineSources = new WeakMap();
        this.releaseDefaultTextures();
    }

    private releaseDefaultTextures() {
        if (this.destroyed && !this.references) {
            this.unusedTexture?.destroy();
            this.unusedNormalTexture?.destroy();
        }
    }

    acquireBuffer(model: PreparedModel, buffer: ModelBuffer): void {
        if (this.destroyed) throw new Error('Cannot acquire resources from a destroyed ModelResourceCache');
        model.references++;
        this.references++;
        this.bufferModels.set(buffer, model);
        for (const attribute of Object.values(buffer.flexAttributes)) {
            if ('value' in attribute) continue;
            const shared = attribute as FlexAttribute & {ref?: number};
            shared.ref = (shared.ref || 0) + 1;
        }
        for (const uniform of Object.values(buffer.uniforms)) {
            if (uniform instanceof ModelTexture) {
                uniform.restore();
                uniform.ref++;
            }
        }
        buffer.destroy = this.releaseBuffer;
    }

    private releaseBuffer = (buffer: ModelBuffer): void => {
        const model = this.bufferModels.get(buffer);
        if (!model) throw new Error('Model buffer resources have already been released');
        this.bufferModels.delete(buffer);
        this.references--;
        if (--model.references === 0 && this.models[buffer.id] === model) {
            delete this.models[buffer.id];
        }
        this.releaseDefaultTextures();
    };

    private getParser(): ObjParser {
        if (this.destroyed) throw new Error('Cannot load models from a destroyed ModelResourceCache');
        return this.objParser ||= new ObjParser();
    }

    private isValid(model: ModelData): boolean {
        return !!(model?.faces?.length && model.geometries?.[model.faces[0].geometryIndex]);
        // return !!(model?.geometries?.length && model.faces?.length);
    }

    async loadObj(url: string) {
        const data = await this.getParser().load(url);
        return this.initModel(url, data);
    }

    getSourceId(source: string | ModelData | OBJModelSource): string {
        if (typeof source === 'string') return source;
        if ('format' in source && source.format === 'obj') return this.getInlineId(source);
        return String((source as ModelData & { id?: string | number }).id ||= Math.random());
    }

    getInlineId(source: OBJModelSource): string {
        let entry = this.inlineSources.get(source);
        if (!entry) {
            entry = {id: `inline-obj:${this.inlineId++}`};
            this.inlineSources.set(source, entry);
        }
        return entry.id;
    }

    loadInline(source: OBJModelSource): Promise<PreparedModel | false> {
        const id = this.getInlineId(source);
        const entry = this.inlineSources.get(source);
        return entry.loading ||= this.getParser().loadInline(source).then((data) => {
            delete entry.loading;
            return this.initModel(id, data);
        }, (error) => {
            if (!this.destroyed) this.models[id] = false;
            throw error;
        });
    }

    private initTexture(name: string, imgData: ImageData | undefined, textures: ModelTextures, options?: TextureOptions) {
        let texture = textures[name];
        if (!texture) {
            texture = new ModelTexture(this.device, imgData, options);
            textures[name] = texture;
        }
        return texture;
    }

    getModel(id: number | string): PreparedModel | false | undefined {
        return this.models[id];
    }

    initModel(id: number | string, data: ModelData): PreparedModel | false {
        if (this.destroyed) throw new Error('Cannot prepare models in a destroyed ModelResourceCache');
        if (this.models[id] != undefined) return this.models[id];

        if (this.isValid(data)) {
            const {geometries, materials, faces} = data;
            const imgTexData = data.textures || {};
            const parts: PreparedModel['parts'] = [];
            const sharedAttributes = new WeakMap<ModelGeometry, NonNullable<ModelBuffer['flexAttributes']>>();
            const modelTextures: ModelTextures = {};

            for (let face of faces) {
                const geom = geometries[face.geometryIndex];

                if (!geom) continue;

                const count = geom.index
                    ? geom.index.length
                    : face.count ?? geom.position.length / (geom.size ?? 3) - (face.start || 0);
                // Empty parts must not acquire shared attributes or textures that will never be finalized/released.
                if (!geom.position.length || count === 0) continue;

                if (!parts.length) {
                    this.initDefaultTextures();
                    modelTextures.unusedTexture = this.unusedTexture;
                    modelTextures.unusedNormalTexture = this.unusedNormalTexture;
                }

                const materialName = face.material;
                const material: Material = {
                    diffuse: [1, 1, 1],
                    diffuseMap: 'unusedTexture',
                    opacity: 1,
                    alphaCutoff: 0.5,
                    illumination: 2,
                    ambient: [1, 1, 1],
                    specular: [0, 0, 0],
                    emissive: [0, 0, 0],
                    specularMap: 'unusedTexture',
                    shininess: 0,
                    normalMap: 'unusedNormalTexture',
                    useUVMapping: true,
                    ...materials?.[materialName]
                };
                const alphaMode = material.alphaMode;
                const alphaCutoff = material.alphaCutoff;

                const index = geom.index;

                material.pointSize = material.mode == 'Points' ? (material.pointSize ?? 1) : 0;
                let attributes = sharedAttributes.get(geom);
                if (!attributes) {
                    attributes = ModelBuffer.init(geom);
                    sharedAttributes.set(geom, attributes);
                }

                const bbox = (geom.bbox ||= ModelBuffer.calcBBox(geom));
                const uniformMaterial = {...material};
                delete uniformMaterial.alphaMode;
                const uniforms: MaterialUniforms = {...uniformMaterial};

                const gl = this.device.gl;

                for (let key in uniforms) {
                    if (key.endsWith('Map')) {
                        const textureName = uniforms[key];
                        const imgData = normalizeLegacyModelTexture(imgTexData[textureName]);
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

            if (parts.length) {
                this.models[id] = {references: 0, textures: modelTextures, parts};
            } else {
                console.warn('ModelError:', data || id);
                this.models[id] = false;
            }
        } else {
            // invalid model description
            console.warn('ModelError:', data || id);
            this.models[id] = false;
        }
        return this.models[id];
    }
}
