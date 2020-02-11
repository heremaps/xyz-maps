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
import chaiAlmost from 'chai-almost';
import dataset from './link_connecthelper_double_connect_check_spec.json';

describe('link connect helper connect crossing and then add new link and connect crossing again', function() {
    const expect = chai.expect;

    var editor;
    let display;
    let preparedData;

    var link2;

    before(async function() {
        chai.use(chaiAlmost(1e-4));
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 80.5752066315913, latitude: 16.51980167657008},
            zoomLevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });
        await editorTests.waitForEditorReady(editor);

        link2 = preparedData.getFeature('linkLayer', -189127);
    });

    after(async function() {
        editor.destroy();
        display.destroy();
        await preparedData.clear();
    });

    it('validate there are crossings found', function() {
        let crossings = link2.checkCrossings();

        let c0 = crossings[0];
        let c1 = crossings[1];

        expect(c0.distance).to.be.almost(0);
        expect(c0.x).to.be.almost(200.00000273436308);
        expect(c0.y).to.be.almost(200.00003627687693);

        expect(c1.distance).to.be.almost(0);
        expect(c1.x).to.be.almost(200.00000273436308);
        expect(c1.y).to.be.almost(259.9999574124813);
    });

    it('connect a crossing', function() {
        let crossings = link2.checkCrossings();

        crossings.forEach((c)=>{
            c.connect();
        });
    });

    it('add a new link and check crossing and connect', async function() {
        let l3 = new features.Navlink([{x: 250, y: 100}, {x: 250, y: 300}], {featureClass: 'NAVLINK'});
        let link3 = editor.addFeature(l3);
        let crossings = link3.checkCrossings();

        let c0 = crossings[0];
        let c1 = crossings[1];

        expect(c0.distance).to.be.almost(0);
        expect(c0.x).to.be.almost(250.00002110004425);
        expect(c0.y).to.be.almost(200.00003627687693);

        expect(c1.distance).to.be.almost(0);
        expect(c1.x).to.be.almost(250.00002110004425);
        expect(c1.y).to.be.almost(259.9999574124813);

        crossings = link3.checkCrossings();

        crossings.forEach((c)=>{
            c.connect();
        });

        crossings.forEach((c)=>{
            c.connect();
        });

        expect(editor.info()).to.have.lengthOf(11);
    });
});
