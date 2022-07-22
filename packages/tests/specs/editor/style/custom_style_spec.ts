/*
 * Copyright (C) 2019-2022 HERE Europe B.V.
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
import {getCanvasPixelColor, prepare} from 'utils';
import {waitForEditorReady} from 'editorUtils';
import {Map} from '@here/xyz-maps-display';
import {Editor} from '@here/xyz-maps-editor';
import chaiAlmost from 'chai-almost';
import dataset from './custom_style_spec.json';

describe('custom/overwritten styles', () => {
    const expect = chai.expect;

    let editor;
    let display;
    let preparedData;
    let mapContainer;
    let areaLayer;
    let area;

    before(async () => {
        chai.use(chaiAlmost());
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: -111.717195, latitude: 40.211738},
            zoomlevel: 18,
            layers: preparedData.getLayers(),
            // @ts-ignore
            renderOptions: {
                preserveDrawingBuffer: true
            }
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });

        await waitForEditorReady(editor);

        mapContainer = display.getContainer();

        area = preparedData.getFeature('testLayer', 'TestArea');
        areaLayer = preparedData.getLayers('testLayer');
    });

    after(async () => {
        editor.destroy();
        display.destroy();

        await preparedData.clear();
    });

    it('validate default layer style', async () => {
        let color = await getCanvasPixelColor(mapContainer, {x: 300, y: 400});
        expect(color).to.equal('#ff0000');
    });

    it('set a custom style', async () => {
        areaLayer.setStyleGroup(area, [{
            zIndex: 4,
            type: 'Polygon',
            fill: '#0000ff'
        }]);

        let color = await getCanvasPixelColor(mapContainer, {x: 300, y: 400});
        expect(color).to.equal('#0000ff');
    });

    it('set property to trigger style refresh', async () => {
        area.prop('test', 'test');

        let color = await getCanvasPixelColor(mapContainer, {x: 300, y: 400});
        expect(color).to.equal('#0000ff');
    });

    it('clear custom style', async () => {
        areaLayer.setStyleGroup(area);

        let color = await getCanvasPixelColor(mapContainer, {x: 300, y: 400});
        expect(color).to.equal('#ff0000');
    });
});
