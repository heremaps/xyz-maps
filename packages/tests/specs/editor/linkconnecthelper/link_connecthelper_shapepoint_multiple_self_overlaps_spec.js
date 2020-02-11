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
import dataset from './link_connecthelper_shapepoint_multiple_self_overlaps_spec.json';

describe('link connect helper which has multiple overlapped shape points and crossing from one link', function() {
    const expect = chai.expect;

    var editor;
    let display;
    let preparedData;

    var link1;

    before(async function() {
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 80.69297278785734, latitude: 16.799272986590253},
            zoomLevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });
        await editorTests.waitForEditorReady(editor);

        link1 = preparedData.getFeature('linkLayer', -189150);
    });

    after(async function() {
        editor.destroy();
        display.destroy();
        await preparedData.clear();
    });

    it('validate there are crossings found', function() {
        let crossings = link1.checkCrossings();
        expect(crossings).to.have.lengthOf(2);
    });

    it('get crossings and connect', async function() {
        let crossings = link1.checkCrossings();
        crossings.forEach((c)=>{
            c.connect();
        });

        expect(editor.info()).to.have.lengthOf(6);
    });
});
