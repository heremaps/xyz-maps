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
import dataset from './area_get_functions_spec.json';

describe('Area getters return value', function() {
    const expect = chai.expect;

    var editor;
    var display;
    var preparedData;
    var area;

    before(async function() {
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: -120.123004, latitude: 41.242238},
            zoomLevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });

        await editorTests.waitForEditorReady(editor);

        area = preparedData.getFeature('buildingLayer', -9075);
    });

    after(async function() {
        editor.destroy();
        display.destroy();

        await preparedData.clear();
    });


    it('get an area object and validate', function() {
        expect(area.coord()).to.deep.equal([[[
            [-120.124076884, 41.242238, 0],
            [-120.124076884, 41.241431263, 0],
            [-120.123004, 41.241431263, 0],
            [-120.123004, 41.242238, 0],
            [-120.124076884, 41.242238, 0]
        ]]]);

        expect(area.prop()).to.deep.include({
            type: 'building',
            name: 'test'
        });
    });
});
