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
import {createEditorFixture, waitForEditorReady} from 'editorUtils';
import {drag} from 'triggerEvents';
import {beforeEach, describe, expect, it} from 'vitest';
import {userEvent} from 'vitest/browser';
import dataset from './link_editable_spec.json';

describe('link editable', function() {
    let link;
    let editor;
    let display;
    let preparedData;
    let mapContainer;
    let linkLayer;

    beforeEach(async function() {
        ({preparedData, display, editor} = await createEditorFixture(dataset, {
            center: {longitude: 80.14459, latitude: 17.96039},
            zoomlevel: 18
        }));
        mapContainer = display.getContainer();

        link = preparedData.getFeature('linkLayer', -189070);
        linkLayer = preparedData.getLayers('linkLayer');
    });

    it('set link to not editable', function() {
        link.editable(false);

        expect(link.coord()).toEqualWithTolerance([
            [80.142980675, 17.961410599, 0],
            [80.144053558, 17.961410599, 0],
            [80.144053558, 17.96039, 0]
        ], 1e-6);
    });

    it('click on link and try drag again', async function() {
        link.editable(false);
        // click on link
        await userEvent.click(mapContainer, {position: {x: 100, y: 100}, modifiers: ['Alt']});

        // try drag link shape point
        await waitForEditorReady(editor, async ()=>{
            await drag(mapContainer, {x: 300, y: 300}, {x: 400, y: 300});
        });

        let lnk = editor.getFeature(link.id, linkLayer);

        // link geometry is not changed
        expect(lnk.coord()).toEqualWithTolerance([
            [80.142980675, 17.961410599, 0],
            [80.144053558, 17.961410599, 0],
            [80.144053558, 17.96039, 0]
        ], 1e-6);
    });

    it('set link to editable and drag it', async function() {
        await waitForEditorReady(editor, ()=>{
            display.setCenter({longitude: 80.14459, latitude: 17.96039});
        });

        let lnk = editor.getFeature(link.id, linkLayer);
        lnk.editable(false);
        lnk.editable(true);

        // click on link
        await userEvent.click(mapContainer, {position: {x: 100, y: 100}, modifiers: ['Alt']});

        // drag link shape point
        await drag(mapContainer, {x: 300, y: 300}, {x: 400, y: 300});

        lnk = editor.getFeature(link.id, linkLayer);

        // link geometry is changed
        expect(lnk.coord()).toEqualWithTolerance([
            [80.142980675, 17.961410599, 0],
            [80.144053558, 17.961410599, 0],
            [80.14459, 17.96039, 0]
        ], 1e-6);
    });
});
