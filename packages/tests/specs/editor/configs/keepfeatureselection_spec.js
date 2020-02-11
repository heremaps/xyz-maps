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
import dataset from './keepfeatureselection_spec.json';

describe('set keepFeatureSelection', function() {
    const expect = chai.expect;

    let editor;
    let display;
    let preparedData;
    let mapContainer;

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
        mapContainer = display.getContainer();
    });

    after(async function() {
        editor.destroy();
        display.destroy();
    });

    it('set keepFeatureSelection to false, validate if feature is selected', async function() {
        editor.destroy();
        editor = new Editor(display, {
            layers: preparedData.getLayers(),
            keepFeatureSelection: false
        });

        await editorTests.waitForEditorReady(editor, ()=>{
            display.setCenter({longitude: 77.84172527566523, latitude: 17.450976000022266});
            display.setZoomlevel(19);
        });

        let l1 = new features.Navlink([{x: 100, y: 300}, {x: 400, y: 300}], {featureClass: 'NAVLINK'});
        let l2 = new features.Navlink([{x: 100, y: 300}, {x: 100, y: 100}], {featureClass: 'NAVLINK'});
        let links = editor.addFeature([l1, l2]);

        links[1].select();
        expect(links[1].editState('selected')).to.be.true;

        // click on ground to unselect link
        await testUtils.events.click(mapContainer, 150, 200);

        expect(links[1].editState('selected')).to.be.false;

        // select link
        links[1].select();

        await editorTests.waitForEditorReady(editor, ()=>{
            // set map center to unselect link
            display.setCenter({longitude: 77.84172527566523, latitude: 17.450976000022266});
        });

        expect(links[1].editState('selected')).to.be.false;
    });

    it('set keepFeatureSelection to true, validate if feature is selected', async function() {
        editor.destroy();
        editor = new Editor(display, {
            layers: preparedData.getLayers(),
            keepFeatureSelection: true
        });

        await editorTests.waitForEditorReady(editor, ()=>{
            display.setCenter({longitude: 77.84172527566523, latitude: 17.450976000022266});
            display.setZoomlevel(19);
        });

        let l1 = new features.Navlink([{x: 100, y: 300}, {x: 400, y: 300}], {featureClass: 'NAVLINK'});
        let l2 = new features.Navlink([{x: 100, y: 300}, {x: 100, y: 100}], {featureClass: 'NAVLINK'});
        let links = editor.addFeature([l1, l2]);

        links[1].select();

        expect(links[1].editState('selected')).to.be.true;

        // clik on ground
        await testUtils.events.click(mapContainer, 150, 200);

        // validate link is still selected
        expect(links[1].editState('selected')).to.be.true;

        await editorTests.waitForEditorReady(editor, ()=>{
            // set map center
            display.setCenter({longitude: 77.84172527566523, latitude: 17.450976000022266});
        });

        // validate link is still selected
        expect(links[1].editState('selected')).to.be.true;
    });

    it('reset keepFeatureSelection to default, validate if feature is selected', async function() {
        editor.destroy();
        editor = new Editor(display, {
            layers: preparedData.getLayers(),
            keepFeatureSelection: 'viewportChange'
        });

        await editorTests.waitForEditorReady(editor, ()=>{
            display.setCenter({longitude: 77.84172527566523, latitude: 17.450976000022266});
            display.setZoomlevel(19);
        });

        let l1 = new features.Navlink([{x: 100, y: 300}, {x: 400, y: 300}], {featureClass: 'NAVLINK'});
        let l2 = new features.Navlink([{x: 100, y: 300}, {x: 100, y: 100}], {featureClass: 'NAVLINK'});
        let links = editor.addFeature([l1, l2]);

        links[1].select();
        expect(links[1].editState('selected')).to.be.true;

        // click on ground
        await testUtils.events.click(mapContainer, 150, 200);

        // validate link is not selected
        expect(links[1].editState('selected')).to.be.false;

        links[1].select();

        await editorTests.waitForEditorReady(editor, ()=>{
            // set map center
            display.setCenter({longitude: 77.84172527566523, latitude: 17.450976000022266});
        });

        // validate link is still selected
        expect(links[1].editState('selected')).to.be.true;
    });
});
