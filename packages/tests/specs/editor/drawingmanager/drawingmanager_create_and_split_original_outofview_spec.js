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
import {click, drag, mousemove} from 'triggerEvents';
import {Map} from '@here/xyz-maps-display';
import {Editor} from '@here/xyz-maps-editor';
import chaiAlmost from 'chai-almost';
import dataset from './drawingmanager_create_and_split_original_outofview_spec.json';

describe('Create new Link and drag it outside of viewport before splitting the original link', function() {
    const expect = chai.expect;

    let editor;
    let display;
    let preparedData;
    let link;

    before(async function() {
        chai.use(chaiAlmost());
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 79.26345, latitude: 13.04889},
            zoomlevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });
        await waitForEditorReady(editor);

        link = preparedData.getFeature('linkLayer', -188848);
    });

    after(async function() {
        editor.destroy();
        display.destroy();
        await preparedData.clear();
    });


    it('create link with connectTo link', async function() {
        let mapContainer = display.getContainer();

        editor.getDrawingBoard().start({
            position: {x: 143, y: 100},
            connectTo: link
        });

        // click to add a shape
        await mousemove(mapContainer, {x: 100, y: 200}, {x: 200, y: 200});
        await click(mapContainer, 200, 200);

        // pan the map and move the split link outside of the viewport
        await mousemove(mapContainer, {x: 100, y: 200}, {x: 110, y: 60});
        await waitForEditorReady(editor, async ()=>{
            await drag(mapContainer, {x: 110, y: 60}, {x: 110, y: 450});
        });
        // pan the map and move the split link outside of the viewport
        await mousemove(mapContainer, {x: 100, y: 200}, {x: 110, y: 60});
        await waitForEditorReady(editor, async ()=>{
            await drag(mapContainer, {x: 110, y: 60}, {x: 110, y: 450});
        });

        // add one shape point to link
        await mousemove(mapContainer, {x: 100, y: 200}, {x: 200, y: 200});
        await click(mapContainer, 200, 200);

        let lnk;
        await waitForEditorReady(editor, ()=>{
            lnk = editor.getDrawingBoard().create({featureClass: 'NAVLINK'});
        });

        let lnk1 = editor.info()[1];
        let lnk2 = editor.info()[2];

        expect(lnk1.geometry.coordinates).to.deep.almost([
            [79.262377116, 13.049935177, 0],
            [79.262071345, 13.049935177, 0]
        ]);

        expect(lnk2.geometry.coordinates).to.deep.almost([
            [79.262071345, 13.049935177, 0],
            [79.261840675, 13.049935177, 0]
        ]);

        expect(lnk.coord()).to.deep.almost([
            [79.262071345, 13.049935177, 0],
            [79.262377116, 13.049412589, 0],
            [79.262377116, 13.053488746, 0]
        ]);
    });
});
