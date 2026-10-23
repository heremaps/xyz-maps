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

import {waitForViewportReady} from 'displayUtils';
import {getCanvasPixelColor, expectCanvasPixelColor, prepare} from 'utils';
import {Map} from '@here/xyz-maps-display';
import dataset from './model-style.json';
import {LocalProvider, ModelData, ModelStyle, OBJModelSource, TileLayer} from '@here/xyz-maps-core';
import {describe, beforeAll, afterAll, beforeEach, afterEach, it, expect} from 'vitest';


describe('3D model styles', function() {
    let modelLayer;
    let display;
    let mapContainer;
    let feature;

    let baseModelStyle: ModelStyle = {
        zIndex: 0,
        type: 'Model',
        model: 'base/tests/assets/model/cube.obj',
        scale: [20, 20, 20],
        specular: [0, 0, 0],
        shininess: 0
    };

    beforeAll(async () => {
        let preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            // @ts-ignore
            renderOptions: {
                preserveDrawingBuffer: true
            },
            center: {longitude: 73.549401, latitude: 19.815739},
            zoomlevel: 20,
            layers: preparedData.getLayers()
        });
        await waitForViewportReady(display);

        mapContainer = display.getContainer();
        modelLayer = preparedData.getLayers('modelLayer');
        feature = preparedData.getFeature('modelLayer', 'model1');
    });

    afterAll(() => {
        display.destroy();
    });

    it('validate Wavefront .obj model is loaded and displayed', async () => {
        modelLayer.setStyleGroup(feature, [baseModelStyle]);

        // The OBJ loads asynchronously after the style is applied.
        await expectCanvasPixelColor(mapContainer, {x: 400, y: 300}, '#ff0000', {retry: 8, retryDelay: 50});
    });

    it('validate inline OBJ and MTL strings from feature properties', async () => {
        const [obj, mtl] = await Promise.all(['cube.obj', 'cube.mtl'].map(async (filename) => {
            const response = await fetch(`base/tests/assets/model/${filename}`);
            return response.text();
        }));
        const source: OBJModelSource = Object.freeze({format: 'obj', obj, mtl});
        feature.properties.inlineModel = source;
        modelLayer.setStyleGroup(feature, [{
            ...baseModelStyle,
            model: (feature) => feature.properties.inlineModel
        }]);
        const color = await getCanvasPixelColor(mapContainer, {x: 400, y: 300});
        expect(color).toBe('#ff0000');
        delete feature.properties.inlineModel;
    });

    it('parses tab-delimited UTF-8 Uint8Array OBJ data, inline comments and relative face indices', async () => {
        const [sourceObj, mtl] = await Promise.all(['cube.obj', 'cube.mtl'].map(async (filename) => {
            const response = await fetch(`base/tests/assets/model/${filename}`);
            return response.text();
        }));
        const faceCounts = [8, 4, 6];
        const obj = sourceObj
            .replace(/^f (.+)$/gm, (_line: string, refs: string) => {
                const face = refs.split(/\s+/).map((reference) => reference.split('/').map(
                    (index, component) => Number(index) - faceCounts[component] - 1
                ).join('/'));
                return `f\t${face.join('\t')} # face comment`;
            })
            .replace(/\b1\.0\b/g, '1e0')
            .replace(/\b0\.0\b/g, '0e0')
            .replace(/^(mtllib|usemtl|vn|vt|v|g|o) +/gm, '$1\t')
            .replace(/\n/g, '\r\n');
        const byteObj = `\uFEFF${obj.slice(obj.indexOf('mtllib'))}`
            .replace('mtllib\tcube.mtl\r\n', 'mtllib\tcube.mtl\r\no\tcafé model\r\n');
        const source: OBJModelSource = {format: 'obj', obj: new TextEncoder().encode(byteObj), mtl};
        feature.properties.inlineModel = source;
        modelLayer.setStyleGroup(feature, [{
            ...baseModelStyle,
            model: (feature) => feature.properties.inlineModel
        }]);
        const color = await getCanvasPixelColor(mapContainer, {x: 400, y: 300});
        expect(color).toBe('#ff0000');
        if (!(source.obj instanceof Uint8Array)) {
            throw new Error('Expected the transferred OBJ byte source to be restored');
        }
        expect(source.obj).toStrictEqual(new TextEncoder().encode(byteObj));
        delete feature.properties.inlineModel;
    });

    it('validate multiple inline material libraries in one mtllib directive', async () => {
        const response = await fetch('base/tests/assets/model/cube.obj');
        const obj = (await response.text()).replace(/^mtllib.*$/m, 'mtllib sides.mtl top.mtl');
        modelLayer.setStyleGroup(feature, [{
            ...baseModelStyle,
            model: {
                format: 'obj',
                obj,
                mtl: {
                    'sides.mtl': 'newmtl front\nKd 0 0 1',
                    'top.mtl': 'newmtl top\nKd 0 1 0'
                }
            }
        }]);
        const color = await getCanvasPixelColor(mapContainer, {x: 400, y: 300});
        expect(color).toBe('#00ff00');
    });

    it('validate worker-created Blob OBJ, MTL and texture assets', async () => {
        const response = await fetch('base/tests/assets/model/cube.obj');
        const obj = (await response.text()).replace(/^mtllib.*$/m, 'mtllib sides.mtl top.mtl');
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 1;
        const context = canvas.getContext('2d');
        context.fillStyle = '#00ff00';
        context.fillRect(0, 0, 1, 1);
        const texture = await new Promise<Blob>((resolve, reject) => {
            canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Failed to create test texture')));
        });
        const source: OBJModelSource = {
            format: 'obj',
            obj: new Blob([obj], {type: 'text/plain'}),
            mtl: {
                'sides.mtl': new Blob(['newmtl front\nKd 0 0 1\n'], {type: 'text/plain'}),
                'top.mtl': new Blob(['newmtl top\nKd 1 1 1\nmap_Kd green.png'], {type: 'text/plain'})
            },
            textures: {'green.png': texture}
        };
        modelLayer.setStyleGroup(feature, [{...baseModelStyle, model: source}]);
        expect(await getCanvasPixelColor(mapContainer, {x: 400, y: 300})).toBe('#00ff00');
    });

    it('loads raw RGBA OBJ textures and retains the legacy ModelData pixels fallback', async () => {
        const response = await fetch('base/tests/assets/model/cube.obj');
        const obj = (await response.text()).replace(/^mtllib.*$/m, 'mtllib sides.mtl top.mtl');
        const inlineSource: OBJModelSource = {
            format: 'obj',
            obj,
            mtl: {
                'sides.mtl': 'newmtl front\nKd 0 0 1',
                'top.mtl': 'newmtl top\nKd 1 1 1\nmap_Kd green.rgba'
            },
            textures: {
                'green.rgba': {width: 1, height: 1, data: new Uint8Array([0, 255, 0, 255])}
            }
        };

        const modelDataSource: ModelData = {
            geometries: [{
                position: [-1, 0, -1, 1, 0, -1, 1, 0, 1, -1, 0, -1, 1, 0, 1, -1, 0, 1],
                normal: [0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0],
                uv: [0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1]
            }],
            materials: {
                top: {diffuse: [1, 1, 1], diffuseMap: 'green.rgba'}
            },
            textures: {},
            faces: [{geometryIndex: 0, material: 'top'}]
        };
        Reflect.set(modelDataSource.textures, 'green.rgba', {
            width: 1,
            height: 1,
            pixels: new Uint8Array([0, 255, 0, 255])
        });

        try {
            modelLayer.setStyleGroup(feature, [{...baseModelStyle, model: inlineSource}]);
            expect(await getCanvasPixelColor(mapContainer, {x: 400, y: 300})).toBe('#00ff00');

            modelLayer.setStyleGroup(feature, [{...baseModelStyle, model: modelDataSource}]);
            expect(await getCanvasPixelColor(mapContainer, {x: 400, y: 300})).toBe('#00ff00');
        } finally {
            modelLayer.setStyleGroup(feature, [baseModelStyle]);
        }
    });

    it('picks an unindexed model mesh with a pitched map', async () => {
        const model: ModelData = {
            geometries: [{
                position: [-1, 0, -1, 1, 0, -1, 1, 0, 1, -1, 0, -1, 1, 0, 1, -1, 0, 1],
                normal: [0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0],
                uv: [0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1]
            }],
            materials: {top: {diffuse: [1, 1, 1]}},
            textures: {},
            faces: [{geometryIndex: 0, material: 'top'}]
        };

        modelLayer.setStyleGroup(feature, [{...baseModelStyle, model}]);
        try {
            await waitForViewportReady(display, () => display.pitch(50));
            const result = display.getFeatureAt({x: 430, y: 300}, {layers: [modelLayer]});
            expect(result?.feature.id).toBe(feature.id);
        } finally {
            modelLayer.setStyleGroup(feature, [baseModelStyle]);
            await waitForViewportReady(display, () => display.pitch(0));
        }
    });

    it('validate inline OBJ without MTL uses default materials', async () => {
        const response = await fetch('base/tests/assets/model/cube.obj');
        modelLayer.setStyleGroup(feature, [{
            ...baseModelStyle,
            model: {format: 'obj', obj: await response.text()}
        }]);
        const color = await getCanvasPixelColor(mapContainer, {x: 400, y: 300});
        expect(color).toBe('#ffffff');
    });

    it('validate unresolved inline textures fall back to material colors', async () => {
        const response = await fetch('base/tests/assets/model/cube.obj');
        modelLayer.setStyleGroup(feature, [{
            ...baseModelStyle,
            model: {
                format: 'obj',
                obj: await response.text(),
                mtl: 'newmtl top\nKd 0 1 0\nmap_Kd missing.tga'
            }
        }]);
        const color = await getCanvasPixelColor(mapContainer, {x: 400, y: 300});
        expect(color).toBe('#00ff00');
    });

    it('validate inline MTL texture filenames mapped to data URLs', async () => {
        const response = await fetch('base/tests/assets/model/cube.obj');
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 1;
        const context = canvas.getContext('2d');
        context.fillStyle = '#00ff00';
        context.fillRect(0, 0, 1, 1);
        const source: OBJModelSource = {
            format: 'obj',
            obj: await response.text(),
            mtl: 'newmtl top\nKd 1 1 1\nmap_Kd green.png',
            textures: {'green.png': canvas.toDataURL()}
        };
        modelLayer.setStyleGroup(feature, [{...baseModelStyle, model: source}]);
        const color = await getCanvasPixelColor(mapContainer, {x: 400, y: 300});
        expect(color).toBe('#00ff00');
        modelLayer.setStyleGroup(feature, [{...baseModelStyle, model: source}]);
        expect(await getCanvasPixelColor(mapContainer, {x: 400, y: 300})).toBe('#00ff00');
    });

    it('automatically blends explicit MTL opacity and opacity maps', async () => {
        const [objResponse, mtlResponse] = await Promise.all([
            fetch('base/tests/assets/model/cube.obj'),
            fetch('base/tests/assets/model/cube.mtl')
        ]);
        const obj = (await objResponse.text()).replace(/^usemtl .+$/gm, 'usemtl front');
        const mtl = await mtlResponse.text();
        const opacityCanvas = document.createElement('canvas');
        opacityCanvas.width = opacityCanvas.height = 1;
        const opacityContext = opacityCanvas.getContext('2d');
        opacityContext.fillStyle = '#000000';
        opacityContext.fillRect(0, 0, 1, 1);

        const materialLibraries = [
            mtl.replace('newmtl front\n', 'newmtl front\nd 0\n'),
            mtl.replace('newmtl front\n', 'newmtl front\nTr 1\n'),
            mtl.replace('newmtl front\n', 'newmtl front\nmap_d opacity.png\n')
        ];

        modelLayer.setStyleGroup(feature, []);
        const background = await getCanvasPixelColor(mapContainer, {x: 400, y: 300});

        try {
            for (const materialLibrary of materialLibraries) {
                const source: OBJModelSource = {
                    format: 'obj',
                    obj,
                    mtl: materialLibrary,
                    textures: materialLibrary.includes('map_d')
                        ? {'opacity.png': opacityCanvas.toDataURL()}
                        : undefined
                };
                modelLayer.setStyleGroup(feature, [{...baseModelStyle, model: source, alphaMode: 'opaque'}]);
                const opaqueColor = await getCanvasPixelColor(mapContainer, {x: 400, y: 300}, {delay: 200});
                expect(opaqueColor).not.toBe(background);

                modelLayer.setStyleGroup(feature, [{...baseModelStyle, model: source, alphaMode: 'auto'}]);
                expect(await getCanvasPixelColor(mapContainer, {x: 400, y: 300}, {
                    expect: background,
                    retry: 100,
                    retryDelay: 20
                })).toBe(background);
            }
        } finally {
            modelLayer.setStyleGroup(feature, [baseModelStyle]);
        }
    });

    it('allows per-material alpha mask overrides for diffuse texture alpha', async () => {
        const response = await fetch('base/tests/assets/model/cube.obj');
        const obj = (await response.text()).replace(/^usemtl .+$/gm, 'usemtl Cutout');
        const transparentCanvas = document.createElement('canvas');
        transparentCanvas.width = transparentCanvas.height = 1;
        const source: OBJModelSource = {
            format: 'obj',
            obj,
            mtl: 'newmtl Cutout\nKd 1 1 1\nmap_Kd transparent.png',
            textures: {'transparent.png': transparentCanvas.toDataURL()}
        };

        modelLayer.setStyleGroup(feature, []);
        const background = await getCanvasPixelColor(mapContainer, {x: 400, y: 300});

        try {
            modelLayer.setStyleGroup(feature, [{...baseModelStyle, model: source, alphaMode: 'opaque'}]);
            expect(await getCanvasPixelColor(mapContainer, {x: 400, y: 300}, {
                expect: '#000000',
                retry: 100,
                retryDelay: 20
            })).toBe('#000000');

            modelLayer.setStyleGroup(feature, [{
                ...baseModelStyle,
                model: source,
                alphaMode: 'opaque',
                materialOverrides: {
                    Cutout: {alphaMode: 'mask', alphaCutoff: 0.5}
                }
            }]);
            expect(await getCanvasPixelColor(mapContainer, {x: 400, y: 300}, {
                expect: background,
                retry: 100,
                retryDelay: 20
            })).toBe(background);
        } finally {
            modelLayer.setStyleGroup(feature, [baseModelStyle]);
        }
    });

    it('resolves an explicit style auto mode before material alpha settings', async () => {
        const source: ModelData = {
            geometries: [{
                position: [
                    -1, 0, -1, 1, 0, -1, 1, 0, 1,
                    -1, 0, -1, 1, 0, 1, -1, 0, 1
                ],
                normal: [
                    0, 1, 0, 0, 1, 0, 0, 1, 0,
                    0, 1, 0, 0, 1, 0, 0, 1, 0
                ],
                uv: [0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1]
            }],
            materials: {
                Cutout: {
                    diffuse: [1, 1, 1],
                    diffuseMap: 'transparent.png',
                    alphaMode: 'mask'
                }
            },
            textures: {
                'transparent.png': {
                    width: 1,
                    height: 1,
                    data: new Uint8Array([255, 0, 0, 0])
                }
            },
            faces: [{geometryIndex: 0, material: 'Cutout'}]
        };

        try {
            modelLayer.setStyleGroup(feature, []);
            const background = await getCanvasPixelColor(mapContainer, {x: 400, y: 300});

            modelLayer.setStyleGroup(feature, [{...baseModelStyle, model: source, alphaMode: 'opaque'}]);
            const opaqueColor = await getCanvasPixelColor(mapContainer, {x: 400, y: 300});
            expect(opaqueColor).not.toBe(background);

            modelLayer.setStyleGroup(feature, [{...baseModelStyle, model: source, alphaMode: 'auto'}]);
            expect(await getCanvasPixelColor(mapContainer, {x: 400, y: 300}, {
                expect: opaqueColor,
                retry: 100,
                retryDelay: 20
            })).toBe(opaqueColor);
        } finally {
            modelLayer.setStyleGroup(feature, [baseModelStyle]);
        }
    });

    it('separates inline sources selected by one shared style and reuses the same source', async () => {
        const response = await fetch('base/tests/assets/model/cube.obj');
        const obj = await response.text();
        const red: OBJModelSource = Object.freeze({format: 'obj', obj, mtl: 'newmtl top\nKd 1 0 0'});
        const green: OBJModelSource = Object.freeze({format: 'obj', obj, mtl: 'newmtl top\nKd 0 1 0'});
        const points = [{x: 360, y: 300}, {x: 400, y: 300}, {x: 440, y: 300}];
        const sources = [red, green, red];
        const sharedStyle: ModelStyle = {
            ...baseModelStyle,
            scale: [3, 3, 3],
            model: (feature) => feature.properties.inlineModel
        };
        const added = [];
        modelLayer.setStyleGroup(feature, []);
        try {
            points.forEach((point, index) => {
                const {longitude, latitude} = display.pixelToGeo(point.x, point.y);
                const instance = modelLayer.addFeature({
                    type: 'Feature',
                    geometry: {type: 'Point', coordinates: [longitude, latitude, 0]},
                    properties: {inlineModel: sources[index]}
                });
                added.push(instance);
                modelLayer.setStyleGroup(instance, [sharedStyle]);
            });
            const expected = ['#ff0000', '#00ff00', '#ff0000'];
            expect(await getCanvasPixelColor(mapContainer, points, {
                expect: expected,
                retry: 100,
                retryDelay: 20
            })).toStrictEqual(expected);
        } finally {
            added.forEach((instance) => modelLayer.removeFeature(instance));
            modelLayer.setStyleGroup(feature, [baseModelStyle]);
        }
    });

    it('validate model orientation, rotate front face to top', async () => {
        modelLayer.setStyleGroup(feature, [{
            ...baseModelStyle,
            'rotate': [Math.PI/2, 0, 0]
        }]);

        let color = await getCanvasPixelColor(mapContainer, {x: 400, y: 300});
        expect(color).toBe('#0000ff');
    });
    it('validate model orientation, rotate back face to top', async () => {
        modelLayer.setStyleGroup(feature, [{
            ...baseModelStyle,
            'rotate': [-Math.PI/2, 0, 0]
        }]);

        let color = await getCanvasPixelColor(mapContainer, {x: 400, y: 300});
        expect(color).toBe('#ffff00');
    });

    it('validate model orientation, rotate bottom face to top', async () => {
        modelLayer.setStyleGroup(feature, [{
            ...baseModelStyle,
            'rotate': [Math.PI, 0, 0]
        }]);

        let color = await getCanvasPixelColor(mapContainer, {x: 400, y: 300});
        expect(color).toBe('#00ff00');
    });

    it('validate model orientation, rotate left face to top', async () => {
        modelLayer.setStyleGroup(feature, [{
            ...baseModelStyle,
            'rotate': [0, 0, -Math.PI/2]
        }]);

        let color = await getCanvasPixelColor(mapContainer, {x: 400, y: 300});
        expect(color).toBe('#00ffff');
    });

    it('validate model orientation, rotate right face to top', async () => {
        modelLayer.setStyleGroup(feature, [{
            ...baseModelStyle,
            'rotate': [0, 0, Math.PI/2]
        }]);

        let color = await getCanvasPixelColor(mapContainer, {x: 400, y: 300});
        expect(color).toBe('#ff00ff');
    });

    it('validate model orientation, scale size', async () => {
        modelLayer.setStyleGroup(feature, [{
            ...baseModelStyle,
            'scale': [40, 40, 40]
        }]);

        let color = await getCanvasPixelColor(mapContainer, {x: 200, y: 300});
        expect(color).toBe('#ff0000');
    });

    it('validate specular shininess', async () => {
        modelLayer.setStyleGroup(feature, [{
            ...baseModelStyle,
            'specular': [1, 1, 1], 'shininess': 32
        }]);
        let colors = await getCanvasPixelColor(mapContainer, [{x: 400, y: 300}]);
        expect(colors[0]).toBe('#ffffff');
    });
});

