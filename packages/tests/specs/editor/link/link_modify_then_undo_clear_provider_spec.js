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
 */import {editorTests, displayTests, prepare} from 'hereTest';
import {Map} from '@here/xyz-maps-core';
import {Editor} from '@here/xyz-maps-editor';
import dataset from './link_modify_then_undo_clear_provider_spec.json';

describe('link modify two time and undo then clear provider', function() {
    const expect = chai.expect;

    var editor;
    var display;
    var preparedData;

    var linkLayer;
    var linkProvider;
    var link;

    before(async function() {
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 77.13201659362801, latitude: 13.660441367361372},
            zoomLevel: 17,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });

        await editorTests.waitForEditorReady(editor);
        linkLayer = preparedData.getLayers('linkLayer');
        linkProvider = preparedData.getLayers('linkLayer').getProvider();

        link = preparedData.getFeature('linkLayer', -189076);
    });

    after(async function() {
        editor.destroy();
        display.destroy();
        await preparedData.clear();
    });

    it('modify link', async function() {
        link.addShape({x: 100, y: 100});

        expect(link.coord()).to.have.lengthOf(3);
    });

    it('modify link again', async function() {
        link.addShape({x: 400, y: 100});

        expect(link.coord()).to.have.lengthOf(4);
    });

    it('undo change', async function() {
        editor.undo();
        let lnk = editor.getFeature(link.id, linkLayer);
        expect(lnk.coord()).to.have.lengthOf(3);
    });

    it('clear provider validate again the link coordinate', async function() {
        await displayTests.waitForViewportReady(display, ()=>{
            linkProvider.clear();
        });

        let lnk = editor.getFeature(link.id, linkLayer);
        expect(lnk.coord()).to.have.lengthOf(3);
    });
});
