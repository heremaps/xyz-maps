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
import {prepare} from 'utils';
import {waitForEditorReady} from 'editorUtils';
import {drag, click} from 'triggerEvents';
import {Map} from '@here/xyz-maps-display';
import {Editor} from '@here/xyz-maps-editor';
import chaiAlmost from 'chai-almost';
import dataset from './link_editable_spec.json';

describe('link editable', function() {
    const expect = chai.expect;

    let link;
    let editor;
    let display;
    let preparedData;
    let mapContainer;
    let linkLayer;

    before(async function() {
        chai.use(chaiAlmost());
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 80.14459, latitude: 17.96039},
            zoomlevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });

        await waitForEditorReady(editor);
        mapContainer = display.getContainer();

        link = preparedData.getFeature('linkLayer', -189070);
        linkLayer = preparedData.getLayers('linkLayer');
    });

    after(async function() {
        editor.destroy();
        display.destroy();
        await preparedData.clear();
    });

    it('set link to not editable', function() {
        link.editable(false);

        expect(link.coord()).to.deep.almost([
            [80.142980675, 17.961410599, 0],
            [80.144053558, 17.961410599, 0],
            [80.144053558, 17.96039, 0]
        ]);
    });

    it('click on link and try drag again', async function() {
        // click on link
        await click(mapContainer, 100, 100);

        // try drag link shape point
        await waitForEditorReady(editor, async ()=>{
            await drag(mapContainer, {x: 300, y: 300}, {x: 400, y: 300});
        });

        let lnk = editor.getFeature(link.id, linkLayer);

        // link geometry is not changed
        expect(lnk.coord()).to.deep.almost([
            [80.142980675, 17.961410599, 0],
            [80.144053558, 17.961410599, 0],
            [80.144053558, 17.96039, 0]
        ]);
    });

    it('set link to editable and drag it', async function() {
        await waitForEditorReady(editor, ()=>{
            display.setCenter({longitude: 80.14459, latitude: 17.96039});
        });

        let lnk = editor.getFeature(link.id, linkLayer);
        lnk.editable(true);

        // click on link
        await click(mapContainer, 100, 100);

        // drag link shape point
        await drag(mapContainer, {x: 300, y: 300}, {x: 400, y: 300});

        lnk = editor.getFeature(link.id, linkLayer);

        // link geometry is changed
        expect(lnk.coord()).to.deep.almost([
            [80.142980675, 17.961410599, 0],
            [80.144053558, 17.961410599, 0],
            [80.14459, 17.96039, 0]
        ]);
    });
});
