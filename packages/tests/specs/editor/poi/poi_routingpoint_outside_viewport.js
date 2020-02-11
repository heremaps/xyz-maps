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
import dataset from './poi_routingpoint_outside_viewport.json';

describe('poi connects to a link which is outside of viewport', function() {
    const expect = chai.expect;

    var editor;
    var display;
    var preparedData;
    var link1; var poi1; var poi2;
    var linkLayer;

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
        linkLayer = preparedData.getLayers('linkLayer');

        link1 = preparedData.getFeature('linkLayer', -189174);
        poi1 = preparedData.getFeature('placeLayer', -29534);
    });

    after(async function() {
        editor.destroy();
        display.destroy();
        await preparedData.clear();
    });

    it('validate routing point is undefined and validate again after creating the routingPoint', function() {
        expect(poi1.prop().routingPoint).to.equal(undefined);

        poi1.createRoutingPoint();
        expect(poi1.prop().routingPoint).to.deep.equal([78.35334, 17.31482, 0]);
        expect(poi1.getLink().id).to.equal(link1.id);
    });

    it('get link objects in viewport and validate', function() {
        let objs = editor.search({rect: display.getViewBounds(), layers: [linkLayer]});

        expect(objs).to.have.lengthOf(1);
    });

    it('move map to a new area and validate link is not in viewport, poi connects still connects the link', async function() {
        await editorTests.waitForEditorReady(editor, ()=>{
            display.setCenter({longitude: 78.35594148804284, latitude: 17.31247638794072});
        });

        let objs = editor.search({rect: display.getViewBounds(), layers: [linkLayer]});
        expect(objs).to.have.lengthOf(0);

        expect(poi1.getLink().id).to.equal(link1.id);
    });

    it('move map to a new area and validate links are in viewport, poi connects still connects the link ', async function() {
        await editorTests.waitForEditorReady(editor, ()=>{
            display.setCenter({longitude: 78.35442872215845, latitude: 17.314192045099656});
        });

        let objs = editor.search({rect: display.getViewBounds(), layers: [linkLayer]});
        expect(objs).to.have.lengthOf(2);

        expect(poi1.getLink().id).to.equal(link1.id);
    });


    it('move map to a new area where no link is visible in viewport, but there is one found in viewbound search', async function() {
        await editorTests.waitForEditorReady(editor, ()=>{
            display.setCenter({longitude: 78.35573764015771, latitude: 17.313439206467375});
        });

        let objs = editor.search({rect: display.getViewBounds(), layers: [linkLayer]});
        expect(objs).to.have.lengthOf(1);
    });

    it('add a POI and create its routingPoint, validate poi connects to a link', async function() {
        let p = new features.Place({x: 400, y: 300}, {featureClass: 'PLACE'});
        poi2 = editor.addFeature(p);
        poi2.createRoutingPoint();

        expect(poi2.prop('routingPoint')).to.deep.equal([78.35377, 17.31523, 0]);
    });

    it('move map to a new area where no link in viewport, validate poi still connects to a link', async function() {
        await editorTests.waitForEditorReady(editor, ()=>{
            display.setCenter({longitude: 78.35578055550195, latitude: 17.312558330139318});
        });

        let objs = editor.search({rect: display.getViewBounds(), layers: [linkLayer]});
        expect(objs).to.have.lengthOf(0);

        expect(poi2.prop('routingPoint')).to.deep.equal([78.35377, 17.31523, 0]);
    });


    it('add a POI and create its routingPoint, validate poi connects to a link', async function() {
        let p = new features.Place({x: 400, y: 300}, {featureClass: 'PLACE'});
        let poi3 = editor.addFeature(p);
        poi3.createRoutingPoint();

        expect(poi2.prop('routingPoint')).to.deep.equal([78.35377, 17.31523, 0]);
    });
});
