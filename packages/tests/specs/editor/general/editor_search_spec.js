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
import {Editor} from '@here/xyz-maps-editor';
import dataset from './editor_search_spec.json';

describe('editor search function', function() {
    const expect = chai.expect;

    var preparedData;
    var editor;
    var display;

    var link1;
    var link2;

    var linkLayer;
    var paLayer;
    var placeLayer;
    var buildingLayer;

    before(async function() {
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 76.904889, latitude: 16.410735},
            zoomLevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });

        await editorTests.waitForEditorReady(editor);

        link1 = preparedData.getFeature('linkLayer', 'link1');
        link2 = preparedData.getFeature('linkLayer', 'link2');

        linkLayer = preparedData.getLayers('linkLayer');
        paLayer = preparedData.getLayers('paLayer');
        placeLayer = preparedData.getLayers('placeLayer');
        buildingLayer = preparedData.getLayers('buildingLayer');
    });


    after(async function() {
        editor.destroy();
        display.destroy();

        await preparedData.clear();
    });


    it('search with id', function() {
        let objs = editor.search({id: link1.id, layers: [linkLayer]});

        expect(objs).to.have.lengthOf(1);
    });

    it('search with ids', function() {
        let objs = editor.search({ids: [link1.id, link2.id], layers: [linkLayer]});

        expect(objs).to.have.lengthOf(2);
    });

    it('search with point', function() {
        let objs = editor.search({point: {longitude: 76.904889, latitude: 16.410735}, radius: 50});
        expect(objs).to.have.lengthOf(3);

        objs = editor.search({point: {longitude: 76.904889, latitude: 16.410735}, radius: 50, layers: [placeLayer]});
        expect(objs).to.have.lengthOf(3);


        objs = editor.search({point: {longitude: 76.904889, latitude: 16.410735}, radius: 50, layers: [buildingLayer, linkLayer, paLayer]});
        expect(objs).to.have.lengthOf(0);
    });

    it('search with rect', function() {
        let objs = editor.search({rect: {minLon: 76.904027, minLat: 16.410843, maxLon: 76.906172, maxLat: 16.412387}});
        expect(objs).to.have.lengthOf(3);

        objs = editor.search({rect: {minLon: 76.904027, minLat: 16.410843, maxLon: 76.906172, maxLat: 16.412387}, layers: [placeLayer]});
        expect(objs).to.have.lengthOf(2);

        objs = editor.search({rect: {minLon: 76.904027, minLat: 16.410843, maxLon: 76.906172, maxLat: 16.412387}, layers: [linkLayer]});
        expect(objs).to.have.lengthOf(1);


        objs = editor.search({rect: {minLon: 76.904027, minLat: 16.410843, maxLon: 76.906172, maxLat: 16.412387}, layers: [buildingLayer, paLayer]});
        expect(objs).to.have.lengthOf(0);
    });
});
