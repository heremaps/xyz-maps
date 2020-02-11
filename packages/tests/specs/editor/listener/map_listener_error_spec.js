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
import {editorTests, testUtils, prepare} from 'hereTest';
import {Map} from '@here/xyz-maps-core';
import {features, Editor} from '@here/xyz-maps-editor';
import dataset from './map_listener_error_spec.json';

describe('map error listener', function() {
    const expect = chai.expect;

    var editor;
    var display;
    var preparedData;

    var link;
    var linkLayer;
    var listener;

    before(async function() {
        preparedData = await prepare(dataset);

        display = new Map(document.getElementById('map'), {
            center: {longitude: 75.491019, latitude: 12.775706},
            zoomLevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });
        await editorTests.waitForEditorReady(editor);

        linkLayer = preparedData.getLayers('linkLayer');
    });

    after(async function() {
        editor.destroy();
        display.destroy();
        await preparedData.clear();
    });

    xit('submit a link with invalid token', function(done) {
        XMLHttpRequest.prototype.realOpen = XMLHttpRequest.prototype.open;

        XMLHttpRequest.prototype.open = function(t, u, s) {
            u += 'invalidtoken';
            this.realOpen(t, u, s);
            XMLHttpRequest.prototype.open = XMLHttpRequest.prototype.realOpen;
        };

        listener = new testUtils.Listener(editor, ['error']);

        let lnk = editor.search({point: {longitude: 86.904889, latitude: 16.410735}, radius: 50, remote: true});

        let results = listener.stop();
        expect(results.error).to.have.lengthOf(1);
    });
});
