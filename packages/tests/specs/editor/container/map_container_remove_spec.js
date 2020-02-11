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
import dataset from './map_container_remove_spec.json';

describe('map container remove', function() {
    const expect = chai.expect;

    var editor;
    var display;

    var preparedData;
    var container;

    before(async function() {
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 80.5779562023863, latitude: 16.517482660695578},
            zoomLevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });

        await editorTests.waitForEditorReady(editor);

        container = editor.createFeatureContainer();

        let poi1 = preparedData.getFeature('placeLayer', -29495);
        let poi2 = preparedData.getFeature('placeLayer', -29496);
        let link1 = preparedData.getFeature('linkLayer', -188842);
        let link2 = preparedData.getFeature('linkLayer', -188843);

        // put features to container
        container.push(poi1, poi2, link1, link2);
    });

    after(async function() {
        editor.destroy();
        display.destroy();
        await preparedData.clear();
    });


    it('validate objects in viewport', function() {
        let objs = editor.search({rect: display.getViewBounds()});
        expect(objs).to.have.lengthOf(4);
    });


    it('remove container and validate', async function() {
        container.remove();

        let objs = editor.search({rect: display.getViewBounds()});
        expect(objs).to.have.lengthOf(0);
    });
});
