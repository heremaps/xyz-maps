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


describe('3d Model Styles', function() {
    const expect = chai.expect;

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

    before(async () => {
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
        const canvas = mapContainer.querySelector('canvas');
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
        if (gl) {
            const info = gl.getExtension('WEBGL_debug_renderer_info');
            console.log('Model WebGL renderer', {
                renderer: gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER),
                vendor: gl.getParameter(info ? info.UNMASKED_VENDOR_WEBGL : gl.VENDOR),
                version: gl.getParameter(gl.VERSION)
            });
        }
        modelLayer = preparedData.getLayers('modelLayer');
        feature = preparedData.getFeature('modelLayer', 'model1');
    });

    after(() => {
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
        if (color !== '#ff0000') {
            const canvas = mapContainer.querySelector('canvas');
            const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
            console.error('Model rendering diagnostics', {
                color,
                visibility: document.visibilityState,
                canvasSize: [canvas.width, canvas.height],
                contextLost: gl?.isContextLost(),
                resources: performance.getEntriesByType('resource')
                    .filter((entry) => /\.(obj|mtl|png)(?:[?#]|$)/i.test(entry.name))
                    .map((entry) => entry.toJSON())
            });
        }
        expect(color).to.equal('#ff0000');
    });

    it('validate model orientation, rotate front face to top', async () => {
        modelLayer.setStyleGroup(feature, [{
            ...baseModelStyle,
            'rotate': [Math.PI/2, 0, 0]
        }]);

        let color = await getCanvasPixelColor(mapContainer, {x: 400, y: 300});
        expect(color).to.equal('#0000ff');
    });
    it('validate model orientation, rotate back face to top', async () => {
        modelLayer.setStyleGroup(feature, [{
            ...baseModelStyle,
            'rotate': [-Math.PI/2, 0, 0]
        }]);

        let color = await getCanvasPixelColor(mapContainer, {x: 400, y: 300});
        expect(color).to.equal('#ffff00');
    });

    it('validate model orientation, rotate bottom face to top', async () => {
        modelLayer.setStyleGroup(feature, [{
            ...baseModelStyle,
            'rotate': [Math.PI, 0, 0]
        }]);

        let color = await getCanvasPixelColor(mapContainer, {x: 400, y: 300});
        expect(color).to.equal('#00ff00');
    });

    it('validate model orientation, rotate left face to top', async () => {
        modelLayer.setStyleGroup(feature, [{
            ...baseModelStyle,
            'rotate': [0, 0, -Math.PI/2]
        }]);

        let color = await getCanvasPixelColor(mapContainer, {x: 400, y: 300});
        expect(color).to.equal('#00ffff');
    });

    it('validate model orientation, rotate right face to top', async () => {
        modelLayer.setStyleGroup(feature, [{
            ...baseModelStyle,
            'rotate': [0, 0, Math.PI/2]
        }]);

        let color = await getCanvasPixelColor(mapContainer, {x: 400, y: 300});
        expect(color).to.equal('#ff00ff');
    });

    it('validate model orientation, scale size', async () => {
        modelLayer.setStyleGroup(feature, [{
            ...baseModelStyle,
            'scale': [40, 40, 40]
        }]);

        let color = await getCanvasPixelColor(mapContainer, {x: 200, y: 300});
        expect(color).to.equal('#ff0000');
    });

    it('validate specular shininess', async () => {
        modelLayer.setStyleGroup(feature, [{
            ...baseModelStyle,
            'specular': [1, 1, 1], 'shininess': 32
        }]);
        let colors = await getCanvasPixelColor(mapContainer, [{x: 400, y: 300}]);
        expect(colors[0]).to.equal('#ffffff');
    });
});
