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
import {Editor} from '@here/xyz-maps-editor';
import dataset from './map_container_highlight_spec.json';

describe('map container highlight', function() {
    const expect = chai.expect;

    let editor;
    let display;
    let preparedData;
    let mapContainer;
    let container;
    let poi1;
    let poi2;

    before(async function() {
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            renderOptions: {
                preserveDrawingBuffer: true
            },
            center: {longitude: 80.47969088691707, latitude: 16.475773201014732},
            zoomLevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });
        await editorTests.waitForEditorReady(editor);
        mapContainer = display.getContainer();
        container = editor.createFeatureContainer();

        poi1 = preparedData.getFeature('placeLayer', -29493);
        poi2 = preparedData.getFeature('placeLayer', -29494);

        // put places to container
        container.push(poi1, poi2);
    });

    after(async function() {
        editor.destroy();
        display.destroy();
        await preparedData.clear();
    });

    it('validate places in container are highlighted', async function() {
        container.highlight();

        expect(poi1.style()[0]).to.deep.include({zIndex: 0, type: 'Circle', radius: 6, fill: '#ff0000'});
        expect(poi2.style()[0]).to.deep.include({zIndex: 0, type: 'Circle', radius: 6, fill: '#ff0000'});

        let overlay = editor.getOverlay();
        // two highlight circles
        expect(overlay.search(display.getViewBounds())).to.be.lengthOf(2);
    });

    it('places in container are unhighlighted', async function() {
        container.unhighlight();

        expect(poi1.style()[0]).to.deep.include({zIndex: 0, type: 'Circle', radius: 6, fill: '#ff0000'});
        expect(poi2.style()[0]).to.deep.include({zIndex: 0, type: 'Circle', radius: 6, fill: '#ff0000'});

        let overlay = editor.getOverlay();
        expect(overlay.search(display.getViewBounds())).to.be.lengthOf(0);
    });
});
