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
import type {Material, ModelData, ModelTextureData, OBJModelSource} from '@here/xyz-maps-core';
import {XYZWorker} from './XYZWorker';

type Face = {
    material: string;
    geometryIndex: number;
};

const worker = function() {
    const DEFAULT = 'default';
    const isModelTextureData = (value: unknown): value is ModelTextureData => !!value
        && typeof value == 'object'
        && 'width' in value
        && 'height' in value
        && 'data' in value;

    const parseLine = (line: string) => {
        const regex = /^(\w+)\s+(.*?)\s*(?:#.*)?$/;
        const [, key, rawValue] = regex.exec(line);
        return [key, rawValue];
    };

    let timeTotal = 0;
    let bytesTotal = 0;

    const parseOBJData = (text: string | Uint8Array) => {
        const bytes = (typeof text === 'string' ? (new Blob([text])).size : text.length);
        bytesTotal += bytes;

        // console.log('[OBJ Parser] type:',typeof text, (bytes / 1024).toFixed(2),
        //     'kb, total:', (bytesTotal / 1024).toFixed(2), 'kb'
        // );

        const len = text.length;
        let cursor = 0;
        let codeAt: (index: number) => number;
        let stringFromRange: (start: number, end: number) => string;
        if (typeof text === 'string') {
            const stringData = text;
            codeAt = (index) => stringData.charCodeAt(index);
            stringFromRange = (start, end) => stringData.substring(start, end);
        } else {
            const byteData = text;
            const decoder = new TextDecoder();
            codeAt = (index) => byteData[index];
            stringFromRange = (start, end) => decoder.decode(byteData.subarray(start, end));
        }
        if (codeAt(0) === 0xFEFF) {
            cursor = 1;
        } else if (codeAt(0) === 0xEF && codeAt(1) === 0xBB && codeAt(2) === 0xBF) {
            cursor = 3;
        }
        const isWhitespace = (code: number) => code === 32 || code === 9 || code === 13 || code === 11 || code === 12;
        const isLineEnd = (code: number) => code === 10 || code === 13;
        const isValueTerminator = (code: number) => isWhitespace(code) || code === 10 || code === 35;
        const skipWhitespace = () => {
            while (cursor < len && isWhitespace(codeAt(cursor))) {
                cursor++;
            }
        };
        const skipToNextLine = () => {
            while (cursor < len && codeAt(cursor) !== 10) {
                cursor++;
            }
            if (cursor < len) {
                cursor++;
            }
        };
        const matchesText = (value: string, index: number) => {
            if (index + value.length > len) {
                return false;
            }
            for (let i = 0; i < value.length; i++) {
                if (codeAt(index + i) !== value.charCodeAt(i)) {
                    return false;
                }
            }
            return true;
        };
        const matchesKeyword = (keyword: string) => matchesText(keyword, cursor)
            && isWhitespace(codeAt(cursor + keyword.length));
        const readFloat = () => {
            const tokenStart = cursor;
            let sign = 1;
            let code = codeAt(cursor);
            if (code === 45) {
                sign = -1;
                cursor++;
            } else if (code === 43) {
                cursor++;
            }

            if (codeAt(cursor) === 73 && matchesText('Infinity', cursor)) {
                cursor += 8;
                while (cursor < len && !isValueTerminator(codeAt(cursor))) {
                    cursor++;
                }
                return sign * Infinity;
            }

            let value = 0;
            let digitCount = 0;
            while (cursor < len) {
                code = codeAt(cursor);
                if (code < 48 || code > 57) {
                    break;
                }
                value = value * 10 + code - 48;
                cursor++;
                digitCount++;
            }

            if (codeAt(cursor) === 46) {
                cursor++;
                let fraction = 0.1;
                while (cursor < len) {
                    code = codeAt(cursor);
                    if (code < 48 || code > 57) {
                        break;
                    }
                    value += (code - 48) * fraction;
                    fraction *= 0.1;
                    cursor++;
                    digitCount++;
                }
            }

            if (!digitCount) {
                cursor = tokenStart;
                while (cursor < len && !isValueTerminator(codeAt(cursor))) {
                    cursor++;
                }
                return NaN;
            }

            let exponent = 0;
            code = codeAt(cursor);
            if (code === 101 || code === 69) {
                let expCursor = cursor + 1;
                let expSign = 1;
                code = codeAt(expCursor);
                if (code === 45) {
                    expSign = -1;
                    expCursor++;
                } else if (code === 43) {
                    expCursor++;
                }

                let expValue = 0;
                let expDigitCount = 0;
                while (expCursor < len) {
                    code = codeAt(expCursor);
                    if (code < 48 || code > 57) {
                        break;
                    }
                    expValue = expValue * 10 + code - 48;
                    expCursor++;
                    expDigitCount++;
                }
                if (expDigitCount) {
                    exponent = expSign * expValue;
                    cursor = expCursor;
                }
            }

            const result = sign * value;
            while (cursor < len && !isValueTerminator(codeAt(cursor))) {
                cursor++;
            }
            return exponent && result ? result * Math.pow(10, exponent) : result;
        };
        type NumberBuffer = {
            values: number[];
            offsets: number[];
        };
        const readNumberValues = (target: NumberBuffer, maxValues = Infinity, overflow?: NumberBuffer) => {
            target.offsets.push(target.values.length);
            let valueCount = 0;
            while (cursor < len) {
                skipWhitespace();
                const code = codeAt(cursor);
                if (cursor >= len || isLineEnd(code) || code === 35) {
                    break;
                }
                const value = readFloat();
                if (valueCount < maxValues) {
                    target.values.push(value);
                } else if (overflow) {
                    if (valueCount === maxValues) {
                        overflow.offsets.push(overflow.values.length);
                    }
                    overflow.values.push(value);
                }
                valueCount++;
            }
        };
        const readStringToken = () => {
            skipWhitespace();
            const start = cursor;
            while (cursor < len) {
                const code = codeAt(cursor);
                if (isLineEnd(code) || code === 35) {
                    break;
                }
                cursor++;
            }
            let end = cursor;
            while (end > start && isWhitespace(codeAt(end - 1))) {
                end--;
            }
            return stringFromRange(start, end);
        };
        const readStringTokens = () => {
            const tokens: string[] = [];
            while (cursor < len) {
                skipWhitespace();
                const code = codeAt(cursor);
                if (cursor >= len || isLineEnd(code) || code === 35) {
                    break;
                }
                const start = cursor;
                while (cursor < len && !isValueTerminator(codeAt(cursor))) {
                    cursor++;
                }
                tokens.push(stringFromRange(start, cursor));
            }
            return tokens;
        };
        const readFaceIndex = () => {
            let sign = 1;
            let code = codeAt(cursor);
            if (code === 45) {
                sign = -1;
                cursor++;
            } else if (code === 43) {
                cursor++;
            }

            let index = 0;
            let digitCount = 0;
            while (cursor < len) {
                code = codeAt(cursor);
                if (code < 48 || code > 57) {
                    break;
                }
                index = index * 10 + code - 48;
                cursor++;
                digitCount++;
            }
            const result = digitCount ? sign * index : NaN;
            while (cursor < len) {
                code = codeAt(cursor);
                if (code === 47 || isValueTerminator(code)) {
                    break;
                }
                cursor++;
            }
            return result;
        };

        const createNumberBuffer = (): NumberBuffer => ({
            values: [],
            offsets: []
        });
        const objPositions = createNumberBuffer();
        const objUVs = createNumberBuffer();
        const objNormals = createNumberBuffer();
        const objColors = createNumberBuffer();
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

        const appendNumberValues = (target: number[], source: NumberBuffer, index: number) => {
            let start = source.offsets[index];
            if (start === undefined) {
                throw new Error('Invalid OBJ face reference');
            }
            const end = source.offsets[index + 1] ?? source.values.length;
            do {
                target[target.length] = source.values[start];
            } while (++start < end);
        };

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

        const addFace = (
            positionIndex: number,
            uvIndex: number,
            normalIndex: number,
            colors: NumberBuffer | null
        ) => {
            if (!isNaN(positionIndex)) {
                positionIndex += positionIndex < 0 ? objPositions.offsets.length : -1;
                appendNumberValues(vertexData[0], objPositions, positionIndex);
                if (colors) {
                    appendNumberValues(geometry.color, colors, positionIndex);
                }
            }
            if (!isNaN(uvIndex)) {
                uvIndex += uvIndex < 0 ? objUVs.offsets.length : -1;
                appendNumberValues(vertexData[1], objUVs, uvIndex);
            }
            if (!isNaN(normalIndex)) {
                normalIndex += normalIndex < 0 ? objNormals.offsets.length : -1;
                appendNumberValues(vertexData[2], objNormals, normalIndex);
            }
        };

        while (cursor < len) {
            skipWhitespace();
            if (cursor >= len) {
                break;
            }
            const firstCode = codeAt(cursor);
            if (firstCode === 35 || firstCode === 10) {
                skipToNextLine();
                continue;
            }

            if (// firstCode === 118 &&
                matchesKeyword('vn')) {
                cursor += 2;
                readNumberValues(objNormals);
                skipToNextLine();
                continue;
            }
            if (// firstCode === 118 &&
                matchesKeyword('vt')) {
                cursor += 2;
                readNumberValues(objUVs);
                skipToNextLine();
                continue;
            }
            if ( firstCode === 118
            // && matchesKeyword('v')
            ) {
                cursor++;
                readNumberValues(objPositions, 3, objColors);
                skipToNextLine();
                continue;
            }
            if (// firstCode === 102 &&
                matchesKeyword('f')
            ) {
                cursor++;
                setGeometry();
                const colors = objColors.offsets.length > 1 ? objColors : null;
                let vertexCount = 0;
                let firstPositionIndex = 0;
                let firstUVIndex = 0;
                let firstNormalIndex = 0;
                let previousPositionIndex = 0;
                let previousUVIndex = 0;
                let previousNormalIndex = 0;

                while (cursor < len) {
                    skipWhitespace();
                    let code = codeAt(cursor);
                    if (cursor >= len || isLineEnd(code) || code === 35) {
                        break;
                    }

                    const positionIndex = readFaceIndex();
                    let uvIndex = NaN;
                    let normalIndex = NaN;
                    if (codeAt(cursor) === 47) {
                        cursor++;
                        uvIndex = readFaceIndex();
                        if (codeAt(cursor) === 47) {
                            cursor++;
                            normalIndex = readFaceIndex();
                        }
                    }
                    while (cursor < len) {
                        code = codeAt(cursor);
                        if (isValueTerminator(code)) {
                            break;
                        }
                        cursor++;
                    }

                    if (vertexCount === 0) {
                        firstPositionIndex = positionIndex;
                        firstUVIndex = uvIndex;
                        firstNormalIndex = normalIndex;
                    } else if (vertexCount === 1) {
                        previousPositionIndex = positionIndex;
                        previousUVIndex = uvIndex;
                        previousNormalIndex = normalIndex;
                    } else {
                        addFace(firstPositionIndex, firstUVIndex, firstNormalIndex, colors);
                        addFace(previousPositionIndex, previousUVIndex, previousNormalIndex, colors);
                        addFace(positionIndex, uvIndex, normalIndex, colors);
                        previousPositionIndex = positionIndex;
                        previousUVIndex = uvIndex;
                        previousNormalIndex = normalIndex;
                    }
                    vertexCount++;
                }

                skipToNextLine();
                continue;
            }
            if (// firstCode === 109 &&
                matchesKeyword('mtllib')
            ) {
                cursor += 6;
                mtlLibs.push(...readStringTokens());
                skipToNextLine();
                continue;
            }
            if (// firstCode === 117 &&
                matchesKeyword('usemtl')
            ) {
                cursor += 6;
                face.material = readStringToken();
                newGeometry();
                skipToNextLine();
                continue;
            }
            if (// firstCode === 103 &&
                matchesKeyword('g')
            ) {
                cursor++;
                groups = readStringTokens();
                newGeometry();
                skipToNextLine();
                continue;
            }
            if (// firstCode === 111 &&
                matchesKeyword('o')
            ) {
                cursor++;
                object = readStringToken();
                newGeometry();
                skipToNextLine();
                continue;
            }

            skipToNextLine();
        }


        return {
            faces,
            geometries,
            mtlLibs
        };
    };

    const parseOBJ = (text: string | Uint8Array) => {
        const startTime = performance.now();
        try {
            return parseOBJData(text);
        } finally {
            const duration = performance.now() - startTime;
            timeTotal += duration;
            console.log(`[OBJ Parser] parse: ${duration.toFixed(2)} ms; timeTotal: ${timeTotal.toFixed(2)} ms`);
        }
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

    const loadTextures = async (
        materials,
        baseUrl?: URL,
        textureUrls?: Record<string, string | Blob | ModelTextureData>
    ) => {
        const textures: Record<string, ImageBitmap | ModelTextureData> = Object.create(null);
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
                            if (isModelTextureData(texture)) {
                                const pixelData = texture.data;
                                if (!Number.isInteger(texture.width) || texture.width <= 0
                                    || !Number.isInteger(texture.height) || texture.height <= 0
                                    || !pixelData || pixelData.length != texture.width * texture.height * 4) {
                                    throw new Error(`Invalid RGBA pixel data for OBJ texture "${fileName}"`);
                                }
                                textures[fileName] = texture;
                                return texture;
                            }
                            if (typeof texture != 'string') {
                                throw new Error(`Unsupported OBJ texture source "${fileName}"`);
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
        const objData = source.obj instanceof Blob ? await source.obj.text() : source.obj;
        const {geometries, faces, mtlLibs} = parseOBJ(objData);
        const sourceMtl = source.mtl;
        let text = '';
        if (typeof sourceMtl == 'string') {
            text = sourceMtl;
        } else if (sourceMtl instanceof Blob) {
            text = await sourceMtl.text();
        } else if (sourceMtl) {
            const filenames = mtlLibs.length ? mtlLibs : Object.keys(sourceMtl);
            text = (await Promise.all(filenames.map(async (filename) => {
                if (!Object.prototype.hasOwnProperty.call(source.mtl, filename)) {
                    throw new Error(`Missing inline OBJ material library "${filename}"`);
                }
                const material = sourceMtl[filename];
                return material instanceof Blob ? await material.text() : material;
            }))).join('\n');
        }
        const materials = parseMTL(text);

        const textures = await loadTextures(materials, source.baseUrl ? new URL(source.baseUrl) : undefined, source.textures);
        return {geometries, faces, materials, textures};
    };
    return async ({url, source}) => {
        const model = source ? await loadInline(source) : await load(url);
        const transfer = new Set<Transferable>();
        for (let geom of model.geometries) {
            for (let name of ['position', 'uv', 'normal', 'color']) {
                if (geom[name]) {
                    if (geom[name].length) {
                        geom[name] = new Float32Array(geom[name]);
                        if (geom[name].buffer instanceof ArrayBuffer) {
                            transfer.add(geom[name].buffer);
                        }
                    } else {
                        delete geom[name];
                    }
                }
            }
        }
        for (const texture of Object.values(model.textures || {})) {
            if (typeof ImageBitmap != 'undefined' && texture instanceof ImageBitmap) {
                transfer.add(texture);
            } else if (isModelTextureData(texture)) {
                if (texture.data.buffer instanceof ArrayBuffer) {
                    transfer.add(texture.data.buffer);
                }
            }
        }
        return {
            message: model,
            transfer: Array.from(transfer)
        };
    };
};


export class ObjParser extends XYZWorker {
    private inProgress: { [url: string]: Promise<any> } = {};

    main: (args: any) => Promise<ModelData>;

    constructor() {
        super(worker);
    }

    loadInline(source: OBJModelSource): Promise<ModelData> {
        return this.main({
            source: {
                ...source,
                baseUrl: source.baseUrl ? new URL(source.baseUrl, window.top.location.href).href : undefined
            }
        });
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
