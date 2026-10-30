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
import {userEvent} from 'vitest/browser';
import {Map} from '@here/xyz-maps-display';
import {Editor} from '@here/xyz-maps-editor';
import dataset from './turn-restrictions-set-start-delete-link.json';
import {describe, beforeAll, afterAll, it, expect} from 'vitest';

describe('Turn-restriction editing after Navlink deletion', function() {
    let editor;
    let display;
    let preparedData;
    let mapContainer;
    let link1;
    let link2;

    beforeAll(async function() {
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 77.03466354414104, latitude: 13.037041278065471},
            zoomlevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });

        await waitForEditorReady(editor);
        mapContainer = display.getContainer();

        link1 = preparedData.getFeature('linkLayer', -189219);
        link2 = preparedData.getFeature('linkLayer', -189220);
        let objs = editor.search({rect: display.getViewBounds()});
        expect(objs).toHaveLength(2);
    });

    afterAll(async function() {
        editor.destroy();
        display.destroy();
        await preparedData.clear();
    });

    it('set turn restriction and validate its value', async function() {
        link2.select();
        link2.editTurnRestrictions();

        await userEvent.click(mapContainer, {position: {x: 300, y: 300}, modifiers: ['Alt']});

        expect(link2.prop('turnRestriction')).toEqual({start: [12345]});
    });


    it('remove the link, validate links in viewport again', function() {
        link2.remove();

        let objs = editor.search(display.getViewBounds());
        expect(objs).toHaveLength(1);
    });


    it('undo changes, validate links in viewport again', function() {
        editor.undo();

        let objs = editor.search(display.getViewBounds());
        expect(objs).toHaveLength(2);


        link2 = preparedData.getFeature('linkLayer', -189220);
        expect(link2.prop('turnRestriction')).toEqual({start: [12345]});
    });
});
