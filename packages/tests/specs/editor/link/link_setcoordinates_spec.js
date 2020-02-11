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
import {editorTests, displayTests, testUtils, prepare} from 'hereTest';
import {Map} from '@here/xyz-maps-core';
import {Editor} from '@here/xyz-maps-editor';
import dataset from './link_setcoordinates_spec.json';

describe('set link coordinates', function() {
    const expect = chai.expect;

    let editor;
    let display;
    let preparedData;
    let mapContainer;
    let link;

    before(async function() {
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 77.179447, latitude: 13.404587},
            zoomLevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });

        await editorTests.waitForEditorReady(editor);
        mapContainer = display.getContainer();

        link = preparedData.getFeature('linkLayer', -189080);
    });

    after(async function() {
        editor.destroy();
        display.destroy();
        await preparedData.clear();
    });

    it('set coordinate by coord and validate', function() {
        link.coord([
            [77.17897617923736, 13.403983932102679, 0],
            [77.17784, 13.40511, 0]
        ]);

        expect(link.coord()).to.deep.equal([
            [77.17897617923736, 13.403983932102679, 0],
            [77.17784, 13.40511, 0]
        ]);
    });

    it('set coordinate, click and drag the link', async function() {
        link.coord([
            [77.17837384668902, 13.405631823674528, 0],
            [77.178910288492, 13.4040644102724, 0]
        ]);

        await testUtils.events.click(mapContainer, 200, 100);
        await testUtils.events.drag(mapContainer, {x: 200, y: 100}, {x: 100, y: 200});

        expect(link.coord()).to.deep.equal([
            [77.177837405, 13.405109998, 0],
            [77.178910288492, 13.4040644102724, 0]
        ]);
    });

    it('drag the map and validate the created link', async function() {
        await editorTests.waitForEditorReady(editor, async ()=>{
            await testUtils.events.drag(mapContainer, {x: 100, y: 100}, {x: 100, y: 200});
        });

        expect(link.coord()).to.deep.equal([
            [77.177837405, 13.405109998, 0],
            [77.178910288492, 13.4040644102724, 0]
        ]);
    });
});
