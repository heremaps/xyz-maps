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
import {NavlinkShape} from '@here/xyz-maps-editor';
import {createEditorFixture, editorClick} from 'editorUtils';
import {beforeEach, describe, expect, it} from 'vitest';
import {userEvent} from 'vitest/browser';
import dataset from './map_history_undo_split_restrictions_spec.json';

describe('turn restriction with spliting the depart link and undo', function() {
    let editor;
    let display;
    let preparedData;
    let mapContainer;

    let link1;
    let link2;
    let splitLinks;
    let linkLayer;

    beforeEach(async function() {
        ({preparedData, display, editor} = await createEditorFixture(dataset, {
            center: {longitude: 76.868793, latitude: 13.30644},
            zoomlevel: 18
        }));

        mapContainer = display.getContainer();

        link1 = preparedData.getFeature('linkLayer', -189014);
        link2 = preparedData.getFeature('linkLayer', -189015);
        linkLayer = preparedData.getLayers('linkLayer');
    });

    it('restores split links and turn restrictions through undo', async () => {
        // click on connection point to edit turn restrictions
        {
            link2.editTurnRestrictions();

            await userEvent.click(mapContainer, {position: {x: 390, y: 400}, modifiers: ['Alt']});

            expect(link2.prop('turnRestriction')).toEqual({start: [link1.id]});
        }

        // get the shapepoint to split the link, validate link is splitted correctly
        {
            link2.select();
            let linkshape = <NavlinkShape>(await editorClick(editor, 450, 400)).target;

            splitLinks = linkshape.splitLink();

            expect(splitLinks[0].prop('originLink')).toBe(link2.id);
            expect(splitLinks[1].prop('originLink')).toBe(link2.id);
            expect(splitLinks[0].prop('parentLink')).toBe(link2.id);
            expect(splitLinks[1].prop('parentLink')).toBe(link2.id);
        }

        // undo last split, validate link turn restriction value
        {
            editor.undo();

            let lnk1 = editor.getFeature(link1.id, linkLayer);
            let lnk2 = editor.getFeature(link2.id, linkLayer);

            expect(lnk2.prop('turnRestriction')).toEqual({start: [lnk1.id]});
        }

        // redo last split, verify splitted link
        {
            editor.redo();

            let splnk1 = editor.getFeature(splitLinks[0].id, linkLayer);
            let splnk2 = editor.getFeature(splitLinks[1].id, linkLayer);

            expect(splnk1.prop('originLink')).toBe(link2.id);
            expect(splnk2.prop('originLink')).toBe(link2.id);
            expect(splnk1.prop('parentLink')).toBe(link2.id);
            expect(splnk2.prop('parentLink')).toBe(link2.id);
        }
    });
});
