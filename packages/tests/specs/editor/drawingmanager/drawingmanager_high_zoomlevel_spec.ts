/*
 * Copyright (C) 2019-2022 HERE Europe B.V.
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
import dataset from './drawingmanager_high_zoomlevel_spec.json';
import {describe, beforeAll, afterAll, it, expect} from 'vitest';

describe('drawing board work at high zoomlevel', function() {
    let editor;
    let display;
    let preparedData;
    let mapContainer;

    beforeAll(async function() {
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 75.37269535085787, latitude: 11.87506940456375},
            zoomlevel: 15,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });
        await waitForEditorReady(editor);
        mapContainer = display.getContainer();
    });

    afterAll(async function() {
        editor.destroy();
        display.destroy();
    });

    it('draw link at zoomlevel 15', async function() {
        editor.getDrawingBoard().start();

        await mousemove(mapContainer, {x: 200, y: 180}, {x: 200, y: 200});
        await click(mapContainer, 200, 200);

        await mousemove(mapContainer, {x: 100, y: 200}, {x: 100, y: 100});
        await click(mapContainer, 100, 100);

        let lnk = editor.getDrawingBoard().create({featureClass: 'NAVLINK'});
        expect(lnk).not.toBe(undefined);
    });
});
