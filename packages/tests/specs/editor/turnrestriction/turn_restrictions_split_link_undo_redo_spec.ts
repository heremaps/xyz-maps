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
import {waitForEditorReady, editorClick} from 'editorUtils';
import {userEvent} from 'vitest/browser';
import {Map} from '@here/xyz-maps-display';
import {Editor} from '@here/xyz-maps-editor';
import dataset from './turn_restrictions_split_link_undo_redo_spec.json';
import {NavlinkShape} from '@here/xyz-maps-editor';
import {describe, beforeAll, afterAll, it, expect} from 'vitest';

describe('edit turn restriction split link then undo and redo the change', function() {
    let editor;
    let display;
    let preparedData;
    let mapContainer;
    let link1;
    let link2;
    let linkLayer;
    let splitLinks;

    beforeAll(async function() {
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 77.189374, latitude: 13.813399},
            zoomlevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });

        await waitForEditorReady(editor);
        mapContainer = display.getContainer();
        linkLayer = preparedData.getLayers('linkLayer');

        link1 = preparedData.getFeature('linkLayer', '-189237');
        link2 = preparedData.getFeature('linkLayer', '-189238');

        let objs = editor.search({rect: display.getViewBounds()});
        expect(objs).toHaveLength(2);
    });

    afterAll(async function() {
        editor.destroy();
        display.destroy();
        await preparedData.clear();
    });

    it('set turn restriction and validate tr', async function() {
        link1.editTurnRestrictions();

        await userEvent.click(mapContainer, {position: {x: 180, y: 100}, modifiers: ['Alt']});

        // deactivate turn restriction
        await userEvent.click(mapContainer, {position: {x: 120, y: 200}, modifiers: ['Alt']});

        expect(link1.prop('turnRestriction')).toEqual({start: [link2.id]});
    });

    it('get link to split and then validate link', async function() {
        link1.select();
        let shape = <NavlinkShape>(await editorClick(editor, 300, 100)).target;
        splitLinks = shape.splitLink();

        expect(splitLinks[0].prop('originLink')).toBe(link1.id);
        expect(splitLinks[1].prop('originLink')).toBe(link1.id);
        expect(splitLinks[0].prop('parentLink')).toBe(link1.id);
        expect(splitLinks[1].prop('parentLink')).toBe(link1.id);
    });

    it('valdiate again after undo and redo', function() {
        editor.undo();

        let lnk2 = editor.getFeature(link2.id, linkLayer);
        let lnk1 = editor.getFeature(link1.id, linkLayer);

        expect(lnk1.prop('turnRestriction')).toEqual({start: [lnk2.id]});

        editor.redo();

        let splnk0 = editor.getFeature(splitLinks[0].id, linkLayer);
        let splnk1 = editor.getFeature(splitLinks[1].id, linkLayer);

        expect(splnk0.prop('originLink')).toBe(link1.id);
        expect(splnk1.prop('originLink')).toBe(link1.id);
        expect(splnk0.prop('parentLink')).toBe(link1.id);
        expect(splnk1.prop('parentLink')).toBe(link1.id);
    });
});
