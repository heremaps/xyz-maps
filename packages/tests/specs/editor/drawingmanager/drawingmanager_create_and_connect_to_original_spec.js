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
import {waitForEditorReady, editorClick, submit} from 'editorUtils';
import {click, mousemove} from 'triggerEvents';
import {Map} from '@here/xyz-maps-display';
import {Editor} from '@here/xyz-maps-editor';
import chaiAlmost from 'chai-almost';
import dataset from './drawingmanager_create_and_connect_to_original_spec.json';

describe('Create new Links and connect to original link', function() {
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
            center: {longitude: 77.221332, latitude: 13.151157},
            zoomlevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });
        await waitForEditorReady(editor);
        mapContainer = display.getContainer();

        link = preparedData.getFeature('linkLayer', -188847);
    });

    after(async function() {
        editor.destroy();
        display.destroy();
        await preparedData.clear();
    });


    it('create link with connectTo link', async function() {
        editor.getDrawingBoard().start({
            position: {x: 200, y: 100},
            connectTo: link
        });

        await mousemove(mapContainer, {x: 100, y: 200}, {x: 200, y: 200});
        await click(mapContainer, 200, 200);

        let lnk;
        await waitForEditorReady(editor, async ()=>{
            lnk = editor.getDrawingBoard().create({featureClass: 'NAVLINK'});
        });

        expect(lnk.coord()).to.deep.almost([
            [77.220259106, 13.152202639, 0],
            [77.220259116, 13.151679372, 0]
        ]);
    });


    it('validate the connect shape point then submit', async function() {
        await click(mapContainer, 200, 120);
        let linkshape = (await editorClick(editor, 200, 100)).target;

        let lnk = linkshape.getConnectedLinks();

        expect(lnk).to.have.lengthOf(1);
        expect(lnk[0].id).to.equal(link.id);

        await waitForEditorReady(editor, async ()=>{
            await submit(editor);
        });
    });


    it('validate the connect shape point again after submit', async function() {
        await click(mapContainer, 200, 120);
        let linkshape = (await editorClick(editor, 200, 100)).target;

        let lnk = linkshape.getConnectedLinks();

        expect(lnk).to.have.lengthOf(1);
        expect(lnk[0].id).to.equal(link.id);
    });
});
