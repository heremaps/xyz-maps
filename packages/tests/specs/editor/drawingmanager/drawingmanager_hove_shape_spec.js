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
import {prepare} from 'utils';
import {waitForEditorReady} from 'editorUtils';
import {click, mousemove} from 'triggerEvents';
import {Map} from '@here/xyz-maps-display';
import {Editor} from '@here/xyz-maps-editor';
import dataset from './drawingmanager_hove_shape_spec.json';

describe('Hover shape point in drawingboard create link then move mouse', function() {
    const expect = chai.expect;

    let editor;
    let display;
    let preparedData;
    let mapContainer;
    let link;

    before(async function() {
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 77.26345, latitude: 13.04889},
            zoomLevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });
        await waitForEditorReady(editor);
        mapContainer = display.getContainer();
    });

    after(async function() {
        editor.destroy();
        display.destroy();
    });

    it('start drawingmanager and add one shape point for two times and create', async function() {
        editor.getDrawingBoard().start();

        // add one shape
        await mousemove(mapContainer, {x: 100, y: 200}, {x: 200, y: 200});
        await click(mapContainer, 200, 200);

        // move mouse point
        await mousemove(mapContainer, {x: 200, y: 200}, {x: 200, y: 300});

        // hover shape point
        await mousemove(mapContainer, {x: 200, y: 300}, {x: 200, y: 200});

        editor.getDrawingBoard().cancel();

        await mousemove(mapContainer, {x: 200, y: 200}, {x: 200, y: 300});

        // start drawingmanager again and add one shape point
        editor.getDrawingBoard().start();

        await mousemove(mapContainer, {x: 200, y: 200}, {x: 200, y: 300});
        await click(mapContainer, 200, 300);

        await mousemove(mapContainer, {x: 200, y: 300}, {x: 300, y: 300});
        await click(mapContainer, 300, 300);

        await mousemove(mapContainer, {x: 300, y: 300}, {x: 350, y: 300});

        await mousemove(mapContainer, {x: 350, y: 300}, {x: 300, y: 300});

        link = editor.getDrawingBoard().create({featureClass: 'NAVLINK'});

        await mousemove(mapContainer, {x: 300, y: 300}, {x: 360, y: 300});

        expect(link.coord()).to.have.lengthOf(2);
        expect(editor.info()).to.have.lengthOf(1);
    });
});
