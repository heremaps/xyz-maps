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
 */import {editorTests, testUtils, prepare} from 'hereTest';
import {Map} from '@here/xyz-maps-core';
import {features, Editor} from '@here/xyz-maps-editor';
import dataset from './link_geofence_spec.json';

describe('link geofence setting', function() {
    const expect = chai.expect;

    let link;
    let editor;
    let display;
    let preparedData;
    let mapContainer;
    let linkLayer;

    before(async function() {
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 80.63257782733888, latitude: 17.71492567213454},
            zoomLevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });

        await editorTests.waitForEditorReady(editor);
        mapContainer = display.getContainer();

        link = preparedData.getFeature('linkLayer', -189071);
        linkLayer = preparedData.getLayers('linkLayer');
    });

    after(async function() {
        editor.destroy();
        display.destroy();
        await preparedData.clear();
    });

    it('drag shape point and validate', async function() {
        link.select();
        await testUtils.events.drag(mapContainer, {x: 300, y: 100}, {x: 400, y: 200});

        expect(link.coord()).to.deep.equal([
            [80.630968502, 17.715947679, 0],
            [80.632577828, 17.715436676, 0]
        ]);
    });

    xit('undo and set geofence', async function() {
        editor.undo();

        let lnk = editor.getFeature(link.id, linkLayer);
        lnk.select();
        lnk.setGeoFence(50);

        await testUtils.events.drag(mapContainer, {x: 300, y: 100}, {x: 400, y: 200});

        expect(lnk.coord()).to.deep.equal([
            [80.630968502, 17.715947679, 0],
            [80.632577828, 17.715436676, 0]
        ]);
    });


    it('undo and remove geofence, validate again', async function() {
        editor.undo();

        let lnk = editor.getFeature(link.id, linkLayer);
        lnk.select();
        lnk.setGeoFence(false);

        await testUtils.events.drag(mapContainer, {x: 300, y: 100}, {x: 400, y: 200});

        expect(lnk.coord()).to.deep.equal([
            [80.630968502, 17.715947679, 0],
            [80.632577828, 17.715436676, 0]
        ]);
    });
});
