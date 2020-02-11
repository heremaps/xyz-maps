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
import chaiAlmost from 'chai-almost';
import dataset from './link_connecthelper_1_spec.json';

describe('link connect helper 1', function() {
    const expect = chai.expect;

    var editor;
    let display;
    let preparedData;

    var link2;
    var crossings;

    before(async function() {
        chai.use(chaiAlmost(1e-4));
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 80.58758879566193, latitude: 16.564128450446262},
            zoomLevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });
        await editorTests.waitForEditorReady(editor);

        link2 = preparedData.getFeature('linkLayer', -189096);
    });

    after(async function() {
        editor.destroy();
        display.destroy();
        await preparedData.clear();
    });

    it('validate crossings', function() {
        link2.select();
        crossings = link2.checkCrossings();

        let c = crossings[0];
        expect(c.distance).to.be.equal(0);
        expect(c.x).to.almost.equal(199.99998956918716);
        expect(c.y).to.almost.equal(199.99998024106026);
    });

    it('connect the crossing and validate links', async function() {
        crossings = link2.checkCrossings();

        crossings.forEach((c)=>{
            c.connect();
        });

        let objs = editor.search(display.getViewBounds());
        expect(objs).to.have.lengthOf(3);
    });
});
