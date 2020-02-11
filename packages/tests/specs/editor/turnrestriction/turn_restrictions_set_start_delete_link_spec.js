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
import dataset from './turn_restrictions_set_start_delete_link_spec.json';

describe('edit turn restriction set turn restriction and delete link', function() {
    const expect = chai.expect;

    let editor;
    let display;
    let preparedData;
    let mapContainer;

    var link1; var link2;

    before(async function() {
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 77.03466354414104, latitude: 13.037041278065471},
            zoomLevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });

        await editorTests.waitForEditorReady(editor);
        mapContainer = display.getContainer();

        link1 = preparedData.getFeature('linkLayer', -189219);
        link2 = preparedData.getFeature('linkLayer', -189220);
        let objs = editor.search({rect: display.getViewBounds()});
        expect(objs).to.have.lengthOf(2);
    });

    after(async function() {
        editor.destroy();
        display.destroy();
        await preparedData.clear();
    });

    it('set turn restriction and validate its value', async function() {
        link2.select();
        link2.editTurnRestrictions();

        await testUtils.events.click(mapContainer, 300, 300);

        expect(link2.prop('turnRestriction')).to.deep.equal({start: [12345]});
    });


    it('remove the link, validate links in viewport again', function() {
        link2.remove();

        let objs = editor.search(display.getViewBounds());
        expect(objs).to.have.lengthOf(1);
    });


    it('undo changes, validate links in viewport again', function() {
        editor.undo();

        let objs = editor.search(display.getViewBounds());
        expect(objs).to.have.lengthOf(2);


        link2 = preparedData.getFeature('linkLayer', -189220);
        expect(link2.prop('turnRestriction')).to.deep.equal({start: [12345]});
    });
});
