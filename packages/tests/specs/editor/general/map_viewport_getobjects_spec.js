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
import {Editor} from '@here/xyz-maps-editor';
import dataset from './map_viewport_getobjects_spec.json';

describe('map viewport getobjects', function() {
    const expect = chai.expect;

    var editor;
    var display;
    var preparedData;

    var poi1;
    var poiLayer;

    before(async function() {
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 77.20057, latitude: 13.143919},
            zoomLevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });

        await editorTests.waitForEditorReady(editor);

        poiLayer = preparedData.getLayers('placeLayer');

        poi1 = preparedData.getFeature('placeLayer', -29498);
    });

    after(async function() {
        editor.destroy();
        display.destroy();
        await preparedData.clear();
    });

    it('validate objects in viewport', function() {
        let obj = editor.search(display.getViewBounds());

        expect(obj).to.have.lengthOf(3);
    });


    it('validate POI objects in viewport', function() {
        let obj = editor.search({rect: display.getViewBounds(), layers: [poiLayer]});
        expect(obj).to.have.lengthOf(2);
    });

    it('get a poi object and add its navigation point', function() {
        poi1.createRoutingPoint();
    });


    it('validate POI objects in boundingbox of the viewport', function() {
        let objs = editor.search({
            rect: {minLon: 77.19860754268157, minLat: 13.143048347212835, maxLon: 77.19968042628752, maxLat: 13.143831930849458},
            layers: [poiLayer]
        });

        expect(objs).to.have.lengthOf(1);
    });


    it('select a poi, validate POI objects in boundingbox of the viewport again', async function() {
        poi1.select();
        let mapContainer = display.getContainer();
        await testUtils.events.drag(mapContainer, {x: 150, y: 100}, {x: 180, y: 100});

        let obj = editor.search({
            rect: {minLon: 77.19860754268157, minLat: 13.143048347212835, maxLon: 77.19968042628752, maxLat: 13.143831930849458},
            layers: [poiLayer]
        });

        expect(obj).to.have.lengthOf(1);

        poi1.unselect();
    });
});
