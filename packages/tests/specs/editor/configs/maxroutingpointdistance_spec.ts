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
import dataset from './maxroutingpointdistance_spec.json';
import {describe, beforeAll, afterAll, it} from 'vitest';

describe('set maxRoutingPointDistance', function() {
    const expect = chai.expect;

    let editor;
    let display;
    let preparedData;

    beforeAll(async function() {
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 77.84172527566523, latitude: 17.450976000022266},
            zoomlevel: 19,
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


    it('set maxRoutingPointDistance, validate if a PA is created', async function() {
        editor.destroy();
        editor = editor = new Editor(display, {
            layers: preparedData.getLayers(),
            maxRoutingPointDistance: 10
        });

        await waitForEditorReady(editor, ()=>{
            display.setCenter({longitude: 77.84172527566523, latitude: 17.450976000022266});
            display.setZoomlevel(19);
        });


        let l1 = {
            type: 'Feature',
            properties: {featureClass: 'NAVLINK'},
            geometry: {
                type: 'LineString',
                coordinates: editor.toGeoJSONCoordinates([{x: 100, y: 300}, {x: 400, y: 300}])
            }
        };
        let addr1 = {
            type: 'Feature',
            properties: {featureClass: 'ADDRESS'},
            geometry: {
                type: 'Point',
                coordinates: editor.toGeoJSONCoordinates({x: 300, y: 250})
            }
        };
        let addr2 = {
            type: 'Feature',
            properties: {featureClass: 'ADDRESS'},
            geometry: {
                type: 'Point',
                coordinates: editor.toGeoJSONCoordinates({x: 300, y: 270})
            }
        };

        editor.addFeature(l1, preparedData.getLayers('linkLayer'));
        let pa = editor.addFeature(addr1, preparedData.getLayers('paLayer'));

        // validate address is not created
        expect(pa).to.equal(undefined);
        expect(editor.info()).to.have.lengthOf(1);

        editor.addFeature(addr2, preparedData.getLayers('paLayer'));
        expect(editor.info()).to.have.lengthOf(2);
    });

    it('reset maxRoutingPointDistance, validate if a PA is created', async function() {
        editor.destroy();
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });


        await waitForEditorReady(editor, ()=>{
            display.setCenter({longitude: 77.84172527566523, latitude: 17.450976000022266});
            display.setZoomlevel(19);
        });


        let l1 = {
            type: 'Feature',
            properties: {featureClass: 'NAVLINK'},
            geometry: {
                type: 'LineString',
                coordinates: editor.toGeoJSONCoordinates([{x: 100, y: 300}, {x: 400, y: 300}])
            }
        };
        let addr1 = {
            type: 'Feature',
            properties: {featureClass: 'ADDRESS'},
            geometry: {
                type: 'Point',
                coordinates: editor.toGeoJSONCoordinates({x: 300, y: 250})
            }
        };
        let addr2 = {
            type: 'Feature',
            properties: {featureClass: 'ADDRESS'},
            geometry: {
                type: 'Point',
                coordinates: editor.toGeoJSONCoordinates({x: 300, y: 270})
            }
        };

        editor.addFeature(l1, preparedData.getLayers('linkLayer'));
        editor.addFeature(addr1, preparedData.getLayers('paLayer'));
        expect(editor.info()).to.have.lengthOf(2);

        editor.addFeature(addr2, preparedData.getLayers('paLayer'));
        expect(editor.info()).to.have.lengthOf(3);
    });
});
