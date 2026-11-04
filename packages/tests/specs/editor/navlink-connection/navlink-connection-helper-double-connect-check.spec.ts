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
import dataset from './navlink-connection-helper-double-connect-check.json';
import {describe, beforeAll, afterAll, it, expect} from 'vitest';

describe('Navlink connection helper double connect check', function() {
    let editor;
    let display;
    let preparedData;
    let link2;

    beforeAll(async function() {
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 80.5752066315913, latitude: 16.51980167657008},
            zoomlevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });
        await waitForEditorReady(editor);

        link2 = preparedData.getFeature('linkLayer', -189127);
    });

    afterAll(async function() {
        editor.destroy();
        display.destroy();
        await preparedData.clear();
    });

    it('validate there are crossings found', function() {
        let crossings = link2.checkCrossings();

        let c0 = crossings[0];
        let c1 = crossings[1];

        expect(c0.distance).toEqualWithTolerance(0, 1e-1);
        expect(c0.x).toEqualWithTolerance(200, 1e-1);
        expect(c0.y).toEqualWithTolerance(200, 1e-1);

        expect(c1.distance).toEqualWithTolerance(0, 1e-1);
        expect(c1.x).toEqualWithTolerance(200, 1e-1);
        expect(c1.y).toEqualWithTolerance(260, 1e-1);
    });

    it('connect a crossing', function() {
        let crossings = link2.checkCrossings();

        crossings.forEach((c)=>{
            c.connect();
        });
    });

    it('add a new link and check crossing and connect', async function() {
        let l3 = {
            type: 'Feature',
            properties: {featureClass: 'NAVLINK'},
            geometry: {
                type: 'LineString',
                coordinates: editor.toGeoJSONCoordinates([{x: 250, y: 100}, {x: 250, y: 300}])
            }
        };
        let link3 = editor.addFeature(l3);
        let crossings = link3.checkCrossings();

        let c0 = crossings[0];
        let c1 = crossings[1];

        expect(c0.distance).toEqualWithTolerance(0, 1e-1);
        expect(c0.x).toEqualWithTolerance(250, 1e-1);
        expect(c0.y).toEqualWithTolerance(200, 1e-1);

        expect(c1.distance).toEqualWithTolerance(0, 1e-1);
        expect(c1.x).toEqualWithTolerance(250, 1e-1);
        expect(c1.y).toEqualWithTolerance(260, 1e-1);

        crossings = link3.checkCrossings();

        crossings.forEach((c)=>{
            c.connect();
        });

        crossings.forEach((c)=>{
            c.connect();
        });

        expect(editor.info()).toHaveLength(11);
    });
});
