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
import {features, Editor} from '@here/xyz-maps-editor';
import dataset from './link_automatic_snapping_remove_link_spec.json';

describe('link auto remove link', function() {
    const expect = chai.expect;

    let editor;
    let display;
    let preparedData;
    let mapContainer;
    let link1;
    let link2;
    let link3;
    let link4;
    let linkLayer;

    before(async function() {
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 77.05628448207847, latitude: 12.971348085003669},
            zoomLevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });

        await editorTests.waitForEditorReady(editor);
        mapContainer = display.getContainer();

        link1 = preparedData.getFeature('linkLayer', -189023);
        link2 = preparedData.getFeature('linkLayer', -189024);
        link3 = preparedData.getFeature('linkLayer', -189025);
        link4 = preparedData.getFeature('linkLayer', -189026);
        linkLayer = preparedData.getLayers('linkLayer');
    });

    after(async function() {
        editor.destroy();
        display.destroy();
        await preparedData.clear();
    });

    it('select a link to drag and validate its coordinates', async function() {
        link4.select();

        await testUtils.events.drag(mapContainer, {x: 300, y: 150}, {x: 250, y: 150});

        expect(link4.coord()).to.deep.equal([
            [77.055479819, 12.972132213, 0],
            [77.056284482, 12.971609461, 0]
        ]);

        expect(link3.coord()).to.deep.equal([
            [77.055479819, 12.972132213, 0],
            [77.056016261, 12.972393589, 0]
        ]);

        expect(link2.coord()).to.deep.equal([
            [77.055211598, 12.972393589, 0],
            [77.055479819, 12.972132213, 0]
        ]);
    });

    it('drag link shape point which is too far away from the other shape point', async function() {
        await testUtils.events.drag(mapContainer, {x: 250, y: 150}, {x: 200, y: 104});

        expect(editor.info()).to.have.lengthOf(3);
    });

    it('undo last drag, drag link shape point which snaps automatically to other shape point', async function() {
        editor.undo();

        let lnk2 = editor.getFeature(link2.id, linkLayer);
        let lnk3 = editor.getFeature(link3.id, linkLayer);
        let lnk4 = editor.getFeature(link4.id, linkLayer);

        lnk2.select();

        await testUtils.events.drag(mapContainer, {x: 250, y: 150}, {x: 200, y: 103});

        let objs = editor.search(display.getViewBounds());
        expect(objs).to.have.lengthOf(3);

        expect(lnk3.coord()).to.deep.equal([
            [77.055211598, 12.972393589, 0],
            [77.056016261, 12.972393589, 0]
        ]);

        expect(lnk4.coord()).to.deep.equal([
            [77.055211598, 12.972393589, 0],
            [77.056284482, 12.971609461, 0]
        ]);
    });
});
