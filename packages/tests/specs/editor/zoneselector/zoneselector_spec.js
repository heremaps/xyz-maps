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
import {editorTests, displayTests, testUtils, prepare} from 'hereTest';
import {Map} from '@here/xyz-maps-core';
import {features, Editor} from '@here/xyz-maps-editor';
import dataset from './zoneselector_spec.json';

describe('zone selector drag', function() {
    const expect = chai.expect;

    let editor;
    let display;
    let preparedData;
    let mapContainer;
    let results1; let results2;

    let link1; let link2; let link3;

    before(async function() {
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: -105.145534, latitude: 35.374829},
            zoomLevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });

        await editorTests.waitForEditorReady(editor);
        mapContainer = display.getContainer();

        link1 = preparedData.getFeature('linkLayer', '-189231');
        link2 = preparedData.getFeature('linkLayer', '-189232');
        link3 = preparedData.getFeature('linkLayer', '-189233');
    });

    after(async function() {
        editor.destroy();
        display.destroy();
        await preparedData.clear();
    });

    it('add links to zoneselector, show and validate zoneselector info ', function() {
        editor.getZoneSelector().add(link1, link2);

        editor.getZoneSelector().show({
            from: 0.1,
            to: 0.4,
            side: 'B',
            style: {stroke: 'blue'},
            onChange: function(e) {
                results1 = e;
            }
        }, {
            from: 0.5,
            to: 0.8,
            side: 'B',
            onChange: function(e) {
                results2 = e;
            }
        });

        let info = editor.getZoneSelector().info();
        expect(info[0]).to.deep.include({
            from: 0.1,
            to: 0.4,
            side: 'B'
        });
        expect(info[0].style).to.deep.equal({stroke: 'blue'});
        expect(info[0].segments[0]).to.deep.include({
            from: 0,
            reversed: false,
            to: 0.16375143398281522
        });
        expect(info[0].segments[0].Link).to.deep.include({id: link2.id});
        expect(info[0].segments[1]).to.deep.include({
            from: 0.35396979551181995,
            reversed: false,
            to: 1
        });
        expect(info[0].segments[1].Link).to.deep.include({id: link1.id});


        expect(info[1]).to.deep.include({
            from: 0.5,
            side: 'B',
            to: 0.8
        });
        expect(info[1].segments[0]).to.deep.include({
            from: 0.30312619498806787,
            reversed: false,
            to: 0.7212504779966603
        });
        expect(info[1].segments[0].Link).to.deep.include({id: link2.id});
    });

    it('drag zone selector and validate again', async function() {
        await testUtils.events.drag(mapContainer, {x: 350, y: 217}, {x: 350, y: 250});

        expect(results2[0]).to.deep.include({
            from: 0.44694291493948723, to: 0.7212504779966603,
            reversed: false
        });

        expect(results2[0].Link).to.deep.include({
            id: link2.id
        });

        let info = editor.getZoneSelector().info();
        expect(info[0]).to.deep.include({
            from: 0.1,
            to: 0.4,
            side: 'B'
        });
        expect(info[0].style).to.deep.equal({stroke: 'blue'});
        expect(info[0].segments[0]).to.deep.include({
            from: 0,
            reversed: false,
            to: 0.16375143398281522
        });
        expect(info[0].segments[0].Link).to.deep.include({id: link2.id});
        expect(info[0].segments[1]).to.deep.include({
            from: 0.35396979551181995,
            reversed: false,
            to: 1
        });
        expect(info[0].segments[1].Link).to.deep.include({id: link1.id});


        expect(info[1]).to.deep.include({
            from: 0.5,
            side: 'B',
            to: 0.8
        });
        expect(info[1].segments[0]).to.deep.include({
            from: 0.44694291493948723,
            to: 0.7212504779966603,
            reversed: false
        });
        expect(info[1].segments[0].Link).to.deep.include({id: link2.id});
    });


    it('hide zoneselector, drag the map to validate the zone selector is deactivated, validate map is dragged', async function() {
        editor.getZoneSelector().hide();

        await editorTests.waitForEditorReady(editor, async ()=>{
            await testUtils.events.drag(mapContainer, {x: 350, y: 185}, {x: 360, y: 250});
        });

        expect(display.getCenter().longitude).to.not.equal(-105.145534);
    });

    it('move map to a new area and validate a link can be dragged', async function() {
        await editorTests.waitForEditorReady(editor, ()=>{
            display.setCenter({longitude: -105.14442356546784, latitude: 35.37463216746484});
        });

        link3.select();

        await testUtils.events.drag(mapContainer, {x: 451, y: 205}, {x: 501, y: 205});

        expect(link3.coord()).to.deep.equal([
            [-105.1444, 35.37458, 0],
            [-105.143881779, 35.37504, 0]
        ]);
    });
});
