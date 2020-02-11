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
import dataset from './poi_setcoordinates_spec.json';

describe('set POI coordinates', function() {
    const expect = chai.expect;

    var editor;
    var display;
    var preparedData;

    var preparedFeatures;
    var poi;
    var poiLayer;

    before(async function() {
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 77.283773, latitude: 13.1006019},
            zoomLevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });

        await editorTests.waitForEditorReady(editor);
        poiLayer = preparedData.getLayers('placeLayer');

        poi = preparedData.getFeature('placeLayer', -29537);
    });

    after(async function() {
        editor.destroy();
        display.destroy();
        await preparedData.clear();
    });

    it('validate POI coordinate, set coordinate by geocoordinate and validate again', function() {
        expect(poi.coord()).to.deep.equal([77.282700116, 13.1006019, 0]);

        poi.coord([77.282701, 13.1006119, 0]);
        expect(poi.coord()).to.deep.equal([77.282701, 13.1006119, 0]);
    });

    it('remove POI layer and validate objects in viewport', async function() {
        editor.removeLayer(poiLayer);

        let objs = editor.search({rect: display.getViewBounds(), layers: [poiLayer]});
        expect(objs).to.have.lengthOf(1);

        let objs1 = editor.search({rect: display.getViewBounds()});
        expect(objs1).to.have.lengthOf(2);
    });
});
