/*
 * Copyright (C) 2019-2022 HERE Europe B.V.
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
import {click} from 'triggerEvents';
import {Map} from '@here/xyz-maps-display';
import {Editor} from '@here/xyz-maps-editor';
import dataset from './turn_restrictions_link_spec.json';

describe('edit turn restrictions by function on link', function() {
    const expect = chai.expect;

    let editor;
    let display;
    let preparedData;
    let mapContainer;

    let link1;
    let link2;

    before(async function() {
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 77.878971, latitude: 13.042632},
            zoomlevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });

        await waitForEditorReady(editor);
        mapContainer = display.getContainer();

        link1 = preparedData.getFeature('linkLayer', -189193);
        link2 = preparedData.getFeature('linkLayer', -189194);
    });

    after(async function() {
        editor.destroy();
        display.destroy();
        await preparedData.clear();
    });

    it('set turn restriction and validate it', async function() {
        link1.editTurnRestrictions();

        await click(mapContainer, 100, 115);

        expect(link1.prop('turnRestriction')).to.deep.equal({start: [link2.id]});
    });


    it('set turn restriction again and validate it', async function() {
        await click(mapContainer, 200, 115);

        expect(link1.prop('turnRestriction')).to.deep.equal({start: [link2.id], end: [link2.id]});
    });
});
