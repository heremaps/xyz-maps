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
import dataset from './link_style_spec.json';

xdescribe('verify Link style', function() {
    const expect = chai.expect;

    let editor;
    let display;
    let preparedData;
    let link;
    let link2;
    let linkLayer;
    let mapContainer;
    let isMaps = [];

    before(async function() {
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 77.21515519724221, latitude: 13.227415186829163},
            zoomLevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });
        await editorTests.waitForEditorReady(editor);
        mapContainer = display.getContainer();
        linkLayer = preparedData.getLayers('linkLayer');
    });

    after(async function() {
        await editorTests.clean(editor, isMaps);
        editor.destroy();
        display.destroy();
        await preparedData.clear();
    });

    it('add a line object and validate', function() {
        let lnk = new features.Navlink([{x: 400, y: 200}, {x: 100, y: 200}], {featureClass: 'NAVLINK'});
        link = editor.addFeature(lnk, linkLayer);

        expect(link.style('default')).to.deep.equal([
            {zIndex: 0, type: 'Line', strokeWidth: 10, stroke: '#ff0000'}
        ]);

        expect(link.style()).to.deep.equal([
            {zIndex: 0, type: 'Line', strokeWidth: 10, stroke: '#ff0000'}
        ]);
    });

    it('click the created Link, validate its style', async function() {
        await editorTests.click(editor, 200, 200);

        expect(link.style()).to.deep.equal([
            {zIndex: 0, type: 'Line', strokeWidth: 10, stroke: '#ff0000'}
        ]);
    });

    it('modify link inline color and validate', function() {
        link.style(
            [
                {'zIndex': 0, 'type': 'Line', 'stroke': '#1BBADD', 'strokeWidth': 18, 'strokeLinejoin': 'round', 'strokeLinecap': 'round', 'opacity': 1}
            ]
        );

        expect(link.style()).to.deep.equal([
            {'zIndex': 0, 'type': 'Line', 'stroke': '#1BBADD', 'strokeWidth': 18, 'strokeLinejoin': 'round', 'strokeLinecap': 'round', 'opacity': 1}
        ]);
    });


    it('click to dehighlight Link', async function() {
        await editorTests.click(editor, 200, 100);

        expect(link.style()).to.deep.equal([
            {zIndex: 0, type: 'Line', strokeWidth: 10, stroke: '#ff0000'}
        ]);
    });


    it('set link inline color permanently and validate', function() {
        link.style(
            [
                {'zIndex': 0, 'type': 'Line', 'stroke': '#1BBADD', 'strokeWidth': 18, 'strokeLinejoin': 'round', 'strokeLinecap': 'round', 'opacity': 1}
            ], true
        );

        expect(link.style()).to.deep.equal([
            {'zIndex': 0, 'type': 'Line', 'stroke': '#1BBADD', 'strokeWidth': 18, 'strokeLinejoin': 'round', 'strokeLinecap': 'round', 'opacity': 1}
        ]);
    });

    it('click to dehighlight link, validate link color is changed back', async function() {
        await editorTests.click(editor, 100, 100);

        await editorTests.click(editor, 200, 200);

        expect(link.style()).to.deep.equal([
            {zIndex: 0, type: 'Line', strokeWidth: 10, stroke: '#ff0000'}
        ]);
    });

    it('dehighlight link and validate', function() {
        link.unselect();
        expect(link.style()).to.deep.equal([
            {zIndex: 0, type: 'Line', strokeWidth: 10, stroke: '#ff0000'}
        ]);
    });


    it('highlight link and validate', function() {
        link.select();
        expect(link.style()).to.deep.equal([
            {zIndex: 0, type: 'Line', strokeWidth: 10, stroke: '#ff0000'}
        ]);
    });


    it('add a link, submit and select', async function() {
        await editorTests.waitForEditorReady(editor, ()=>{
            editor.revert();
        });

        let lnk2 = new features.Navlink([{x: 400, y: 300}, {x: 100, y: 300}, {x: 100, y: 400}], {featureClass: 'NAVLINK'});
        link2 = editor.addFeature(lnk2, linkLayer);

        let idMap;

        await editorTests.waitForEditorReady(editor, async ()=>{
            idMap = await editorTests.submit(editor);
            isMaps.push(idMap);
        });
        let linkId = idMap.permanentIDMap[link2.getProvider().id][link2.id];

        link2 = editor.getFeature(linkId, linkLayer);
        link2.select();

        expect(link2.style()).to.deep.equal([
            {zIndex: 0, type: 'Line', strokeWidth: 10, stroke: '#ff0000'}
        ]);
    });

    it('drag the link shape and undo, validate the change', async function() {
        await testUtils.events.drag(mapContainer, {x: 100, y: 300}, {x: 150, y: 290});

        editor.undo();

        link2 = editor.getFeature(link2.id, linkLayer);

        expect(link2.style()).to.deep.equal([
            {zIndex: 0, type: 'Line', strokeWidth: 10, stroke: '#ff0000'}
        ]);
    });
});