function modelCoverageTests(geometryType: 'Point' | 'Polygon' | 'MultiPolygon') {
    const tileWidth = 360 / Math.pow(2, 18);
    const anchor = [tileWidth / 2, tileWidth / 2, 0];
    const center = {longitude: tileWidth * 4, latitude: tileWidth / 2};
    const geometryCoordinates = (x = anchor[0], y = anchor[1]) => {
        const ring = (west: number, east: number) => [
            [west, y - 0.01], [east, y - 0.01], [east, y + 0.01],
            [west, y + 0.01], [west, y - 0.01]
        ];
        if (geometryType === 'Point') return [x, y, 0];
        if (geometryType === 'Polygon') return [ring(x - 0.02, x + 0.02)];
        return [[ring(x - 0.02, x - tileWidth / 8)], [ring(x + tileWidth / 8, x + 0.02)]];
    };
    const model: ModelData = {
        geometries: [{
            position: [0, 0, -400, 1400, 0, -400, 1400, 0, 400,
                0, 0, -400, 1400, 0, 400, 0, 0, 400],
            normal: [0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0]
        }],
        materials: {surface: {diffuse: [1, 0, 0]}},
        textures: {},
        faces: [{geometryIndex: 0, material: 'surface'}]
    };
    const style: ModelStyle = {
        zIndex: 0,
        type: 'Model',
        model,
        scale: [1, 1, 1],
        specular: [0, 0, 0],
        shininess: 0
    };
    const createPreviewProvider = () => {
        const provider = new LocalProvider();
        const getTile = provider.getTile.bind(provider);
        const pending: (() => void)[] = [];
        let blocked = false;
        provider.getTile = (quadkey, callback) => {
            if (blocked) {
                pending.push(() => getTile(quadkey, callback));
                return undefined;
            }
            return getTile(quadkey, callback);
        };
        return {
            provider,
            pending,
            block: () => blocked = true,
            release: () => {
                blocked = false;
                pending.splice(0).forEach((load) => load());
            }
        };
    };
    let display;
    let layer;
    let feature;
    let container;
    let previewProvider: ReturnType<typeof createPreviewProvider>;

    beforeEach(async () => {
        previewProvider = createPreviewProvider();
        layer = new TileLayer({provider: previewProvider.provider});
        feature = layer.addFeature({
            id: 'coverage-model',
            type: 'Feature',
            ...(geometryType === 'Point' ? {bbox: [-0.005, -0.01, 0.02, 0.01]} : {}),
            geometry: {type: geometryType, coordinates: geometryCoordinates()},
            properties: {}
        });
        layer.setStyleGroup(feature, [style]);
        container = document.getElementById('map');
        display = new Map(container, {
            // @ts-ignore
            renderOptions: {preserveDrawingBuffer: true},
            center,
            zoomlevel: 18,
            layers: [layer]
        });
        display.setBackgroundColor('#ffffff');
        await waitForViewportReady(display);
    });

    afterEach(() => {
        previewProvider.release();
        display.destroy();
    });

    const expectRedAndPickable = async (points) => {
        const colors = points.map(() => '#ff0000');
        expect(await getCanvasPixelColor(container, points, {
            expect: colors, retry: 100, retryDelay: 20
        })).toStrictEqual(colors);
        points.forEach((point) => {
            expect(display.getFeatureAt(point, {layers: [layer]})?.feature.id).toBe(feature.id);
        });
    };

    it('renders and picks coverage tiles without ever visiting the anchor tile', async () => {
        // The whole anchor tile is more than three tiles west of the center.
        const eastEdge = display.geoToPixel(tileWidth, anchor[1]);
        expect(eastEdge.x).toBeLessThan(0);
        await expectRedAndPickable([{x: 200, y: 300}, {x: 400, y: 300}, {x: 600, y: 300}]);
    });

    it('keeps translucent coverage continuous and single-blended across tile seams', async () => {
        const translucentModel: ModelData = {
            geometries: model.geometries,
            faces: model.faces,
            textures: model.textures,
            materials: {surface: {...model.materials.surface, opacity: 0.5}}
        };
        layer.setStyleGroup(feature, [{...style, model: translucentModel, alphaMode: 'blend'}]);
        const seam = display.geoToPixel(center.longitude, center.latitude);
        const points = [-2, -1, 0, 1, 2].map((offset) => ({
            x: Math.round(seam.x) + offset, y: Math.round(seam.y)
        }));
        const colors = await getCanvasPixelColor(container, points, {delay: 200});
        if (!Array.isArray(colors)) {
            throw new Error('Expected one pixel color per seam sample');
        }
        expect(colors).toHaveLength(5);
        colors.forEach((color) => {
            const green = parseInt(color.slice(3, 5), 16);
            expect(color.slice(1, 3)).toBe('ff');
            // One blend on white is ~128; duplicate slices would produce ~64.
            expect(green).toBeGreaterThanOrEqual(120);
            expect(green).toBeLessThanOrEqual(136);
            expect(color.slice(5, 7)).toBe(color.slice(3, 5));
        });
        points.forEach((point) => {
            expect(display.getFeatureAt(point, {layers: [layer]})?.feature.id).toBe(feature.id);
        });
    });

    it('updates rotated and scaled coverage, then clears all slices on removal', async () => {
        layer.setStyleGroup(feature, [{...style, scale: [1.5, 1, 1.5], rotate: [0, Math.PI / 12, 0]}]);
        await waitForViewportReady(display, () => {
            display.pitch(35);
            display.rotate(20);
        });
        await expectRedAndPickable([{x: 400, y: 300}]);
        await waitForViewportReady(display, () => {
            display.pitch(0);
            display.rotate(0);
        });
        layer.setStyleGroup(feature, [{...style, scale: [0.1, 1, 0.1]}]);
        const points = [{x: 200, y: 300}, {x: 400, y: 300}, {x: 600, y: 300}];
        const white = points.map(() => '#ffffff');
        expect(await getCanvasPixelColor(container, points, {
            expect: white, retry: 100, retryDelay: 20
        })).toStrictEqual(white);
        points.forEach((point) => expect(display.getFeatureAt(point, {layers: [layer]})).toBeUndefined());
        layer.setStyleGroup(feature, [style]);
        await expectRedAndPickable(points);
        layer.removeFeature(feature);
        expect(await getCanvasPixelColor(container, points, {
            expect: white, retry: 100, retryDelay: 20
        })).toStrictEqual(white);
        points.forEach((point) => expect(display.getFeatureAt(point, {layers: [layer]})).toBeUndefined());
    });

    it('invalidates every old coverage slice when the feature coordinates change', async () => {
        const points = [{x: 200, y: 300}, {x: 400, y: 300}, {x: 600, y: 300}];
        await expectRedAndPickable(points);
        layer.setFeatureCoordinates(feature, geometryCoordinates(1, 1));
        const white = points.map(() => '#ffffff');
        expect(await getCanvasPixelColor(container, points, {
            expect: white, retry: 100, retryDelay: 20
        })).toStrictEqual(white);
        points.forEach((point) => expect(display.getFeatureAt(point, {layers: [layer]})).toBeUndefined());
    });

    [false, true].forEach((translucent) => {
        it(`renders and picks ${translucent ? 'alpha' : 'opaque'} parent coverage previews while child loads are blocked`, async () => {
            const points = [{x: 300, y: 300}, {x: 400, y: 300}, {x: 500, y: 300}];
            const check = async () => {
                if (!translucent) return expectRedAndPickable(points);
                const colors = await getCanvasPixelColor(container, points, {delay: 200});
                if (!Array.isArray(colors)) throw new Error('Expected preview pixel samples');
                colors.forEach((color) => {
                    expect(color.slice(1, 3)).toBe('ff');
                    expect(parseInt(color.slice(3, 5), 16)).toBeGreaterThanOrEqual(120);
                    expect(parseInt(color.slice(3, 5), 16)).toBeLessThanOrEqual(136);
                    expect(color.slice(5, 7)).toBe(color.slice(3, 5));
                });
                points.forEach((point) => {
                    expect(display.getFeatureAt(point, {layers: [layer]})?.feature.id).toBe(feature.id);
                });
            };
            if (translucent) {
                layer.setStyleGroup(feature, [{
                    ...style,
                    model: {
                        geometries: model.geometries,
                        faces: model.faces,
                        materials: {surface: {...model.materials.surface, opacity: 0.5}}
                    },
                    alphaMode: 'blend'
                }]);
            }
            await check();
            previewProvider.block();
            const ready = waitForViewportReady(display, () => display.setZoomlevel(19));
            await new Promise((resolve) => setTimeout(resolve, 200));
            expect(previewProvider.pending.length).toBeGreaterThan(0);
            await check();
            previewProvider.release();
            await ready;
            await check();
        });
    });
}

for (const geometryType of ['Point', 'Polygon', 'MultiPolygon'] as const) {
    describe(`3d Model Styles with ${geometryType} coverage`, () => modelCoverageTests(geometryType));
}
