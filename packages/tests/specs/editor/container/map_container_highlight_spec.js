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
import {prepare} from 'utils';
import {waitForEditorReady} from 'editorUtils';
import {Map} from '@here/xyz-maps-display';
import {Editor} from '@here/xyz-maps-editor';
import chaiAlmost from 'chai-almost';
import dataset from './map_container_highlight_spec.json';

describe('map container highlight', function() {
    const expect = chai.expect;

    let editor;
    let display;
    let preparedData;
    let container;
    let place1;
    let place2;

    before(async function() {
        chai.use(chaiAlmost());
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            renderOptions: {
                preserveDrawingBuffer: true
            },
            center: {longitude: 80.47969088691707, latitude: 16.475773201014732},
            zoomlevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });
        await waitForEditorReady(editor);
        container = editor.createFeatureContainer();

        place1 = preparedData.getFeature('placeLayer', -29493);
        place2 = preparedData.getFeature('placeLayer', -29494);

        // put places to container
        container.push(place1, place2);
    });

    after(async function() {
        editor.destroy();
        display.destroy();
        await preparedData.clear();
    });

    it('validate places in container are highlighted', async function() {
        container.highlight();

        expect(place1.style()[0]).to.deep.include({zIndex: 0, type: 'Circle', radius: 6, fill: '#ff0000'});
        expect(place2.style()[0]).to.deep.include({zIndex: 0, type: 'Circle', radius: 6, fill: '#ff0000'});

        let overlay = editor.getOverlay();
        let features = overlay.search(display.getViewBounds());
        // two highlight circles
        expect(features).to.be.lengthOf(2);
        let h1 = editor.getOverlay().search({point: {longitude: 80.478081562, latitude: 16.476287616}, radius: 5});
        expect(h1[0].geometry.coordinates).to.deep.almost(place1.geometry.coordinates);
        let h2 = editor.getOverlay().search({point: {longitude: 80.478618003, latitude: 16.476287616}, radius: 5});
        expect(h2[0].geometry.coordinates).to.deep.almost(place2.geometry.coordinates);
    });

    it('places in container are unhighlighted', async function() {
        container.unhighlight();

        expect(place1.style()[0]).to.deep.include({zIndex: 0, type: 'Circle', radius: 6, fill: '#ff0000'});
        expect(place2.style()[0]).to.deep.include({zIndex: 0, type: 'Circle', radius: 6, fill: '#ff0000'});

        let overlay = editor.getOverlay();
        expect(overlay.search(display.getViewBounds())).to.be.lengthOf(0);
    });
});
