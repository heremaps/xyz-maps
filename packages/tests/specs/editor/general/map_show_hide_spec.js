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
import dataset from './map_show_hide_spec.json';

describe('map activate and deactivate', function() {
    const expect = chai.expect;

    let editor;
    let display;
    let preparedData;
    let mapContainer;
    let link;

    before(async function() {
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 75.5553, latitude: 13.99646},
            zoomLevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });

        await editorTests.waitForEditorReady(editor);

        mapContainer = display.getContainer();

        link = preparedData.getFeature('linkLayer', -188912);
    });

    after(async function() {
        editor.destroy();
        display.destroy();
        await preparedData.clear();
    });

    it('drag link shape point, validate link shape point', async function() {
        link.select();
        await testUtils.events.drag(mapContainer, {x: 100, y: 100}, {x: 150, y: 100});

        expect(link.coord()).to.deep.equal([
            [75.553958896, 13.997501028, 0],
            [75.554227116, 13.997501028, 0],
            [75.554227116, 13.997761284, 0]
        ]);
    });

    it('deactivate editor', function() {
        editor.active(false);

        expect(editor.active()).to.be.false;
    });


    it('activate editor', function() {
        editor.active(true);

        let objs = editor.search({rect: display.getViewBounds()});
        expect(objs).to.have.lengthOf(1);
    });


    it('drag link shape', async function() {
        link.select();
        await testUtils.events.drag(mapContainer, {x: 150, y: 100}, {x: 100, y: 100});

        expect(link.coord()).to.deep.equal([
            [75.553690675, 13.997501028, 0],
            [75.554227116, 13.997501028, 0],
            [75.554227116, 13.997761284, 0]
        ]);
    });
});
