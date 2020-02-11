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
import dataset from './link_connecthelper_maxdistance_spec.json';

describe('link connect helper with maxdistance greater than 3', function() {
    const expect = chai.expect;

    var editor;
    let display;
    let preparedData;

    var link1;
    var link2;
    var link3;
    var crossings;

    before(async function() {
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 77.642761, latitude: 17.791314},
            zoomLevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });
        await editorTests.waitForEditorReady(editor);

        link1 = preparedData.getFeature('linkLayer', -6128);
        link2 = preparedData.getFeature('linkLayer', -189129);
        link3 = preparedData.getFeature('linkLayer', -189130);
    });

    after(async function() {
        editor.destroy();
        display.destroy();
        await preparedData.clear();
    });

    it('validate crossings', function() {
        crossings = link1.checkCrossings();

        expect(crossings).to.have.lengthOf(0);

        crossings = link1.checkCrossings({maxDistance: 10});

        expect(crossings).to.have.lengthOf(1);
    });

    it('connect the crossing and validate links', async function() {
        crossings = link1.checkCrossings({maxDistance: 10});

        expect(crossings).to.have.lengthOf(1);

        crossings[0].connect();

        expect(link1.coord()).to.deep.equal([[77.641956337, 17.790593789, 0], [77.642417677, 17.791564285, 0]]);
        expect(link2.coord()).to.deep.equal([[77.642417677, 17.791564285, 0], [77.643061407, 17.790644868, 0]]);
        expect(link3.coord()).to.deep.equal([[77.641210683, 17.791400834, 0], [77.642417677, 17.791564285, 0]]);
    });
});
