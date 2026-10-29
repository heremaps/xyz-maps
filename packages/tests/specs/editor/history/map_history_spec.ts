/*
 * Copyright (C) 2019-2022 HERE Europe B.V.
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
import {prepare} from 'utils';
import {waitForEditorReady} from 'editorUtils';
import {Map} from '@here/xyz-maps-display';
import {Editor} from '@here/xyz-maps-editor';
import dataset from './map_history_spec.json';
import {describe, beforeAll, afterAll, it} from 'vitest';

describe('map history', function() {
    const expect = chai.expect;

    var editor;
    var display;
    var preparedData;

    beforeAll(async function() {
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {latitude: 18.865855, longitude: 73.07682},
            zoomlevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });
        await waitForEditorReady(editor);
    });

    afterAll(async function() {
        editor.destroy();
        display.destroy();
    });

    it('add a poi object and validate', function() {
        var poi1 = {
            type: 'Feature',
            properties: {featureClass: 'PLACE'},
            geometry: {
                type: 'Point',
                coordinates: editor.toGeoJSONCoordinates({x: 100, y: 200})
            }
        };

        editor.addFeature(poi1, preparedData.getLayers('placeLayer'));

        expect(editor.get('history.current')).to.equal(1);
        expect(editor.get('history.length')).to.equal(1);
        expect(editor.get('changes.length')).to.equal(1);
    });

    it('add another poi object and validate', function() {
        var poi2 = {
            type: 'Feature',
            properties: {featureClass: 'PLACE'},
            geometry: {
                type: 'Point',
                coordinates: editor.toGeoJSONCoordinates({x: 200, y: 200})
            }
        };
        editor.addFeature(poi2, preparedData.getLayers('placeLayer'));

        expect(editor.get('history.current')).to.equal(2);
        expect(editor.get('history.length')).to.equal(2);
        expect(editor.get('changes.length')).to.equal(2);
    });

    it('undo change and validate', function() {
        editor.undo();

        expect(editor.get('history.current')).to.equal(1);
        expect(editor.get('history.length')).to.equal(2);
        expect(editor.get('changes.length')).to.equal(1);
    });

    it('redo change and validate', function() {
        editor.redo();

        expect(editor.get('history.current')).to.equal(2);
        expect(editor.get('history.length')).to.equal(2);
        expect(editor.get('changes.length')).to.equal(2);
    });

    it('revert changes', async function() {
        await waitForEditorReady(editor, ()=>{
            editor.revert();
        });

        expect(editor.get('history.current')).to.equal(0);
        expect(editor.get('history.length')).to.equal(0);
        expect(editor.get('changes.length')).to.equal(0);


        let objs = editor.search(display.getViewBounds());
        expect(objs).to.have.lengthOf(0);
    });


    it('add a poi object and validate', function() {
        var poi3 = {
            type: 'Feature',
            properties: {featureClass: 'PLACE'},
            geometry: {
                type: 'Point',
                coordinates: editor.toGeoJSONCoordinates({x: 250, y: 200})
            }
        };
        editor.addFeature(poi3, preparedData.getLayers('placeLayer'));

        expect(editor.get('history.current')).to.equal(1);
        expect(editor.get('history.length')).to.equal(1);
        expect(editor.get('changes.length')).to.equal(1);
    });


    it('undo change and validate', function() {
        editor.undo();

        expect(editor.get('history.current')).to.equal(0);
        expect(editor.get('history.length')).to.equal(1);
        expect(editor.get('changes.length')).to.equal(0);
    });

    it('revert changes', async function() {
        await waitForEditorReady(editor, ()=>{
            editor.revert();
        });

        expect(editor.get('history.current')).to.equal(0);
        expect(editor.get('history.length')).to.equal(0);
        expect(editor.get('changes.length')).to.equal(0);

        let objs = editor.search(display.getViewBounds());
        expect(objs).to.have.lengthOf(0);
    });


    it('add a poi object and validate', function() {
        var poi4 = {
            type: 'Feature',
            properties: {featureClass: 'PLACE'},
            geometry: {
                type: 'Point',
                coordinates: editor.toGeoJSONCoordinates({x: 250, y: 250})
            }
        };
        editor.addFeature(poi4, preparedData.getLayers('placeLayer'));

        expect(editor.get('history.current')).to.equal(1);
        expect(editor.get('history.length')).to.equal(1);
        expect(editor.get('changes.length')).to.equal(1);
    });

    it('undo change and validate', function() {
        editor.undo();

        expect(editor.get('history.current')).to.equal(0);
        expect(editor.get('history.length')).to.equal(1);
        expect(editor.get('changes.length')).to.equal(0);
    });

    it('redo change and validate', function() {
        editor.redo();

        expect(editor.get('history.current')).to.equal(1);
        expect(editor.get('history.length')).to.equal(1);
        expect(editor.get('changes.length')).to.equal(1);
    });

    it('revert changes', async function() {
        await waitForEditorReady(editor, ()=>{
            editor.revert();
        });

        expect(editor.get('history.current')).to.equal(0);
        expect(editor.get('history.length')).to.equal(0);
        expect(editor.get('changes.length')).to.equal(0);

        let objs = editor.search(display.getViewBounds());
        expect(objs).to.have.lengthOf(0);
    });
});
