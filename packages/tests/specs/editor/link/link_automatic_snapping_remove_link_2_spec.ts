/*
 * Copyright (C) 2019-2021 HERE Europe B.V.
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
import {drag} from 'triggerEvents';
import {Map} from '@here/xyz-maps-display';
import {Editor} from '@here/xyz-maps-editor';
import dataset from './link_automatic_snapping_remove_link_2_spec.json';

describe('drag a link shape point to the other and removes the link automatically', function() {
    const expect = chai.expect;

    let editor;
    let display;
    let preparedData;
    let link1;

    before(async function() {
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 76.629901, latitude: 15.197356},
            zoomlevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });

        await waitForEditorReady(editor);

        link1 = preparedData.getFeature('linkLayer', -189018);
    });

    after(async function() {
        editor.destroy();
        display.destroy();
        await preparedData.clear();
    });

    it('select a link and drag its shape point', async function() {
        let mapContainer = display.getContainer();
        link1.select();

        await drag(mapContainer, {x: 320, y: 226}, {x: 278, y: 229});

        expect(editor.info()).to.have.lengthOf(1);
    });


    it('validate one link is in viewport', async function() {
        let objs = editor.search(display.getViewBounds());

        expect(objs).to.have.lengthOf(1);
    });
});
