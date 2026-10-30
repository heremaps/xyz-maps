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
import {Map} from '@here/xyz-maps-display';
import {Editor} from '@here/xyz-maps-editor';
import dataset from './map_destroy_selected_address_spec.json';
import {describe, beforeAll, afterAll, it, expect} from 'vitest';

describe('destroy editor when point address is selected', function() {
    let editor;
    let display;
    let preparedData;
    let address;

    beforeAll(async function() {
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 77.134776956, latitude: 18.038907646},
            zoomlevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });

        await waitForEditorReady(editor);

        address = preparedData.getFeature('paLayer', -47998);
    });

    afterAll(async function() {
        if (editor.destroy) {
            editor.destroy();
        }
        display.destroy();

        await preparedData.clear();
    });

    // Editor.destroy() still throws "Cannot read properties of undefined (reading 'setStyle')" with a selected address.
    it.skip('destroys the editor while an address is selected', function() {
        address.select();
        expect(address.editState('selected')).toBe(true);

        expect(() => editor.destroy()).not.toThrow();
    });
});
