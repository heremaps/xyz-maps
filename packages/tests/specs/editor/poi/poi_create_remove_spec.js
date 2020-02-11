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
import dataset from './poi_create_remove_spec.json';

describe('add POI object and then remove', function() {
    const expect = chai.expect;

    var editor;
    var display;
    var preparedData;
    var idMaps = [];
    var link1; var poi1;
    var link2; var poi2;
    var linkLayer;
    var placeLayer;

    before(async function() {
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 77.2357240158081, latitude: 13.005706927303237},
            zoomLevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });
        await editorTests.waitForEditorReady(editor);
        linkLayer = preparedData.getLayers('linkLayer');
        placeLayer = preparedData.getLayers('placeLayer');
    });

    after(async function() {
        await editorTests.clean(editor, idMaps);
        editor.destroy();
        display.destroy();
        await preparedData.clear();
    });

    it('add link and poi object and validate coord and attributes', function() {
        let p = new features.Place({x: 100, y: 250}, {featureClass: 'PLACE', type: 'hotel'});
        let l = new features.Navlink([{x: 100, y: 100}, {x: 200, y: 300}], {featureClass: 'NAVLINK'});
        link1 = editor.addFeature(l, linkLayer);
        poi1 = editor.addFeature(p, placeLayer);

        expect(link1.coord()).to.deep.equal([[77.23411469, 13.006752287, 0], [77.234651132, 13.005706927, 0]]);
        expect(poi1.coord()).to.deep.equal([77.23411469, 13.005968268, 0]);

        expect(poi1.getLink()).to.equal(null);
        expect(poi1.prop('type')).to.equal('hotel');
    });

    it('add more link and poi object and validate again coord and attributes', function() {
        let p = new features.Place({x: 200, y: 250}, {routingLink: 0, featureClass: 'PLACE', type: 'hospital'});
        let l = new features.Navlink(0, [{x: 200, y: 100}, {x: 300, y: 300}], {featureClass: 'NAVLINK'});

        let obj = editor.addFeature([l, p], linkLayer, {x: 50, y: 0});
        link2 = obj[0];
        poi2 = obj[1];

        expect(link2.coord()).to.deep.equal([[77.234919352, 13.006752287, 0], [77.235455794, 13.005706927, 0]]);
        expect(poi2.coord()).to.deep.equal([77.234919352, 13.005968268, 0]);

        expect(poi2.getLink().id).to.equal(link2.id);
        expect(poi2.prop('type')).to.equal('hospital');
    });

    it('add a POI for restaurant, validate its type', function() {
        let p = new features.Place({x: 300, y: 250}, {featureClass: 'PLACE', type: 'restaurant'});
        let poi = editor.addFeature(p);

        expect(poi.prop('type')).to.equal('restaurant');
    });

    it('submit created objects and validate again', async function() {
        let idMap;

        await editorTests.waitForEditorReady(editor, async ()=>{
            idMap = await editorTests.submit(editor);
            idMaps.push(idMap);
        });

        let poi1Id = idMap.permanentIDMap[poi1.getProvider().id][poi1.id];
        let link1Id = idMap.permanentIDMap[link1.getProvider().id][link1.id];

        let poi2Id = idMap.permanentIDMap[poi2.getProvider().id][poi2.id];
        let link2Id = idMap.permanentIDMap[link2.getProvider().id][link2.id];

        poi1 = editor.getFeature(poi1Id, placeLayer);
        link1 = editor.getFeature(link1Id, linkLayer);

        poi2 = editor.getFeature(poi2Id, linkLayer);
        link2 = editor.getFeature(link2Id, linkLayer);

        expect(poi1.getLink()).to.equal(null);
        expect(poi2.getLink().id).to.equal(link2.id);
    });


    it('set navigation point for POI', function() {
        poi1.createRoutingPoint();

        expect(poi1.getLink().id).to.equal(link1.id);
    });

    it('remove navigation point for POI', function() {
        poi1.removeRoutingPoint();

        expect(poi1.getLink()).to.equal(null);
    });


    it('remove  POI', function() {
        poi1.remove();
        expect(poi1.prop('removed')).to.be.equal('HOOK');
        expect(poi1.prop('estate')).to.be.equal('REMOVED');
    });
});
