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
import {ModelData, OBJModelSource} from '@here/xyz-maps-core';
import {XYZWorker} from './XYZWorker';
import {Material} from '@here/xyz-maps-core';

type Face = {
    material: string;
    geometryIndex: number;
};


const worker = function() {
    const DEFAULT = 'default';
    const parseLine = (line: string) => {
        const regex = /^(\w+)\s+(.*?)\s*(?:#.*)?$/;
        const [, key, rawValue] = regex.exec(line);
        return [key, rawValue];
    };
    const parseOBJ = (text: string) => {
        const objVertexData: number[][][] = [[], [], [], []];
        const [objPositions, objUVs, objNormals, objColors] = objVertexData;
        const mtlLibs = [];
        const geometries = [];
        const faces = [];
        let groups = [DEFAULT];
        let face: Face = {
            material: DEFAULT,
            geometryIndex: 0
        };
        let object = DEFAULT;
        let vertexData = [[], [], [], []];
        let geometry;

        const newGeometry = () => {
            if (geometry?.position.length) {
                geometry = undefined;
            }
        };

        const setGeometry = () => {
            if (!geometry) {
                vertexData = [[], [], [], []];
                geometry = {
                    position: vertexData[0],
                    uv: vertexData[1],
                    normal: vertexData[2],
                    color: vertexData[3],
                    object,
                    groups
                };
                face.geometryIndex = geometries.length;
                faces.push(face);
                face = {geometryIndex: 0, material: 'default'};
                geometries.push(geometry);
            }
        };

        const addFace = (faceStr: string, colors: number[][]) => {
            const face = faceStr.split('/');
            for (let i = 0; i < face.length; i++) {
                const data = objVertexData[i];
                let index = parseInt(face[i]);
                if (isNaN(index)) continue;
                index += index < 0
                    ? data.length // index is relative from the end
                    : -1;

                vertexData[i].push(...data[index]);
                // copy colors if present
                if (!i && colors) {
                    geometry.color.push(...colors[index]);
                }
            }
        };
        const parseFloatArray = (a) => a.map(parseFloat);

        const lines = text.split('\n');

        for (let l = 0; l < lines.length; l++) {
            const line = lines[l].trim();
            if (line === '' || line.startsWith('#')) {
                continue;
            }
            const [key, rawValue] = parseLine(line);
            let values = rawValue.split(/\s+/);

            switch (key) {
            case 'v':
                if (values.length > 3) {
                    objColors.push(parseFloatArray(values.slice(3)));
                    values = values.slice(0, 3);
                }
                objPositions.push(parseFloatArray(values));
                break;
            case 'vn':
                objNormals.push(parseFloatArray(values));
                break;
            case 'vt':
                objUVs.push(parseFloatArray(values));
                break;
            case 'f':
                setGeometry();
                const colors = objColors.length > 1 ? objColors : null;
                for (let t = 0, triCnt = values.length - 2; t < triCnt; ++t) {
                    addFace(values[0], colors);
                    addFace(values[t + 1], colors);
                    addFace(values[t + 2], colors);
                }
                break;
            case 'mtllib':
                mtlLibs.push(...values);
                break;
            case 'usemtl':
                face.material = rawValue;
                newGeometry();
                break;
            case 'g':
                groups = values;
                newGeometry();
                break;
            case 'o':
                object = rawValue;
                newGeometry();
                break;
                // default: console.warn(`objParser unhandled: ${key}`);
            }
        }
        return {
            faces,
            geometries,
            mtlLibs
        };
    };


    const mtlToMaterial = {
        'Ka': 'ambient',
        'Kd': 'diffuse',
        'Ks': 'specular',
        'Ke': 'emissive',
        'Ns': 'shininess',
        'map_Kd': 'diffuseMap',
        'map_d': 'opacityMap',
        'map_Ks': 'specularMap',
        'map_Ns': 'shininessMap',
        'map_Bump': 'normalMap',
        'd': 'opacity',
        'illum': 'illumination'
    };

    const parseMTL = (text: string) => {
        let material: Material = {};
        const materials = {};
        const lines = text.split('\n');

        for (let l = 0; l < lines.length; l++) {
            const line = lines[l].trim();
            if (line === '' || line.startsWith('#')) {
                continue;
            }
            const [key, rawValue] = parseLine(line);
            const values = rawValue.split(/\s+/);

            switch (key) {
            case 'newmtl':
                material = {};
                materials[rawValue] = material;
                break;
            case 'd':
                material.opacity = parseFloat(values[0]);
                break;
            case 'Tr':
                material.opacity = 1 - parseFloat(values[0]);
                break;
            case 'Ns':
            case 'illum':
                material[mtlToMaterial[key]] = parseFloat(values[0]);
                break;
            case 'Ka':
            case 'Kd':
            case 'Ks':
            case 'Ke':
                material[mtlToMaterial[key]] = values.map(parseFloat);
                break;
            case 'map_Kd':
            case 'map_d':
            case 'map_Ks':
            case 'map_Ns':
            case 'map_Bump':
                material[mtlToMaterial[key]] = rawValue;
                break;
                // default: console.warn(`objParser unhandled: ${key}`);
            }
        }
        return materials;
    };

    const loadTextures = async (materials, baseUrl?: URL, textureUrls?: Record<string, string | Blob>) => {
        const textures = Object.create(null);
        const promises = Object.create(null);
        for (let name in materials) {
            const material = materials[name];
            for (let key in material) {
                if (key.endsWith('Map')) {
                    const fileName = material[key];
                    promises[fileName] ||= (
                        (async () => {
                            const texture = textureUrls && Object.prototype.hasOwnProperty.call(textureUrls, fileName)
                                ? textureUrls[fileName] : fileName;
                            if (texture instanceof Blob) {
                                textures[fileName] = await createImageBitmap(texture, {
                                    imageOrientation: 'flipY',
                                    premultiplyAlpha: 'none',
                                    colorSpaceConversion: 'none'
                                });
                                return textures[fileName];
                            }
                            const url = texture;
                            if (!baseUrl && !/^[a-z][a-z\d+.-]*:/i.test(url)) {
                                throw new Error(`Relative OBJ texture "${fileName}" requires baseUrl or an absolute textures entry`);
                            }
                            const response = await fetch(new URL(url, baseUrl).href);
                            if (!response.ok) {
                                throw new Error(`Failed to load OBJ texture "${fileName}": ${response.status}`);
                            }
                            const blob = await response.blob();
                            const bitmap = await createImageBitmap(blob, {
                                imageOrientation: 'flipY',
                                premultiplyAlpha: 'none',
                                colorSpaceConversion: 'none'
                            });
                            textures[fileName] = bitmap;
                            return bitmap;
                        })().catch((error) => {
                            console.warn(`Failed to load OBJ texture "${fileName}"; rendering without this texture:`, error);
                        })
                    );
                }
            }
        }
        await Promise.all(Object.values(promises));

        for (let name in materials) {
            const material = materials[name];
            for (let key in material) {
                if (key.endsWith('Map') && !textures[material[key]]) {
                    delete material[key];
                }
            }
        }

        return textures;
    };

    const load = async (objUrl: string): Promise<ModelData> => {
        return (async () => {
            let model: ModelData;

            const response = await fetch(objUrl);
            if (!response.ok) {
                throw new Error(`Failed to load OBJ "${objUrl}": ${response.status}`);
            }
            const txt = await response.text();

            const {geometries, mtlLibs, faces} = parseOBJ(txt);
            const baseHref = new URL(objUrl, location.href);

            const matTxts = await Promise.all(
                mtlLibs.map(async (filename) => {
                    let response = await fetch(new URL(filename, baseHref).href);
                    if (response.ok) {
                        return await response.text();
                    } else {
                        throw new Error(`Failed to load OBJ material library "${filename}": ${response.status}`);
                    }
                })
            );
            const materials = parseMTL(matTxts.join('\n'));
            model = {geometries, materials, faces};
            model.textures = await loadTextures(materials, baseHref);

            return model;
        })();
    };
    const loadInline = async (source: OBJModelSource): Promise<ModelData> => {
        const objText = source.obj instanceof Blob ? await source.obj.text() : source.obj;
        const {geometries, faces, mtlLibs} = parseOBJ(objText);
        let text = '';
        if (typeof source.mtl == 'string') {
            text = source.mtl;
        } else if (source.mtl instanceof Blob) {
            text = await source.mtl.text();
        } else if (source.mtl) {
            const filenames = mtlLibs.length ? mtlLibs : Object.keys(source.mtl);
            text = (await Promise.all(filenames.map(async (filename) => {
                if (!Object.prototype.hasOwnProperty.call(source.mtl, filename)) {
                    throw new Error(`Missing inline OBJ material library "${filename}"`);
                }
                const material = source.mtl[filename];
                return material instanceof Blob ? await material.text() : material;
            }))).join('\n');
        }
        const materials = parseMTL(text);

        const textures = await loadTextures(materials, source.baseUrl ? new URL(source.baseUrl) : undefined, source.textures);
        return {geometries, faces, materials, textures};
    };
    return async ({url, source})=>{
        const model = source ? await loadInline(source) : await load(url);
        let transfer = [];
        for (let geom of model.geometries) {
            for (let name of ['position', 'uv', 'normal', 'color']) {
                if (geom[name]) {
                    if (geom[name].length) {
                        geom[name] = new Float32Array(geom[name]);
                        transfer.push(geom[name].buffer);
                    } else {
                        delete geom[name];
                    }
                }
            }
        }
        for (let name in model.textures) {
            transfer.push(model.textures[name]);
        }
        return {message: model, transfer};
    };
};


export class ObjParser extends XYZWorker {
    private inProgress: { [url: string]: Promise<any> } = {};

    main: (args: any) => Promise<ModelData>;

    constructor() {
        super(worker);
    }

    loadInline(source: OBJModelSource): Promise<ModelData> {
        return this.main({source: {
            ...source,
            baseUrl: source.baseUrl ? new URL(source.baseUrl, window.top.location.href).href : undefined
        }});
    }

    async load(url: string): Promise<ModelData> {
        return (this.inProgress[url] ||= (async () => {
            const _url = new URL(url, window.top.location.href);
            // const _url = new URL(url, window.location.href);
            let model: ModelData;
            try {
                model = await this.main({url: _url.href});
            } finally {
                delete this.inProgress[url];
            }
            // if (!model.geometries || model.geometries.length === 0) return null;
            return model;
        })());
    }
}
