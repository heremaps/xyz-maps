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
import {Map} from '@here/xyz-maps-display';
import {Editor, Area} from '@here/xyz-maps-editor';
import dataset from './area-display-zoom-level.json';
import {describe, beforeAll, afterAll, it, expect} from 'vitest';

describe('Area display zoom level', function() {
    var editor;
    var display;
    let preparedData;

    beforeAll(async function() {
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: -95.341612, latitude: 40.330651},
            // center: {longitude: -95.510586, latitude: 40.333169},
            zoomlevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });

        await waitForEditorReady(editor);
    });

    afterAll(async function() {
        editor.destroy();
        display.destroy();

        await preparedData.clear();
    });

    it('validate the object in viewport', function() {
        let objs = editor.search({rect: display.getViewBounds()});
        expect(objs).toHaveLength(2);
    });


    it('move map and validate the object again in viewport', async function() {
        await waitForEditorReady(editor, ()=>{
            display.setCenter({longitude: -95.34138669444274, latitude: 40.32966953325723});
        });

        let objs = editor.search({rect: display.getViewBounds()});
        expect(objs).toHaveLength(1);
    });


    it('zoom out and validate area is not clicked', async function() {
        await waitForEditorReady(editor, ()=>{
            display.setZoomlevel(17);
        });

        let obj = (await editorClick(editor, 241, 222)).target;

        expect(obj).toBe(undefined);
    });


    it('zoom in again to display area and validate area is clicked', async function() {
        await waitForEditorReady(editor, ()=>{
            display.setZoomlevel(18);
        });

        let obj = <Area>(await editorClick(editor, 242, 146)).target;

        expect(obj.properties).toEqual(expect.objectContaining({
            type: 'building',
            name: 'test'
        }));
    });
});
