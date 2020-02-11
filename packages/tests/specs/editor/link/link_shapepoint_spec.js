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
import {Editor} from '@here/xyz-maps-editor';
import dataset from './link_shapepoint_spec.json';

describe('link shape points', function() {
    const expect = chai.expect;

    let editor;
    let display;
    let preparedData;
    let mapContainer;

    let link1;
    let shape;

    before(async function() {
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 77.26942, latitude: 13.08243},
            zoomLevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });

        await editorTests.waitForEditorReady(editor);
        mapContainer = display.getContainer();

        link1 = preparedData.getFeature('linkLayer', -189083);
    });

    after(async function() {
        editor.destroy();
        display.destroy();
        await preparedData.clear();
    });

    it('click on link to get shape point', async function() {
        await testUtils.events.click(mapContainer, 100, 200);
        shape = (await editorTests.click(editor, 100, 100)).target;

        expect(shape.getConnectedLinks()).to.have.lengthOf(1);
        expect(shape.getIndex()).to.equal(3);
    });

    it('disconnect link at shape point and validate new coordinates', function() {
        shape.disconnect();

        expect(link1.prop('disconnected')).to.be.equal('HOOK');
        expect(link1.prop('estate')).to.be.equal('UPDATED');
        expect(link1.coord()).to.deep.equal([
            [77.26942, 13.082952518, 0],
            [77.268883558, 13.082952518, 0],
            [77.267810675, 13.082952518, 0],
            [77.267810675, 13.083448055, 0]
        ]);
    });

    it('remove a link shape point and validate coordinates again', async function() {
        shape = (await editorTests.click(editor, 100, 200)).target;

        shape.remove();

        expect(link1.coord()).to.deep.equal([
            [77.26942, 13.082952518, 0],
            [77.268883558, 13.082952518, 0],
            [77.267810675, 13.083448055, 0]
        ]);
    });

    it('split link and validate the new links', async function() {
        shape = (await editorTests.click(editor, 300, 200)).target;

        let links = shape.splitLink();

        // click on ground
        await testUtils.events.click(mapContainer, 100, 500);

        expect(links[0].coord()).to.deep.equal([
            [77.26942, 13.082952518, 0],
            [77.268883558, 13.082952518, 0]
        ]);
        expect(links[1].coord()).to.deep.equal([
            [77.268883558, 13.082952518, 0],
            [77.267810675, 13.083448055, 0]
        ]);
    });
});
