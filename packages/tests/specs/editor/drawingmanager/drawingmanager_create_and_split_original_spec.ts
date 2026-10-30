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
import {waitForEditorReady, submit} from 'editorUtils';
import {mousemove} from 'triggerEvents';
import {userEvent} from 'vitest/browser';
import {Map} from '@here/xyz-maps-display';
import {Editor} from '@here/xyz-maps-editor';
import dataset from './drawingmanager_create_and_split_original_spec.json';
import {describe, beforeAll, afterAll, it, expect} from 'vitest';

describe('Create new Links and split original link', function() {
    let editor;
    let display;
    let preparedData;
    let mapContainer;
    let link;

    beforeAll(async function() {
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 79.26345, latitude: 13.04889},
            zoomlevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });
        await waitForEditorReady(editor);
        mapContainer = display.getContainer();
        link = preparedData.getFeature('linkLayer', -188849);
    });

    afterAll(async function() {
        editor.destroy();
        display.destroy();
        await preparedData.clear();
    });

    it('draw link with connectTo link and validate it', async function() {
        editor.getDrawingBoard().start({
            position: {x: 143, y: 95},
            connectTo: link
        });

        await mousemove(mapContainer, {x: 100, y: 200}, {x: 200, y: 200});
        await userEvent.click(mapContainer, {position: {x: 200, y: 200}, modifiers: ['Alt']});

        let lnk;
        await waitForEditorReady(editor, ()=>{
            lnk = editor.getDrawingBoard().create({featureClass: 'NAVLINK'});
        });
        let lnk1 = editor.info()[1];
        let lnk2 = editor.info()[2];

        expect(lnk1.geometry.coordinates).toEqualWithTolerance([
            [79.262377116, 13.049935177, 0],
            [79.262071345, 13.049935177, 0]
        ], 1e-6);

        expect(lnk2.geometry.coordinates).toEqualWithTolerance([
            [79.262071345, 13.049935177, 0],
            [79.261840675, 13.049935177, 0]
        ], 1e-6);

        expect(lnk.coord()).toEqualWithTolerance([
            [79.262071345, 13.049935177, 0],
            [79.262377116, 13.049412589, 0]
        ], 1e-6);
    });
});
