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
import dataset from './link_zlevels_spec.json';

describe('link set zlevel', function() {
    const expect = chai.expect;

    let editor;
    let display;
    let preparedData;
    let mapContainer;
    let link;

    before(async function() {
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 77.19774634658813, latitude: 13.103736533151803},
            zoomLevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });
        await editorTests.waitForEditorReady(editor);
        mapContainer = display.getContainer();

        link = preparedData.getFeature('linkLayer', -189094);
    });

    after(async function() {
        editor.destroy();
        display.destroy();
        await preparedData.clear();
    });

    it('create a link and validate', function() {
        expect(link.getZLevels()).to.deep.equal([0, 2]);
    });

    it('set zlevel and validate', function() {
        link.setZLevels([1, 1]);
        expect(link.getZLevels()).to.deep.equal([1, 1]);
    });

    it('add one more shape point at head of the link and validate', function() {
        link.addShape({
            x: 200,
            y: 100,
            z: 2
        }, 0);
        expect(link.getZLevels()).to.deep.equal([2, 1, 1]);
    });

    it('set zlevel and validate', function() {
        link.setZLevels([1, 1, 1]);
        expect(link.getZLevels()).to.deep.equal([1, 1, 1]);
    });


    it('drag shape point and validate', async function() {
        await testUtils.events.click(mapContainer, 100, 200);
        await testUtils.events.drag(mapContainer, {x: 400, y: 200}, {x: 100, y: 300});

        expect(link.getZLevels()).to.deep.equal([1, 1, 1]);
    });


    it('add a shape point and validate', function() {
        link.addShape({x: 200, y: 300}, 1);
        expect(link.getZLevels()).to.deep.equal([1, 0, 1, 1]);
    });

    it('add one more shape point, validate zlevel', function() {
        link.addShape({x: 200, y: 300, z: 2}, 1);
        expect(link.getZLevels()).to.deep.equal([1, 2, 0, 1, 1]);
    });

    it('split link and validate', async function() {
        let shape = (await editorTests.click(editor, 100, 300)).target;

        let splitLinks = shape.splitLink();

        expect(splitLinks[0].getZLevels()).to.deep.equal([1, 2, 0, 1]);
        expect(splitLinks[1].getZLevels()).to.deep.equal([1, 1]);
    });
});
