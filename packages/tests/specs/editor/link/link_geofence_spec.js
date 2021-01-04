/*
 * Copyright (C) 2019-2021 HERE Europe B.V.
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
        chai.use(chaiAlmost());
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 80.63257782733888, latitude: 17.71492567213454},
            zoomlevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });

        await waitForEditorReady(editor);
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
        await drag(mapContainer, {x: 300, y: 100}, {x: 400, y: 200});

        expect(link.coord()).to.deep.almost([
            [80.630968502, 17.715947679, 0],
            [80.632577828, 17.715436676, 0]
        ]);
    });

    xit('undo and set geofence', async function() {
        // dragging link shape point should be restricted when geofence is set.
        editor.undo();

        let lnk = editor.getFeature(link.id, linkLayer);
        lnk.select();
        lnk.setGeoFence(5);

        await drag(mapContainer, {x: 300, y: 100}, {x: 400, y: 200});

        expect(lnk.coord()).to.deep.almost([
            [80.630968502, 17.715947679, 0],
            [80.632577828, 17.715436676, 0]
        ]);
    });


    it('undo and remove geofence, validate again', async function() {
        editor.undo();

        let lnk = editor.getFeature(link.id, linkLayer);
        lnk.select();
        lnk.setGeoFence(false);

        await drag(mapContainer, {x: 300, y: 100}, {x: 400, y: 200});

        expect(lnk.coord()).to.deep.almost([
            [80.630968502, 17.715947679, 0],
            [80.632577828, 17.715436676, 0]
        ]);
    });
});
