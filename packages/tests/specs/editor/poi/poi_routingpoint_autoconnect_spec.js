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
import dataset from './poi_routingpoint_autoconnect_spec.json';

describe('POI routing point auto reconnect', function() {
    const expect = chai.expect;

    let editor;
    let display;
    let preparedData;
    let mapContainer;
    let objs;

    before(async function() {
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 78.35537822414972, latitude: 17.31379770143876},
            zoomLevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });

        await editorTests.waitForEditorReady(editor);
        mapContainer = display.getContainer();
    });

    after(async function() {
        editor.destroy();
        display.destroy();
        await preparedData.clear();
    });

    it('zoom in to 19 and add a POI object and create routing point, validate the poi connects to a link', async function() {
        await editorTests.waitForEditorReady(editor, ()=>{
            display.setZoomlevel(19);
        });

        let l = new features.Navlink([{x: 100, y: 100}, {x: 120, y: 400}], {featureClass: 'NAVLINK'});
        let p = new features.Place({x: 400, y: 300}, {featureClass: 'PLACE'});
        objs = editor.addFeature([l, p]);

        objs[1].createRoutingPoint();

        expect(objs[1].prop('routingPoint')).to.deep.equal([78.35461, 17.31375, 0]);
        expect(objs[1].prop('routingLink')).to.equal(objs[0].id);
    });

    it('drag map and zoom out, validate the poi always connects to the link', async function() {
        await editorTests.waitForEditorReady(editor, async ()=>{
            await testUtils.events.drag(mapContainer, {x: 300, y: 200}, {x: 250, y: 200});
        });

        expect(objs[1].prop('routingPoint')).to.deep.equal([78.35461, 17.31375, 0]);
        expect(objs[1].prop('routingLink')).to.equal(objs[0].id);

        await editorTests.waitForEditorReady(editor, ()=>{
            display.setZoomlevel(18);
        });

        expect(objs[1].prop('routingPoint')).to.deep.equal([78.35461, 17.31375, 0]);
        expect(objs[1].prop('routingLink')).to.equal(objs[0].id);
    });
});
