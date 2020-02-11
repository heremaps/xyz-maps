/*
 * Copyright (C) 2019-2020 HERE Europe B.V.
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
import {editorTests, testUtils, prepare} from 'hereTest';
import {Map} from '@here/xyz-maps-core';
import {features, Editor} from '@here/xyz-maps-editor';
import chaiAlmost from 'chai-almost';
import dataset from './transform_spec.json';

describe('transform objects', function() {
    const expect = chai.expect;

    let editor;
    let display;
    let preparedData;
    let container;
    let mapContainer;
    let link; let address;

    before(async function() {
        chai.use(chaiAlmost());
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            renderOptions: {
                preserveDrawingBuffer: true
            },
            center: {longitude: 77.81426220901494, latitude: 12.651311987215792},
            zoomLevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });

        await editorTests.waitForEditorReady(editor);
        mapContainer = display.getContainer();

        container = editor.createFeatureContainer();
        link = preparedData.getFeature('linkLayer', '-189186');
        address = preparedData.getFeature('paLayer', '-48037');

        container.push(link, address);
        container.transform();
    });

    after(async function() {
        editor.destroy();
        display.destroy();
        await preparedData.clear();
    });

    it('validate transformer is active', async function() {
        let overlay = editor.getOverlay();
        let controller = overlay.search(display.getViewBounds());
        expect(controller).to.be.lengthOf(7);

        await testUtils.events.click(mapContainer, 100, 100);

        controller = overlay.search(display.getViewBounds());
        expect(controller).to.be.lengthOf(0);

        container.transform();
    });

    it('drag right bar of transformer to scale ', async function() {
        await testUtils.events.drag(mapContainer, {x: 307, y: 280}, {x: 357, y: 280});

        expect(link.coord()).to.deep.equal([
            [77.813991539, 12.651573696, 0],
            [77.812652884, 12.651416671, 0]
        ]);
        expect(address.coord()).to.deep.equal([77.81332221, 12.651311987, 0]);
    });

    it('drag left bar of transformer to scale', async function() {
        await testUtils.events.drag(mapContainer, {x: 92, y: 280}, {x: 120, y: 280});

        expect(link.coord()).to.deep.equal([
            [77.813991539, 12.651573696, 0],
            [77.812800172, 12.651416671, 0]
        ]);
        expect(address.coord()).to.deep.equal([77.813395854, 12.651311987, 0]);
    });

    it('drag top bar of transformer to scale', async function() {
        await testUtils.events.drag(mapContainer, {x: 200, y: 241}, {x: 200, y: 220});

        expect(link.coord()).to.deep.equal([
            [77.813991539, 12.651690721, 0],
            [77.812800172, 12.651463481, 0]
        ]);
        expect(address.coord()).to.deep.equal([77.813395854, 12.651311987, 0]);
    });

    it('drag bottom bar of transformer to scale', async function() {
        await testUtils.events.drag(mapContainer, {x: 200, y: 306}, {x: 200, y: 280});

        expect(link.coord()).to.deep.equal([
            [77.813991539, 12.651690721, 0],
            [77.812800172, 12.651550291, 0]
        ]);
        expect(address.coord()).to.deep.equal([77.813395854, 12.651456671, 0]);
    });

    it('drag the transformer to move the link and address', async function() {
        await testUtils.events.drag(mapContainer, {x: 235, y: 250}, {x: 250, y: 280});

        expect(link.coord()).to.deep.equal([
            [77.814072005, 12.651533695, 0],
            [77.812880638, 12.651393265, 0]
        ]);
        expect(address.coord()).to.deep.equal([77.81347632, 12.651299645, 0]);
    });

    it('drag the transformer to rotate the link and address', async function() {
        await testUtils.events.drag(mapContainer, {x: 370, y: 310}, {x: 300, y: 320});

        expect(link.coord()).to.deep.almost([
            [77.814063588, 12.65126444, 0],
            [77.812931512, 12.651652858, 0]
        ]);
        expect(address.coord()).to.deep.almost([77.813423251, 12.651311726, 0]);
    });
});
