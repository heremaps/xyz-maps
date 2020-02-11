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
 */import {editorTests, testUtils, prepare} from 'hereTest';
import {Map} from '@here/xyz-maps-core';
import {Editor} from '@here/xyz-maps-editor';
import dataset from './link_autoconnect_spec.json';

describe('link auto connect', function() {
    const expect = chai.expect;

    let editor;
    let display;
    let preparedData;
    let mapContainer;
    let link1;
    let link2;
    let linkLayer;

    before(async function() {
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 77.35174, latitude: 11.8725},
            zoomLevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });

        await editorTests.waitForEditorReady(editor);
        mapContainer = display.getContainer();

        link1 = preparedData.getFeature('linkLayer', -189016);
        link2 = preparedData.getFeature('linkLayer', -189017);
        linkLayer = preparedData.getLayers('linkLayer');
    });

    after(async function() {
        editor.destroy();
        display.destroy();
        await preparedData.clear();
    });

    it('drag link shape point to connect', async function() {
        link2.select();
        await testUtils.events.drag(mapContainer, {x: 200, y: 300}, {x: 300, y: 300});

        expect(link1.coord()).to.deep.equal([
            [77.350130675, 11.87354993, 0],
            [77.351203558, 11.87354993, 0],
            [77.351203558, 11.8725, 0]
        ]);
        expect(link2.coord()).to.deep.equal([
            [77.350130675, 11.8725, 0],
            [77.351203558, 11.8725, 0]
        ]);
    });

    it('undo the last connect and drag link shape point to connect again', async function() {
        editor.undo();

        let lnk1 = editor.getFeature(link1.id, linkLayer);
        let lnk2 = editor.getFeature(link2.id, linkLayer);
        lnk2.select();

        await testUtils.events.drag(mapContainer, {x: 200, y: 300}, {x: 300, y: 297});

        expect(lnk1.coord()).to.deep.equal([
            [77.350130675, 11.87354993, 0],
            [77.351203558, 11.87354993, 0],
            [77.351203558, 11.8725, 0]
        ]);
        expect(lnk2.coord()).to.deep.equal([
            [77.350130675, 11.8725, 0],
            [77.351203558, 11.8725, 0]
        ]);
    });


    it('undo last connect and drag link shape', async function() {
        editor.undo();

        let lnk1 = editor.getFeature(link1.id, linkLayer);
        let lnk2 = editor.getFeature(link2.id, linkLayer);
        lnk2.select();

        await testUtils.events.drag(mapContainer, {x: 200, y: 300}, {x: 300, y: 303});

        expect(lnk1.coord()).to.deep.equal([
            [77.350130675, 11.87354993, 0],
            [77.351203558, 11.87354993, 0],
            [77.351203558, 11.8725, 0]
        ]);
        expect(lnk2.coord()).to.deep.equal([
            [77.350130675, 11.8725, 0],
            [77.351203558, 11.8725, 0]
        ]);
    });

    it('undo last connect and drag link shape point to connect again', async function() {
        editor.undo();

        let lnk = editor.getFeature(link2.id, linkLayer);
        lnk.select();

        await testUtils.events.drag(mapContainer, {x: 200, y: 300}, {x: 300, y: 308});
        let shape = (await editorTests.click(editor, 300, 308)).target;

        expect(shape.getConnectedLinks()).to.have.lengthOf(0);
    });

    it('undo last connect, then drag shape point', async function() {
        editor.undo();

        let lnk = editor.getFeature(link2.id, linkLayer);
        lnk.select();

        await testUtils.events.drag(mapContainer, {x: 200, y: 300}, {x: 300, y: 108});

        expect(lnk.coord()).to.deep.equal([
            [77.350130675, 11.8725, 0],
            [77.351203558, 11.873507933, 0]
        ]);
    });

    it('undo last connect, drag link shape point to connect, split automatically snap to shape point', async function() {
        editor.undo();

        let lnk = editor.getFeature(link2.id, linkLayer);
        lnk.select();

        await testUtils.events.drag(mapContainer, {x: 200, y: 300}, {x: 300, y: 103});

        expect(lnk.coord()).to.deep.equal([
            [77.350130675, 11.8725, 0],
            [77.351203558, 11.87354993, 0]
        ]);
    });
});
