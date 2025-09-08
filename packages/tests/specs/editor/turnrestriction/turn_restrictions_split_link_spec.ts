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
import {waitForEditorReady, editorClick, clean, submit} from 'editorUtils';
import {click} from 'triggerEvents';
import {Map} from '@here/xyz-maps-display';
import {Editor, NavlinkShape} from '@here/xyz-maps-editor';
import dataset from './turn_restrictions_split_link_spec.json';

describe('turn restriction test split a link', function() {
    const expect = chai.expect;

    let editor;
    let display;
    let preparedData;
    let mapContainer;
    let link1;
    let link3;
    let linkLayer;
    let idMaps = [];

    before(async ()=>{
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 77.29973, latitude: 12.98805},
            zoomlevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });

        await waitForEditorReady(editor);
        mapContainer = display.getContainer();
        linkLayer = preparedData.getLayers('linkLayer');

        link1 = preparedData.getFeature('linkLayer', 'TEMP');
        link3 = preparedData.getFeature('linkLayer', -189227);

        let objs = editor.search({rect: display.getViewBounds()});
        expect(objs).to.have.lengthOf(3);
    });

    after(async function() {
        await clean(editor, idMaps);
        editor.destroy();
        display.destroy();
        await preparedData.clear();
    });

    it('set turn restrictions, validate value', async function() {
        await click(mapContainer, 120, 100);
        let shape = <NavlinkShape>(await editorClick(editor, 200, 100)).target;
        shape.editTurnRestrictions();

        // click on traffic sign
        await click(mapContainer, 220, 100);

        expect(link3.prop('turnRestriction')).to.deep.equal({end: [link1.id]});
    });


    it('get the shapepoint to split the link, validate link again', async function() {
        link1.select();
        let shape = <NavlinkShape>(await editorClick(editor, 300, 100)).target;

        let splitLinks = shape.splitLink();
        let sLink1 = splitLinks[0];
        let sLink2 = splitLinks[1];

        let idMap;

        await waitForEditorReady(editor, async ()=>{
            idMap = await submit(editor);
            idMaps.push(idMap);
        });

        let sLink1Id = idMap.permanentIDMap[sLink1.getProvider().id][sLink1.id];
        let sLink2Id = idMap.permanentIDMap[sLink2.getProvider().id][sLink2.id];

        let sp1 = editor.getFeature(sLink1Id, linkLayer);
        let sp2 = editor.getFeature(sLink2Id, linkLayer);

        expect(sp1.prop('originLink')).to.be.equal(link1.id);
        expect(sp2.prop('originLink')).to.be.equal(link1.id);
    });
});
