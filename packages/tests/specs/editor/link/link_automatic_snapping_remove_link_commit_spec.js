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
import dataset from './link_automatic_snapping_remove_link_commit_spec.json';

describe('link auto remove link then commit', function() {
    const expect = chai.expect;

    let editor;
    let display;
    let preparedData;
    let link;

    before(async function() {
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 77.8207847, latitude: 14.3669},
            zoomLevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });

        await editorTests.waitForEditorReady(editor);

        link = preparedData.getFeature('linkLayer', -189019);
    });

    after(async function() {
        editor.destroy();
        display.destroy();
        await preparedData.clear();
    });

    it('select link to drag and the link is automatically removed', async function() {
        link.select();

        let mapContainer = display.getContainer();
        await testUtils.events.drag(mapContainer, {x: 100, y: 100}, {x: 200, y: 100});

        expect(editor.info()).to.have.lengthOf(1);

        let objs = editor.search(display.getViewBounds());

        expect(objs).to.have.lengthOf(0);
    });

    it('submit the change and validate link is removed', async function() {
        let result;

        await editorTests.waitForEditorReady(editor, async ()=>{
            await new Promise((resolve)=>{
                result = editor.submit({
                    onSuccess: function(idMap) {
                        resolve();
                    }
                });
            });
        });

        expect(result).to.be.true;
        expect(editor.info()).to.have.lengthOf(0);

        let vb = editor.search({
            rect: display.getViewBounds()
        });
        expect(vb).to.have.lengthOf(0);
    });
});
