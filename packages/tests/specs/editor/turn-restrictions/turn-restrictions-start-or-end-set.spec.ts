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
import dataset from './turn-restrictions-start-or-end-set.json';
import {describe, beforeAll, afterAll, it, expect} from 'vitest';

describe('Turn-restriction start and end selection', function() {
    let editor;
    let display;
    let preparedData;
    let mapContainer;
    let link1;
    let link2;
    let link3;
    let link4;

    beforeAll(async function() {
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 77.15267063201952, latitude: 13.550232964474148},
            zoomlevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });

        await waitForEditorReady(editor);
        mapContainer = display.getContainer();

        link1 = preparedData.getFeature('linkLayer', -189215);
        link2 = preparedData.getFeature('linkLayer', -189216);
        link3 = preparedData.getFeature('linkLayer', -189217);
        link4 = preparedData.getFeature('linkLayer', -189218);

        let objs = editor.search({rect: display.getViewBounds()});
        expect(objs).toHaveLength(4);
    });

    afterAll(async function() {
        editor.destroy();
        display.destroy();
        await preparedData.clear();
    });

    it('set turn restriction value and edit turn restriction, activate ture restriction', async function() {
        link3.prop('turnRestriction', {end: [link4.id]});
        expect(link3.prop('turnRestriction')).toEqual({end: [link4.id]});

        link3.editTurnRestrictions();
        await userEvent.click(mapContainer, {position: {x: 415, y: 200}, modifiers: ['Alt']});

        expect(link3.prop('turnRestriction')).toEqual({end: []});
    });

    it('set turn restriction and edit turn restriction, activate ture restriction', async function() {
        link3.prop('turnRestriction', {end: [link4.id]});
        expect(link3.prop('turnRestriction')).toEqual({end: [link4.id]});

        link3.editTurnRestrictions();
        await userEvent.click(mapContainer, {position: {x: 415, y: 100}, modifiers: ['Alt']});
        expect(link3.prop('turnRestriction')).toEqual({end: [link4.id], start: [link2.id]});
    });

    it('set end and edit turn restriction, activate ture restriction', async function() {
        link3.prop('turnRestriction', {end: [link4.id]});
        expect(link3.prop('turnRestriction')).toEqual({end: [link4.id]});

        link3.editTurnRestrictions();
        await userEvent.click(mapContainer, {position: {x: 385, y: 100}, modifiers: ['Alt']});
        expect(link3.prop('turnRestriction')).toEqual({end: [link4.id], start: [link1.id]});
    });

    it('set both start and end and edit turn restriction, activate ture restriction', async function() {
        link3.prop('turnRestriction', {end: [link4.id], start: [link1.id]});
        expect(link3.prop('turnRestriction')).toEqual({end: [link4.id], start: [link1.id]});

        link3.editTurnRestrictions();
        await userEvent.click(mapContainer, {position: {x: 385, y: 100}, modifiers: ['Alt']});

        expect(link3.prop('turnRestriction')).toEqual({end: [link4.id], start: []});
    });


    it('set both start and end and edit turn restriction, activate ture restriction', async function() {
        link3.prop('turnRestriction', {end: [link4.id], start: [link1.id]});
        expect(link3.prop('turnRestriction')).toEqual({end: [link4.id], start: [link1.id]});

        link3.editTurnRestrictions();
        await userEvent.click(mapContainer, {position: {x: 415, y: 200}, modifiers: ['Alt']});

        expect(link3.prop('turnRestriction')).toEqual({end: [], start: [link1.id]});
    });


    it('set both start and end and edit turn restriction, activate ture restriction', async function() {
        link3.prop('turnRestriction', {end: [link4.id], start: [link1.id]});
        expect(link3.prop('turnRestriction')).toEqual({end: [link4.id], start: [link1.id]});

        link3.editTurnRestrictions();
        await userEvent.click(mapContainer, {position: {x: 415, y: 100}, modifiers: ['Alt']});

        expect(link3.prop('turnRestriction')).toEqual({end: [link4.id], start: [link1.id, link2.id]});
    });

    it('set end and edit turn restriction, activate ture restriction', async function() {
        link3.prop('turnRestriction', {end: [link4.id]});
        expect(link3.prop('turnRestriction')).toEqual({end: [link4.id]});

        link3.editTurnRestrictions();
        await userEvent.click(mapContainer, {position: {x: 385, y: 100}, modifiers: ['Alt']});

        expect(link3.prop('turnRestriction')).toEqual({end: [link4.id], start: [link1.id]});
    });


    it('set end and edit turn restriction, activate ture restriction', async function() {
        link3.prop('turnRestriction', {end: [link4.id]});
        expect(link3.prop('turnRestriction')).toEqual({end: [link4.id]});

        link3.editTurnRestrictions();
        await userEvent.click(mapContainer, {position: {x: 415, y: 200}, modifiers: ['Alt']});

        expect(link3.prop('turnRestriction')).toEqual({end: []});
    });


    it('set end and edit turn restriction, activate ture restriction', async function() {
        link3.prop('turnRestriction', {end: [link4.id]});
        expect(link3.prop('turnRestriction')).toEqual({end: [link4.id]});

        link3.editTurnRestrictions();
        await userEvent.click(mapContainer, {position: {x: 415, y: 100}, modifiers: ['Alt']});

        expect(link3.prop('turnRestriction')).toEqual({end: [link4.id], start: [link2.id]});
    });
});
