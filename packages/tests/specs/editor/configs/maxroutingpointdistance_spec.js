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
import {editorTests, prepare} from 'hereTest';
import {Map} from '@here/xyz-maps-core';
import {features, Editor} from '@here/xyz-maps-editor';
import dataset from './maxroutingpointdistance_spec.json';

describe('set maxRoutingPointDistance', function() {
    const expect = chai.expect;

    let editor;
    let display;
    let preparedData;

    before(async function() {
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 77.84172527566523, latitude: 17.450976000022266},
            zoomLevel: 19,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });

        await editorTests.waitForEditorReady(editor);
    });

    after(async function() {
        editor.destroy();
        display.destroy();
    });


    it('set maxRoutingPointDistance, validate if a PA is created', async function() {
        editor.destroy();
        editor = editor = new Editor(display, {
            layers: preparedData.getLayers(),
            maxRoutingPointDistance: 10
        });

        await editorTests.waitForEditorReady(editor, ()=>{
            display.setCenter({longitude: 77.84172527566523, latitude: 17.450976000022266});
            display.setZoomlevel(19);
        });


        let l1 = new features.Navlink([{x: 100, y: 300}, {x: 400, y: 300}], {featureClass: 'NAVLINK'});
        let addr1 = new features.Address({x: 300, y: 250}, {featureClass: 'ADDRESS'});
        let addr2 = new features.Address({x: 300, y: 270}, {featureClass: 'ADDRESS'});

        editor.addFeature(l1);
        let pa = editor.addFeature(addr1);

        // validate address is not created
        expect(pa).to.equal(undefined);
        expect(editor.info()).to.have.lengthOf(1);

        editor.addFeature(addr2);
        expect(editor.info()).to.have.lengthOf(2);
    });

    it('reset maxRoutingPointDistance, validate if a PA is created', async function() {
        editor.destroy();
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });


        await editorTests.waitForEditorReady(editor, ()=>{
            display.setCenter({longitude: 77.84172527566523, latitude: 17.450976000022266});
            display.setZoomlevel(19);
        });


        let l1 = new features.Navlink([{x: 100, y: 300}, {x: 400, y: 300}], {featureClass: 'NAVLINK'});
        let addr1 = new features.Address({x: 300, y: 250}, {featureClass: 'ADDRESS'});
        let addr2 = new features.Address({x: 300, y: 270}, {featureClass: 'ADDRESS'});

        editor.addFeature(l1);
        editor.addFeature(addr1);
        expect(editor.info()).to.have.lengthOf(2);

        editor.addFeature(addr2);
        expect(editor.info()).to.have.lengthOf(3);
    });
});
