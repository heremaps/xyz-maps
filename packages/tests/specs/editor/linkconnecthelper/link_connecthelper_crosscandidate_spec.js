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
import dataset from './link_connecthelper_crosscandidate_spec.json';

describe('link connect helper crosscandidate', function() {
    const expect = chai.expect;

    let editor;
    let display;
    let preparedData;
    let mapContainer;

    let crossings;
    let linkLayer;

    before(async function() {
        chai.use(chaiAlmost(1e-4));
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            renderOptions: {
                preserveDrawingBuffer: true
            },
            center: {longitude: 80.56914, latitude: 16.726454},
            zoomLevel: 19,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });
        await editorTests.waitForEditorReady(editor);
        mapContainer = display.getContainer();
        linkLayer = preparedData.getLayers('linkLayer');
    });

    after(async function() {
        editor.destroy();
        display.destroy();
        await preparedData.clear();
    });

    it('check crossings and validate', function() {
        let l = new features.Navlink([{x: 325, y: 250}, {x: 537, y: 241}], {featureClass: 'NAVLINK'});
        let link = editor.addFeature(l, linkLayer);

        crossings = link.checkCrossings();
        let c0 = crossings[0];
        let c1 = crossings[1];

        expect(c0.distance).to.be.equal(0);
        expect(c0.x).to.almost.equal(387.4074245095253);
        expect(c0.y).to.almost.equal(247.3506297841668);

        expect(c1.distance).to.almost.equal(6.1642614106534515);
        expect(c1.x).to.almost.equal(539.8464839756489);
        expect(c1.y).to.almost.equal(242.18216574192047);
    });

    it('show crossings and connect one of it', async function() {
        crossings.forEach((c)=>{
            c.show();
        });
        await new Promise((resolve) => {
            setTimeout(() => {
                let color1 = testUtils.getCanvasPixelColor(mapContainer, 380, 247);
                let color2 = testUtils.getCanvasPixelColor(mapContainer, 532, 240);
                expect(color1).to.equal('#ff0000');
                expect(color2).to.equal('#ff0000');
                resolve();
            }, 100);
        });

        let crx = (await editorTests.click(editor, 536, 239)).target;
        crx.connect();

        expect(editor.info()).to.have.lengthOf(4);
    });

    it('add another link to map and check its crossing', async function() {
        let l = new features.Navlink([{x: 325, y: 275}, {x: 525, y: 266}], {featureClass: 'NAVLINK'});
        let link1 = editor.addFeature(l, linkLayer);

        crossings = link1.checkCrossings();
        let c = crossings[0];
        expect(c.distance).to.be.equal(0);
        expect(c.x).to.almost.equal(377.1906134337187);
        expect(c.y).to.almost.equal(272.6514024361968);
    });
});
