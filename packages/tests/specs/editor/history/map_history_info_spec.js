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
import dataset from './map_history_info_spec.json';

describe('map history info', function() {
    const expect = chai.expect;

    var editor;
    var display;
    var preparedData;

    var link1;

    before(async function() {
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 73.192904, latitude: 18.916527},
            zoomLevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });

        await editorTests.waitForEditorReady(editor);

        link1 = preparedData.getFeature('linkLayer', -189004);
    });

    after(async function() {
        editor.destroy();
        display.destroy();
        await preparedData.clear();
    });

    it('add a link object', function() {
        let p = new features.Place({x: 100, y: 200}, {featureClass: 'PLACE'});
        let poi = editor.addFeature(p);

        expect(editor.get('history.current')).to.equal(1);
        expect(editor.get('history.length')).to.equal(1);
        expect(editor.get('changes.length')).to.equal(1);
    });

    it('get a link and select', async function() {
        link1.select();
        let mapContainer = display.getContainer();
        await testUtils.events.drag(mapContainer, {x: 300, y: 200}, {x: 300, y: 150});

        expect(editor.get('history.current')).to.equal(2);
        expect(editor.get('history.length')).to.equal(2);
        expect(editor.get('changes.length')).to.equal(5);

        expect(editor.info()).to.have.lengthOf(5);
    });

    it('undo changes', async function() {
        editor.undo();

        expect(editor.get('history.current')).to.equal(1);
        expect(editor.get('history.length')).to.equal(2);
        expect(editor.get('changes.length')).to.equal(1);

        expect(editor.info()).to.have.lengthOf(1);
    });
});
