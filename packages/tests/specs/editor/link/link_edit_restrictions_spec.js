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
import dataset from './link_edit_restrictions_spec.json';

describe('link edit restrictions', function() {
    const expect = chai.expect;

    let link1; let link2; let links;
    let editor;
    let display;
    let preparedData;
    let mapContainer;

    before(async function() {
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 77.25004908649441, latitude: 13.107718606505642},
            zoomLevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });

        await editorTests.waitForEditorReady(editor);
        mapContainer = display.getContainer();

        link1 = preparedData.getFeature('linkLayer', -189068);
        link2 = preparedData.getFeature('linkLayer', -189069);
    });

    after(async function() {
        editor.destroy();
        display.destroy();
        await preparedData.clear();
    });

    it('click on a link, drag shape and validate', async function() {
        await testUtils.events.click(mapContainer, 100, 200);

        await testUtils.events.drag(mapContainer, {x: 100, y: 200}, {x: 100, y: 300});

        expect(link1.coord()).to.deep.equal([
            [77.250049086, 13.108241071, 0],
            [77.249512645, 13.108241071, 0],
            [77.248439761, 13.107718607, 0],
            [77.248439761, 13.108763534, 0]
        ]);
    });

    it('select a link and drag the shape point', async function() {
        link2.select();
        await testUtils.events.drag(mapContainer, {x: 300, y: 100}, {x: 400, y: 100});

        expect(link2.coord()).to.deep.equal([
            [77.250049087, 13.108763534, 0],
            [77.248439761, 13.108763534, 0]
        ]);
    });

    it('re-initialize editor and editrestrictions return true, select a link and drag, validate link again', async function() {
        editor.destroy();
        display.destroy();
        await preparedData.clear();

        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 77.25004908649441, latitude: 13.107718606505642},
            zoomLevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers(),
            editRestrictions: function() {
                return true;
            }
        });

        await editorTests.waitForEditorReady(editor);

        let l1 = new features.Navlink([{x: 400, y: 200}, {x: 300, y: 200}, {x: 100, y: 200}, {x: 100, y: 100}], {featureClass: 'NAVLINK', protected: 35});
        let l2 = new features.Navlink([{x: 300, y: 100}, {x: 100, y: 100}], {featureClass: 'NAVLINK'});

        links = editor.addFeature([l1, l2]);

        links[0].select();

        await testUtils.events.drag(mapContainer, {x: 300, y: 200}, {x: 300, y: 300});

        expect(links[0].coord()).to.deep.equal([
            [77.250049086, 13.108241071, 0],
            [77.249512645, 13.108241071, 0],
            [77.248439761, 13.108241071, 0],
            [77.248439761, 13.108763534, 0]
        ]);
    });

    it('link is not removed sucessfully', async function() {
        let objs = editor.search(display.getViewBounds());
        expect(objs).to.have.lengthOf(4);


        links[1].remove();

        objs = editor.search(display.getViewBounds());
        expect(objs).to.have.lengthOf(4);
    });

    it('select a link and drag, validate link again', async function() {
        links[1].select();

        await testUtils.events.drag(mapContainer, {x: 300, y: 100}, {x: 450, y: 150});

        expect(links[1].coord()).to.deep.equal([
            [77.249512645, 13.108763534, 0],
            [77.248439761, 13.108763534, 0]
        ]);
    });

    it('re-initialize editor again, editrestrictions return false, select a link and drag, validate link again', async function() {
        editor.destroy();
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });

        await editorTests.waitForEditorReady(editor, ()=>{
            display.setCenter({longitude: 77.25004908649441, latitude: 13.107718606505642});
            display.setZoomlevel(18);
        });

        let l1 = new features.Navlink([{x: 400, y: 200}, {x: 300, y: 200}, {x: 100, y: 200}, {x: 100, y: 100}], {featureClass: 'NAVLINK', protected: 35});
        let l2 = new features.Navlink([{x: 300, y: 100}, {x: 100, y: 100}], {featureClass: 'NAVLINK'});
        links = editor.addFeature([l1, l2]);

        links[0].select();

        await testUtils.events.drag(mapContainer, {x: 400, y: 200}, {x: 400, y: 300});

        expect(links[0].coord()).to.deep.equal([
            [77.250049086, 13.107718607, 0],
            [77.249512645, 13.108241071, 0],
            [77.248439761, 13.108241071, 0],
            [77.248439761, 13.108763534, 0]
        ]);
    });
});
