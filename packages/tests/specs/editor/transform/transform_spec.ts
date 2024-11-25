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
import {prepare} from 'utils';
import {waitForEditorReady} from 'editorUtils';
import {drag, click} from 'triggerEvents';
import {Map} from '@here/xyz-maps-display';
import {Editor} from '@here/xyz-maps-editor';
import chaiAlmost from 'chai-almost';
import dataset from './transform_spec.json';

describe('transform objects', () => {
    const expect = chai.expect;
    let editor;
    let display;
    let preparedData;
    let container;
    let mapContainer;
    let link;
    let address;

    before(async () => {
        chai.use(chaiAlmost());
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            // @ts-ignore
            renderOptions: {
                preserveDrawingBuffer: true
            },
            center: {longitude: 77.81426220901494, latitude: 12.651311987215792},
            zoomlevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });

        await waitForEditorReady(editor);
        mapContainer = display.getContainer();

        container = editor.createFeatureContainer();
        link = preparedData.getFeature('linkLayer', '-189186');
        address = preparedData.getFeature('paLayer', '-48037');

        container.push(link, address);
        container.transform();
    });

    after(async () => {
        editor.destroy();
        display.destroy();
        await preparedData.clear();
    });

    it('validate transformer is active', async () => {
        let overlay = editor.getOverlay();
        let features = overlay.search(display.getViewBounds());

        expect(features.length).to.be.greaterThanOrEqual(7);

        await click(mapContainer, 100, 100);

        features = overlay.search(display.getViewBounds());
        expect(features).to.be.lengthOf(0);

        container.transform();
    });

    it('drag right bar of transformer to scale ', async () => {
        await drag(mapContainer, {x: 307 + 8, y: 280}, {x: 357 + 8, y: 280});
        expect(link.coord()).to.deep.almost([[77.813993244, 12.651573696, 0], [77.812652884, 12.651416671, 0]]);
        expect(address.coord()).to.deep.almost([77.813323063, 12.651311987, 0]);
    });

    it('drag left bar of transformer to scale', async () => {
        await drag(mapContainer, {x: 92 - 5, y: 280}, {x: 120 - 5, y: 280});
        expect(link.coord()).to.deep.almost([[77.813993244, 12.651573696, 0], [77.812812677, 12.651416671, 0]]);
        expect(address.coord()).to.deep.almost([77.81340296, 12.651311987, 0]);
    });

    it('drag top bar of transformer to scale', async () => {
        await drag(mapContainer, {x: 200, y: 241 - 8}, {x: 200, y: 220 - 8});
        expect(link.coord()).to.deep.almost([[77.813993244, 12.65168597, 0], [77.812812677, 12.65146158, 0]]);
        expect(address.coord()).to.deep.almost([77.81340296, 12.651311987, 0]);
    });

    it('drag bottom bar of transformer to scale', async () => {
        await drag(mapContainer, {x: 200, y: 306 + 10}, {x: 200, y: 280 + 10});
        expect(link.coord()).to.deep.almost([[77.813993244, 12.65168597, 0], [77.812812677, 12.651533949, 0]]);
        expect(address.coord()).to.deep.almost([77.81340296, 12.651432603, 0]);
    });

    it('drag the transformer to move the link and address', async () => {
        await drag(mapContainer, {x: 235 + 8, y: 250 + 8}, {x: 250 + 8, y: 280 + 8});
        expect(link.coord()).to.deep.almost([[77.814073766, 12.651528907, 0], [77.812893162, 12.651376881, 0]]);
        expect(address.coord()).to.deep.almost([77.813483463, 12.651275532, 0]);
    });

    it('drag the transformer to rotate the link and address', async () => {
        await drag(mapContainer, {x: 370 + 8, y: 310 + 8}, {x: 300 + 8, y: 320 + 8});
        expect(link.coord()).to.deep.almost([[77.814074622, 12.651279385, 0], [77.812935261, 12.65161733, 0]]);
        expect(address.coord()).to.deep.almost([77.81342977, 12.651286872, 0]);
    });

    it('scale and keep aspect ration', async () => {
        await drag(mapContainer, {x: 155, y: 195}, {x: 120, y: 160});
        expect(link.coord()).to.deep.almost([[77.814305863, 12.651231337, 0], [77.812720823, 12.651701475, 0]]);
        expect(address.coord()).to.deep.almost([77.813408767, 12.651241751, 0]);
    });

    it('after transforming link validate it is not selected', async function() {
        let overlay = editor.getOverlay();
        let features = overlay.search(display.getViewBounds());
        expect(features.length).to.be.greaterThanOrEqual(7);
    });
});
