/*
 * Copyright (C) 2019-2020 HERE Europe B.V.
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
import {editorTests, testUtils} from 'hereTest';
import {Map, providers, layers} from '@here/xyz-maps-core';
import {Editor} from '@here/xyz-maps-editor';

describe('editor triggers ready without adding layer to it', function() {
    const expect = chai.expect;

    let editor;
    let display;

    after(async function() {
        editor && editor.destroy();
        display && display.destroy();
    });

    it('observe ready is triggered', async function() {
        display = new Map(document.getElementById('map'), {
            center: {longitude: 77.02831, latitude: 12.9356},
            zoomLevel: 18,
            layers: [new layers.TileLayer({
                min: 4,
                max: 15,
                provider: new providers.LocalProvider({
                    name: 'my Point Provider'
                })
            })]
        });
        editor = new Editor(display);
        let observer = new testUtils.Observer(editor, 'ready');

        await editorTests.waitForEditorReady(editor);

        let results = observer.stop();
        expect(results['ready']).to.have.lengthOf(1);
    });
});
