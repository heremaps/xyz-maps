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
import {getCanvasPixelColor, prepare} from 'utils';
import {Map} from '@here/xyz-maps-display';
import dataset from './style_type_model.json';
import {ModelStyle} from '@here/xyz-maps-core';
import {describe, beforeAll, afterAll, it, expect} from 'vitest';


describe('3d Model Styles', function() {
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
        let color = await getCanvasPixelColor(mapContainer, {x: 400, y: 300}, {
            expect: '#ff0000',
            retry: 8,
            retryDelay: 50
        });
        expect(color).toBe('#ff0000');
    });

    it('validate model orientation, rotate front face to top', async () => {
        modelLayer.setStyleGroup(feature, [{
            ...baseModelStyle,
            'rotate': [Math.PI/2, 0, 0]
        }]);

        let color = await getCanvasPixelColor(mapContainer, {x: 400, y: 300}, {
            expect: '#0000ff'
        });
        expect(color).toBe('#0000ff');
    });
    it('validate model orientation, rotate back face to top', async () => {
        modelLayer.setStyleGroup(feature, [{
            ...baseModelStyle,
            'rotate': [-Math.PI/2, 0, 0]
        }]);

        let color = await getCanvasPixelColor(mapContainer, {x: 400, y: 300}, {
            expect: '#ffff00'
        });
        expect(color).toBe('#ffff00');
    });

    it('validate model orientation, rotate bottom face to top', async () => {
        modelLayer.setStyleGroup(feature, [{
            ...baseModelStyle,
            'rotate': [Math.PI, 0, 0]
        }]);

        let color = await getCanvasPixelColor(mapContainer, {x: 400, y: 300}, {
            expect: '#00ff00'
        });
        expect(color).toBe('#00ff00');
    });

    it('validate model orientation, rotate left face to top', async () => {
        modelLayer.setStyleGroup(feature, [{
            ...baseModelStyle,
            'rotate': [0, 0, -Math.PI/2]
        }]);

        let color = await getCanvasPixelColor(mapContainer, {x: 400, y: 300}, {
            expect: '#00ffff'
        });
        expect(color).toBe('#00ffff');
    });

    it('validate model orientation, rotate right face to top', async () => {
        modelLayer.setStyleGroup(feature, [{
            ...baseModelStyle,
            'rotate': [0, 0, Math.PI/2]
        }]);

        let color = await getCanvasPixelColor(mapContainer, {x: 400, y: 300}, {
            expect: '#ff00ff'
        });
        expect(color).toBe('#ff00ff');
    });

    it('validate model orientation, scale size', async () => {
        modelLayer.setStyleGroup(feature, [{
            ...baseModelStyle,
            'scale': [40, 40, 40]
        }]);

        let color = await getCanvasPixelColor(mapContainer, {x: 200, y: 300}, {
            expect: '#ff0000'
        });
        expect(color).toBe('#ff0000');
    });

    it('validate specular shininess', async () => {
        modelLayer.setStyleGroup(feature, [{
            ...baseModelStyle,
            'specular': [1, 1, 1], 'shininess': 32
        }]);
        let colors = await getCanvasPixelColor(mapContainer, [{x: 400, y: 300}], {
            expect: '#ffffff'
        });
        expect(colors[0]).toBe('#ffffff');
    });
});
