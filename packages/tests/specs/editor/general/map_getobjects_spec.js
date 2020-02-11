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
import dataset from './map_getobjects_spec.json';

describe('map getobjects', function() {
    const expect = chai.expect;

    var editor;
    var display;

    var preparedData;
    var linkLayer;
    var placeLayer;
    var addressLayer;

    before(async function() {
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 77.435113, latitude: 15.653134},
            zoomLevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });

        await editorTests.waitForEditorReady(editor);

        linkLayer = preparedData.getLayers('linkLayer');
        placeLayer = preparedData.getLayers('placeLayer');
        addressLayer = preparedData.getLayers('paLayer');
    });

    after(async function() {
        editor.destroy();
        display.destroy();
        await preparedData.clear();
    });


    it('validate viewport coordinates', function() {
        expect(display.getCenter()).to.deep.equal({longitude: 77.435113, latitude: 15.653134});
    });


    it('validate links in viewport', function() {
        let objs = editor.search(display.getViewBounds());

        expect(objs).to.have.lengthOf(6);
    });

    it('validate links in viewport with boundingbox', function() {
        let objs = editor.search({rect: {minLon: 77.43435955529584, minLat: 15.652189542987028, maxLon: 77.4354324389018, maxLat: 15.652964365088488}, layers: [linkLayer]});

        expect(objs).to.have.lengthOf(1);
    });

    it('validate links and PAs in viewport', function() {
        let objs = editor.search({rect: display.getViewBounds()});

        expect(objs).to.have.lengthOf(6);
    });


    it('validate links and POIs in viewport with boundingbox', function() {
        let objs = editor.search({rect: {minLon: 77.43435955529584, minLat: 15.652189542987028, maxLon: 77.4354324389018, maxLat: 15.652964365088488}, layers: [placeLayer, linkLayer]});

        expect(objs).to.have.lengthOf(2);
    });

    it('validate PAs in viewport', function() {
        let objs = editor.search({rect: display.getViewBounds(), layers: [addressLayer]});

        expect(objs).to.have.lengthOf(2);
    });

    it('validate links in viewport', function() {
        let objs = editor.search({rect: display.getViewBounds(), layers: [linkLayer]});

        expect(objs).to.have.lengthOf(2);
    });

    it('validate PAs in viewport with boundingbox', function() {
        let objs = editor.search({rect: {minLon: 77.43482481562621, minLat: 15.652383991839185, maxLon: 77.43592788044107, maxLat: 15.653180609603492}, layers: [addressLayer]});

        expect(objs).to.have.lengthOf(1);
    });


    it('validate links in viewport with boundingbox', function() {
        let objs = editor.search({rect: {minLon: 77.43482481562621, minLat: 15.652383991839185, maxLon: 77.43592788044107, maxLat: 15.653180609603492}, layers: [linkLayer]});

        expect(objs).to.have.lengthOf(1);
    });


    it('validate other objects in viewport', async function() {
        let objs = editor.search({rect: display.getViewBounds(), layers: [placeLayer]});
        expect(objs).to.have.lengthOf(2);
    });
});
