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
import dataset from './area_create_remove_spec.json';

describe('add Area object and then remove', function() {
    const expect = chai.expect;

    var editor;
    var display;

    let preparedData;
    let area;
    let areaLayer;
    let idMap;

    before(async function() {
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 77.02831, latitude: 12.9356},
            zoomLevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });

        await editorTests.waitForEditorReady(editor);

        areaLayer = preparedData.getLayers('buildingLayer');

        // validate no area objects in viewport
        let objs = editor.search({rect: display.getViewBounds(), layers: [areaLayer]});
        expect(objs).to.have.lengthOf(0);
    });

    after(async function() {
        editor.destroy();
        display.destroy();
        await preparedData.clear();
    });


    it('add object to map and validate area objects in viewport', async function() {
        let a = new features.Area([[[{x: 200, y: 300}, {x: 200, y: 500}, {x: 400, y: 300}, {x: 200, y: 300}]]], {featureClass: 'AREA'});
        area = editor.addFeature(a);

        // validate there is one area object in viewport
        let objs = editor.search({rect: display.getViewBounds(), layers: [areaLayer]});
        expect(objs).to.have.lengthOf(1);

        await editorTests.waitForEditorReady(editor, async ()=>{
            idMap = await editorTests.submit(editor);
        });

        // validate there is one area object in viewport
        objs = editor.search({rect: display.getViewBounds(), layers: [areaLayer]});
        expect(objs).to.have.lengthOf(1);
    });

    it('get area and remove it, validate area objects in viewport again', async function() {
        // remove created area object
        let areaId = idMap.permanentIDMap[area.getProvider().id][area.id];
        area = editor.getFeature(areaId, areaLayer);
        area.remove();
        expect(area.prop('removed')).to.be.equal('HOOK');
        expect(area.prop('estate')).to.be.equal('REMOVED');

        // validate there is no area object in viewport
        let objs = editor.search({rect: display.getViewBounds(), layers: [areaLayer]});
        expect(objs).to.have.lengthOf(0);

        await editorTests.waitForEditorReady(editor, async ()=>{
            await editorTests.submit(editor);
        });

        // validate there is no area object in viewport
        objs = editor.search({rect: display.getViewBounds(), layers: [areaLayer]});
        expect(objs).to.have.lengthOf(0);
    });
});
