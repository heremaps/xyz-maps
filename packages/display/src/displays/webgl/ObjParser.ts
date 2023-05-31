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
import {ModelData} from '@here/xyz-maps-core';
import {XYZWorker} from './XYZWorker';
import {Material} from '@here/xyz-maps-core';

type Face = {
    material: string;
    geometryIndex: number;
};

const worker = function() {
    const DEFAULT = 'default';

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

        const regex = /(\w*)(?: )*(.*)/;
        const lines = text.split('\n');

        for (let l = 0; l < lines.length; l++) {
            const line = lines[l].trim();
            if (line === '' || line.startsWith('#')) {
                continue;
            }
            const [, key, rawValue] = regex.exec(line);
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
                mtlLibs.push(rawValue);
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
        'map_Kd': 'diffuseMap',
        'map_Ns': 'specularMap',
        'map_Bump': 'normalMap',
        'd': 'opacity',
        'illum': 'illumination'
    };

    const parseMTL = (text: string) => {
        let material: Material = {};
        const materials = {};
        const lines = text.split('\n');
        const regex = /(\w*)(?: )*(.*)/;

        for (let l = 0; l < lines.length; l++) {
            const line = lines[l].trim();
            if (line === '' || line.startsWith('#')) {
                continue;
            }
            const [, key, rawValue] = regex.exec(line);
            const values = rawValue.split(/\s+/);

            switch (key) {
            case 'newmtl':
                material = {};
                materials[rawValue] = material;
                break;
            case 'd':
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
            case 'map_Ns':
            case 'map_Bump':
                material[mtlToMaterial[key]] = rawValue;
                break;
                // default: console.warn(`objParser unhandled: ${key}`);
            }
        }
        return materials;
    };

    const loadTextures = async (materials, baseUrl: URL) => {
        const textures = {};
        const promises = [];
        for (let name in materials) {
            const material = materials[name];
            for (let key in material) {
                if (key.endsWith('Map')) {
                    const fileName = material[key];
                    promises.push(
                        (async () => {
                            const response = await fetch(new URL(fileName, baseUrl).href);
                            const blob = await response.blob();
                            const bitmap = await createImageBitmap(blob, {
                                imageOrientation: 'flipY',
                                premultiplyAlpha: 'none',
                                colorSpaceConversion: 'none'
                            });
                            textures[fileName] = bitmap;
                            return bitmap;
                        })()
                    );
                }
            }
        }
        await Promise.all(promises);

        return textures;
    };

    const load = async (objUrl: string): Promise<ModelData> => {
        return (async () => {
            let model: ModelData;

            const response = await fetch(objUrl);
            const txt = await response.text();

            const {geometries, mtlLibs, faces} = parseOBJ(txt);
            const baseHref = new URL(objUrl, location.href);

            const matTxts = await Promise.all(
                mtlLibs.map(async (filename) => {
                    let response = await fetch(new URL(filename, baseHref).href);
                    if (response.status == 200) {
                        return await response.text();
                    }
                })
            );
            const materials = parseMTL(matTxts.join('\n'));
            model = {geometries, materials, faces};
            model.textures = await loadTextures(materials, baseHref);

            return model;
        })();
    };

    async function main({url}) {
        let model: ModelData;
        try {
            model = await load(url);
        } catch (e) {
            return {error: e};
        }
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
    }
};

export class ObjParser extends XYZWorker {
    private inProgress: { [url: string]: Promise<any> } = {};

    main: (args: any) => Promise<ModelData>;

    constructor() {
        super(worker, ['main']);
    }

    async load(url: string): Promise<ModelData> {
        return (this.inProgress[url] ||= (async () => {
            const _url = new URL(url, window.location.href);
            const model: ModelData = await this.main({url: _url.href});
            delete this.inProgress[url];
            // if (!model.geometries || model.geometries.length === 0) return null;
            return model;
        })());
    }
}
