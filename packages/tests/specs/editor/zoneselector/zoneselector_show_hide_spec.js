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
import dataset from './zoneselector_show_hide_spec.json';

describe('zone selector show and hide', function() {
    const expect = chai.expect;

    let editor;
    let display;
    let preparedData;
    let mapContainer;
    let link1; let link2; let link4;

    before(async function() {
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: -107.791617, latitude: 37.247926},
            zoomLevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });
        await editorTests.waitForEditorReady(editor);
        mapContainer = display.getContainer();
        link1 = preparedData.getFeature('linkLayer', '-18254');
        link2 = preparedData.getFeature('linkLayer', '-18255');
        link4 = preparedData.getFeature('linkLayer', '-18257');
    });

    after(async function() {
        editor.destroy();
        display.destroy();
        await preparedData.clear();
    });

    it('validate selected zone info after dragging zone selector', async function() {
        editor.getZoneSelector().add(link2);

        let results;
        editor.getZoneSelector().show({
            from: 0.1,
            to: 0.4,
            side: 'B',
            style: {stroke: 'blue'},
            onChange: function(e) {
                results = e;
            }
        });

        await testUtils.events.drag(mapContainer, {x: 120, y: 185}, {x: 120, y: 200});

        expect(results[0]).to.deep.include({
            from: 0.10000000000200623,
            to: 0.5117070589236838,
            reversed: false
        });

        expect(results[0].Link).to.deep.include({
            id: link2.id
        });
    });


    it('hide zoneselector and add another link to zone select, validate selected zone info after dragging', async function() {
        editor.getZoneSelector().hide();

        editor.getZoneSelector().add(link1);

        let results;
        editor.getZoneSelector().show({
            from: 0.1,
            to: 0.7,
            side: 'R',
            style: {stroke: 'blue'},
            onChange: function(e) {
                results = e;
            }
        });

        await testUtils.events.drag(mapContainer, {x: 140, y: 296}, {x: 140, y: 280});

        expect(results[0]).to.deep.include({
            from: 0.09999999998970112,
            to: 0.44124056157397223,
            reversed: false
        });

        expect(results[0].Link).to.deep.include({
            id: link1.id
        });
    });

    it('hide zoneselector and drag a link, validate the selected zone info', async function() {
        editor.getZoneSelector().hide();

        link4.select();

        await testUtils.events.drag(mapContainer, {x: 423, y: 276}, {x: 400, y: 276});

        expect(editor.info()).to.have.lengthOf(1);
    });
});
