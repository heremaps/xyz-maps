/*
 * Copyright (C) 2019-2021 HERE Europe B.V.
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
import {waitForEditorReady, editorClick} from 'editorUtils';
import {drag, click} from 'triggerEvents';
import {Map} from '@here/xyz-maps-display';
import {Editor, Crossing, NavlinkShape} from '@here/xyz-maps-editor';
import dataset from './link_connecthelper_spec.json';

describe('link connect helper with undo', () => {
    const expect = chai.expect;

    let editor;
    let display;
    let preparedData;
    let mapContainer;

    let link2;
    let link4;

    before(async () => {
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 80.56502522286314, latitude: 16.527722476232878},
            zoomlevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });
        await waitForEditorReady(editor);

        mapContainer = display.getContainer();

        link2 = preparedData.getFeature('linkLayer', -189157);
        link4 = preparedData.getFeature('linkLayer', -189159);
    });

    after(async function() {
        editor.destroy();
        display.destroy();
        await preparedData.clear();
    });

    it('connect two crossings and validate a shape point connects to 3 links', async () => {
        let crossings = link4.checkCrossings();

        crossings.forEach((c) => {
            c.show();
        });
        link2.remove();

        // click on a crossing
        let crx = <Crossing>(await editorClick(editor, 133, 200)).target;
        crx.connect();

        // click on a crossing
        crx = <Crossing>(await editorClick(editor, 116, 300)).target;
        crx.connect();

        // click to select a link
        await click(mapContainer, 169, 300);

        let shape = <NavlinkShape>(await editorClick(editor, 116, 300)).target;
        let links = shape.getConnectedLinks();

        expect(links).to.have.lengthOf(3);
    });


    it('undo connects and connect crossing again', async () => {
        editor.undo();

        editor.undo();

        let crossings = link4.checkCrossings();
        crossings.forEach((c) => {
            c.show();
        });

        // click on a crossing
        let crx = <Crossing>(await editorClick(editor, 133, 200)).target;
        crx.connect();

        // click on a link
        await click(mapContainer, 172, 200);

        let shape = <Crossing>(await editorClick(editor, 133, 200)).target;
        let links = shape.getConnectedLinks();

        expect(links).to.have.lengthOf(3);
    });
});
