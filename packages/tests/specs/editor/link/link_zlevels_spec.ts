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
import {waitForEditorReady, editorClick} from 'editorUtils';
import {drag, click} from 'triggerEvents';
import {Map} from '@here/xyz-maps-display';
import {Editor} from '@here/xyz-maps-editor';
// @ts-ignore @deprecated
import dataset from './link_zlevels_spec.json';
import {NavlinkShape} from '@here/xyz-maps-editor';

describe('navlink zlevels', () => {
    const expect = chai.expect;

    let editor;
    let display;
    let preparedData;
    let mapContainer;
    let link;

    before(async () => {
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 77.19774634658813, latitude: 13.103736533151803},
            zoomlevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });
        await waitForEditorReady(editor);
        mapContainer = display.getContainer();

        link = preparedData.getFeature('linkLayer', -189094);
    });

    after(async () => {
        editor.destroy();
        display.destroy();
        await preparedData.clear();
    });

    it('create a link and validate', () => {
        expect(link.getZLevels()).to.deep.equal([1, 2, 3]);
    });

    it('set zlevel and validate', () => {
        link.setZLevels([1, 1, 1]);
        expect(link.getZLevels()).to.deep.equal([1, 1, 1]);
    });

    it('remove shape and validate zlevels', async () => {
        link.select();
        let shape = <NavlinkShape>(await editorClick(editor, 200, 100)).target;
        shape.remove();
        expect(link.getZLevels()).to.deep.equal([1, 1]);
    });

    it('add one more shape point at head of the link and validate', () => {
        link.addShape({
            x: 200,
            y: 100,
            z: 2
        }, 0);

        expect(link.getZLevels()).to.deep.equal([2, 1, 1]);
    });

    it('set zlevel and validate', ()=>{
        link.setZLevels([1, 1, 1]);
        expect(link.getZLevels()).to.deep.equal([1, 1, 1]);
    });


    it('drag shape point and validate', async ()=>{
        await click(mapContainer, 100, 200);
        await drag(mapContainer, {x: 400, y: 200}, {x: 100, y: 300});

        expect(link.getZLevels()).to.deep.equal([1, 1, 1]);
    });


    it('add a shape point and validate', ()=>{
        link.addShape({x: 200, y: 300}, 1);
        expect(link.getZLevels()).to.deep.equal([1, 0, 1, 1]);
    });

    it('add one more shape point, validate zlevel', ()=>{
        link.addShape({x: 200, y: 300, z: 2}, 1);
        expect(link.getZLevels()).to.deep.equal([1, 2, 0, 1, 1]);
    });

    it('split link and validate', async ()=>{
        let shape = <NavlinkShape>(await editorClick(editor, 100, 300)).target;

        let splitLinks = shape.splitLink();

        expect(splitLinks[0].getZLevels()).to.deep.equal([1, 2, 0, 1]);
        expect(splitLinks[1].getZLevels()).to.deep.equal([1, 1]);
    });
});
