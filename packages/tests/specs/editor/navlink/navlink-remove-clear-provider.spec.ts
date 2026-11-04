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
import {waitForViewportReady} from 'displayUtils';
import {Map} from '@here/xyz-maps-display';
import {Editor} from '@here/xyz-maps-editor';
import dataset from './navlink-remove-clear-provider.json';
import {describe, beforeAll, afterAll, it, expect} from 'vitest';

describe('Navlink removal and provider cleanup', function() {
    let editor;
    let display;
    let preparedData;
    let linkProvider;

    beforeAll(async function() {
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 75.59443, latitude: 12.94086},
            zoomlevel: 17,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });

        await waitForEditorReady(editor);
        linkProvider = preparedData.getLayers('linkLayer').getProvider();
    });

    afterAll(async function() {
        editor.destroy();
        display.destroy();
        await preparedData.clear();
    });

    it('validate there is one link in viewport', async function() {
        let objs = editor.search(display.getViewBounds());
        expect(objs).toHaveLength(1);
    });

    it('remove link and clear provider', async function() {
        let objs = editor.search(display.getViewBounds());
        objs.forEach((o) => {
            o.remove();
        });

        await waitForViewportReady(display, ()=>{
            linkProvider.clear();
        });

        objs = editor.search(display.getViewBounds());
        expect(objs).toHaveLength(0);
    });
});
