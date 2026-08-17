/*
 * Copyright (C) 2019-2026 HERE Europe B.V.
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
import {TileLayer} from '@here/xyz-maps-core';
import {Editor} from '@here/xyz-maps-editor';
// @ts-ignore @deprecated
import {features} from '@here/xyz-maps-editor';
import {TestLocalProvider} from '../../../src/TestProvider';
import dataset from '../address/address_setcoordinates_spec.json';

describe('coordinatePrecision configuration', function() {
    const expect = chai.expect;
    let preparedData;
    let display;
    let editor;
    let placeLayer;
    let areaLayer;

    before(async function() {
        preparedData = await prepare(dataset);
        placeLayer = new TileLayer({
            min: 14,
            max: 20,
            provider: new TestLocalProvider({})
        });
        areaLayer = new TileLayer({
            min: 14,
            max: 20,
            provider: new TestLocalProvider({})
        });
        const layers = [...preparedData.getLayers(), placeLayer, areaLayer];
        display = new Map(document.getElementById('map'), {
            center: {longitude: 75.573482, latitude: 12.950542},
            zoomlevel: 18,
            layers
        });
        editor = new Editor(display, {
            layers,
            coordinatePrecision: 3
        });
        await waitForEditorReady(editor);
    });

    after(async function() {
        editor.destroy();
        display.destroy();
        await preparedData.clear();
    });

    it('rounds Address geometry coordinates to the configured precision', function() {
        const address = preparedData.getFeature('paLayer', -47939);
        address.coord([75.5734815169876, 12.9505423419876, 0]);

        expect(address.geometry.coordinates).to.deep.equal([75.573, 12.951, 0]);
    });

    it('rounds Place geometry coordinates to the configured precision', function() {
        const place = editor.addFeature(
            new features.Place({x: 300, y: 250}, {featureClass: 'PLACE'}),
            placeLayer
        );
        place.coord([75.573481516, 12.950542341, 0]);

        expect(place.geometry.coordinates).to.deep.equal([75.573, 12.951, 0]);
    });

    it('rounds Navlink geometry coordinates to the configured precision', function() {
        const link = preparedData.getFeature('linkLayer', -188828);
        link.coord([[75.573481516, 12.950542341, 0],
            [75.573481516, 12.950542341, 0]]);

        expect(link.geometry.coordinates).to.deep.equal([
            [75.573, 12.951, 0], [75.573, 12.951, 0]
        ]);
    });

    it('rounds Area geometry coordinates to the configured precision', function() {
        const area = editor.addFeature(
            new features.Area([[
                [{x: 200, y: 300}, {x: 200, y: 500},
                    {x: 400, y: 300}, {x: 200, y: 300}]
            ]], {featureClass: 'AREA'}),
            areaLayer
        );

        area.coord([[
            [75.573481516, 12.950542341, 0],
            [75.573481516, 12.950542341, 0],
            [75.573481516, 12.950542341, 0],
            [75.573481516, 12.950542341, 0]
        ]]);

        console.log(area, area.geometry.coordinates);

        expect(area.geometry.coordinates).to.deep.equal([[[
            [75.573, 12.951, 0], [75.573, 12.951, 0],
            [75.573, 12.951, 0], [75.573, 12.951, 0]
        ]]]);
    });

    it('applies precision changes made through config', function() {
        editor.config({coordinatePrecision: 6});
        expect(editor.config('coordinatePrecision')).to.equal(6);

        const address = preparedData.getFeature('paLayer', -47939);
        address.coord([75.573481516, 12.950542341, 0]);

        expect(address.geometry.coordinates).to.deep.equal([75.573482, 12.950542, 0]);
    });
});
