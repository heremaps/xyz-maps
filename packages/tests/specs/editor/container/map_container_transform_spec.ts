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
import {drag} from 'triggerEvents';
import {Map} from '@here/xyz-maps-display';
import {Editor} from '@here/xyz-maps-editor';
import chaiAlmost from 'chai-almost';
import dataset from './map_container_transform_spec.json';

describe('map container transform', function() {
    const expect = chai.expect;

    let editor;
    let display;
    let preparedData;
    let mapContainer;
    let container;
    let poi;
    let link;

    before(async function() {
        chai.use(chaiAlmost());
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 80.47614231309831, latitude: 16.44729312879116},
            zoomlevel: 18,
            layers: preparedData.getLayers(),
            debug: true
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });
        await waitForEditorReady(editor);

        mapContainer = display.getContainer();
        container = editor.createFeatureContainer();

        poi = preparedData.getFeature('placeLayer', -29497);
        link = preparedData.getFeature('linkLayer', -188844);

        // put features to container
        container.push(link, poi);
    });

    after(async function() {
        editor.destroy();
        display.destroy();
        await preparedData.clear();
    });

    it('transform in container ', async function() {
        container.transform();

        // move container
        await drag(mapContainer, {x: 158, y: 161}, {x: 258, y: 161});

        expect(link.coord()).to.deep.almost([
            [80.475123072, 16.448270659, 0],
            [80.475176716, 16.44775617, 0]
        ]);

        expect(poi.coord()).to.deep.almost([
            80.475605869, 16.447807619, 0
        ]);
    });

    it('pop one object from container and transform rest feature in container', async function() {
        container.pop();

        container.transform();

        // move container
        // await drag(mapContainer, {x: 258, y: 159}, {x: 312, y: 159});
        await drag(mapContainer, {x: 212 - 15, y: 159}, {x: 312 - 15, y: 159});

        expect(link.coord()).to.deep.almost([
            [80.475550546, 16.448270659, 0],
            [80.475556693, 16.44775617, 0]

        ]);

        expect(poi.coord()).to.deep.almost([
            80.475605869, 16.447807619, 0
        ]);
    });
});
