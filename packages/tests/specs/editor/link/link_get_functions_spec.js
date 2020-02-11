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
import dataset from './link_get_functions_spec.json';

describe('Link getters return correct value', function() {
    const expect = chai.expect;

    var editor;
    var display;
    var preparedData;

    var link;

    before(async function() {
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 8.528291, latitude: 49.909723},
            zoomLevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });

        await editorTests.waitForEditorReady(editor);
        link = preparedData.getFeature('linkLayer', -189073);
    });

    after(async function() {
        editor.destroy();
        display.destroy();
        await preparedData.clear();
    });

    it('get a link in viewport and validate', function() {
        expect(link.coord()).to.deep.equal([
            [8.527619957, 49.909971348, 0],
            [8.527861356, 49.909978257, 0]
        ]);

        expect(link.prop()).to.deep.include({
            featureClass: 'NAVLINK',
            type: 'residential',
            name: 'test road',
            turnRestriction: {end: ['abcdefg']},
            direction: 'END_TO_START',
            pedestrianOnly: true
        });
        expect(link.getZLevels()).to.deep.equal([0, 0]);
        expect(link.style()).to.deep.equal([
            {zIndex: 0, type: 'Line', strokeWidth: 10, stroke: '#ff0000'}
        ]);
    });
});
