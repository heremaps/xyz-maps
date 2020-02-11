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
import chaiAlmost from 'chai-almost';
import dataset from './link_autosplit_spec.json';

describe('link auto split', function() {
    const expect = chai.expect;

    let editor;
    let display;
    let preparedData;
    let mapContainer;
    let link1; let link2; let link3; let link4; let link5; let link6; let link7;

    before(async function() {
        chai.use(chaiAlmost());
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 76.97791, latitude: 12.93834},
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

    it('add link object validate 1 link in viewport', async function() {
        let lnk1 = new features.Navlink([{x: 400, y: 200}, {x: 100, y: 200}], {featureClass: 'NAVLINK'});
        link1 = editor.addFeature(lnk1);
        link1.select();

        await testUtils.events.drag(mapContainer, {x: 400, y: 200}, {x: 100, y: 200});

        let objs = editor.search(display.getViewBounds());

        expect(objs).to.have.lengthOf(0);
    });

    it('add another link object and drag one shape point to another to remove one', async function() {
        let lnk2 = new features.Navlink([{x: 100, y: 100}, {x: 150, y: 200}, {x: 200, y: 200}, {x: 500, y: 200}], {featureClass: 'NAVLINK'});

        link2 = editor.addFeature(lnk2);
        link2.select();

        await testUtils.events.drag(mapContainer, {x: 100, y: 100}, {x: 150, y: 200});


        expect(link2.coord()).to.deep.almost([
            [76.976568895, 12.938862822, 0],
            [76.976837116, 12.938862822, 0],
            [76.978446442, 12.938862822, 0]
        ]);

        link2.remove();
    });

    it('add link object and drag shape point to automatically split the link', async function() {
        let lnk3 = new features.Navlink([{x: 100, y: 150}, {x: 150, y: 100}, {x: 200, y: 150}, {x: 250, y: 160}], {featureClass: 'NAVLINK'});
        link3 = editor.addFeature(lnk3);
        link3.select();

        await testUtils.events.drag(mapContainer, {x: 100, y: 150}, {x: 250, y: 160});

        let objs = editor.search(display.getViewBounds());
        expect(objs).to.have.lengthOf(2);

        expect(objs[0].coord()).to.deep.almost([
            [76.976837116, 12.939124232, 0],
            [76.977105337, 12.93907195, 0]
        ]);
        expect(objs[1].coord()).to.deep.almost([
            [76.977105337, 12.93907195, 0],
            [76.976568895, 12.939385643, 0],
            [76.976837116, 12.939124232, 0]
        ]);

        await editorTests.waitForEditorReady(editor, ()=>{
            editor.revert();
        });
    });

    it('add link object', async function() {
        let lnk4 = new features.Navlink([{x: 200, y: 200}, {x: 250, y: 150}, {x: 300, y: 200}], {featureClass: 'NAVLINK'});
        let lnk5 = new features.Navlink([{x: 200, y: 200}, {x: 250, y: 250}, {x: 300, y: 200}], {featureClass: 'NAVLINK'});
        link4 = editor.addFeature(lnk4);
        link5 = editor.addFeature(lnk5);

        link5.select();

        await testUtils.events.drag(mapContainer, {x: 200, y: 200}, {x: 300, y: 200});

        let objs = editor.search(display.getViewBounds());
        expect(objs).to.have.lengthOf(2);
    });


    it('add link object, drag a shape point to connect to the other one and validate new links', async function() {
        let lnk6 = new features.Navlink([{x: 100, y: 100}, {x: 200, y: 100}, {x: 200, y: 200, z: 1}], {featureClass: 'NAVLINK'});
        link6 = editor.addFeature(lnk6);

        expect(link6.getZLevels()).to.deep.equal([0, 0, 1]);
        link6.select();

        await testUtils.events.drag(mapContainer, {x: 100, y: 100}, {x: 200, y: 200});

        expect(link6.coord()).to.deep.almost([
            [76.976837117, 12.938862822, 0],
            [76.976837116, 12.939385643, 0],
            [76.976837116, 12.938862822, 1]
        ]);
    });

    it('add link object, drag a shape point to connect to the other one, validate link is split automatically', async function() {
        let lnk7 = new features.Navlink([{x: 100, y: 300, z: 1}, {x: 200, y: 300}, {x: 200, y: 400, z: 1}], {featureClass: 'NAVLINK'});
        link7 = editor.addFeature(lnk7);

        expect(link7.getZLevels()).to.deep.equal([1, 0, 1]);
        link7.select();

        await testUtils.events.drag(mapContainer, {x: 100, y: 300}, {x: 200, y: 400});

        expect(link7.coord()).to.deep.almost([
            [76.976837116, 12.93834, 0],
            [76.976837116, 12.937817177, 1]
        ]);
    });
});
