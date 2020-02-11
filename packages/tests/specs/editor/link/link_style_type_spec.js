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
import dataset from './link_style_type_spec.json';

xdescribe('verify and set different link styles', function() {
    const expect = chai.expect;

    let editor;
    let display;
    let preparedData;
    let mapContainer;
    let linkLayer;
    let link; let link1;

    before(async function() {
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 75.59646510963768, latitude: 13.689427308866668},
            zoomLevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });
        await editorTests.waitForEditorReady(editor);
        linkLayer = preparedData.getLayers('linkLayer');
        mapContainer = display.getContainer();

        link = editor.addFeature(new features.Navlink([{x: 100, y: 100}, {x: 200, y: 100}], {featureClass: 'NAVLINK'}), linkLayer);
        link1 = editor.addFeature(new features.Navlink([{x: 100, y: 200}, {x: 200, y: 200}], {featureClass: 'NAVLINK', type: 5}), linkLayer);
    });

    after(async function() {
        editor.destroy();
        display.destroy();
        await preparedData.clear();
    });

    it('validate link style', function() {
        expect(link.style()).to.deep.equal([
            {zIndex: 0, type: 'Line', strokeWidth: 10, stroke: '#ff0000'}
        ]);

        expect(link1.style()).to.deep.equal([
            {zIndex: 0, type: 'Line', strokeWidth: 10, stroke: '#ff0000'}
        ]);
    });

    it('select link and modify type value', function() {
        link.prop('type', 'highway');
        expect(link.style()).to.deep.equal([
            {zIndex: 0, type: 'Line', strokeWidth: 10, stroke: '#ff0000'}
        ]);
    });


    it('set the link to path', function() {
        link.prop({type: 'path'});
        expect(link.style()).to.deep.equal([
            {zIndex: 0, type: 'Line', strokeWidth: 10, stroke: '#ff0000'}
        ]);
    });


    it('set the second link to highway', function() {
        link.prop({type: 'highway'});
        expect(link.style()).to.deep.equal([
            {zIndex: 0, type: 'Line', strokeWidth: 10, stroke: '#ff0000'}
        ]);
    });

    it('create a link by drawing manager and validate', async function() {
        editor.getDrawingBoard().start({
            position: {x: 150, y: 100},
            connectTo: link
        });

        await testUtils.events.mousemove(mapContainer, {x: 150, y: 300}, {x: 200, y: 300});
        await testUtils.events.click(mapContainer, 200, 300);

        editor.getDrawingBoard().create({featureClass: 'NAVLINK'});

        let objs = editor.search(display.getViewBounds());
        expect(objs).to.have.lengthOf(4);
    });
});
