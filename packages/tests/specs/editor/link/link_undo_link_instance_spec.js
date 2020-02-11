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
import {editorTests, testUtils, prepare} from 'hereTest';
import {Map} from '@here/xyz-maps-core';
import {features, Editor} from '@here/xyz-maps-editor';
import chaiAlmost from 'chai-almost';
import dataset from './link_undo_link_instance_spec.json';

xdescribe('link undo its instance is updated', function() {
    const expect = chai.expect;

    let editor;
    let display;
    let preparedData;
    let mapContainer;
    let link;

    before(async function() {
        chai.use(chaiAlmost());
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 80.63357782733888, latitude: 17.71492567213454},
            zoomLevel: 18,
            layers: preparedData.getLayers()
        });

        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });
        await editorTests.waitForEditorReady(editor);
        mapContainer = display.getContainer();
        link = editor.addFeature(
            new features.Navlink([{x: 100, y: 100}, {x: 300, y: 100}], {featureClass: 'NAVLINK'})
        );
    });

    after(async function() {
        editor.destroy();
        display.destroy();
        await preparedData.clear();
    });

    it('drag shape point and validate', async function() {
        link.select();
        await testUtils.events.drag(mapContainer, {x: 300, y: 100}, {x: 400, y: 200});

        expect(link.coord()).to.deep.almost([
            [80.631968502, 17.715947679, 0],
            [80.633577827, 17.715436676, 0]
        ]);
    });

    it('undo and check', async function() {
        editor.undo();

        let lnk = editor.getFeature(link.id, link.getProvider().src);
        lnk.select();

        await testUtils.events.drag(mapContainer, {x: 300, y: 100}, {x: 400, y: 200});

        expect(link.coord()).to.deep.almost([
            [80.631968502, 17.715947679, 0],
            [80.633577827, 17.715436676, 0]
        ]);
    });
});
