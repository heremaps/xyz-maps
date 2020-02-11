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
import dataset from './link_style_set_road_type_spec.json';

xdescribe('verify bridge, tunnel Link style', function() {
    const expect = chai.expect;

    let link;
    let editor;
    let display;
    let preparedData;
    let linkLayer;

    before(async function() {
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 77.36369, latitude: 13.09926},
            zoomLevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });
        await editorTests.waitForEditorReady(editor);
        linkLayer = preparedData.getLayers('linkLayer');
    });

    after(async function() {
        editor.destroy();
        display.destroy();
        await preparedData.clear();
    });

    it('add a line object and validate', function() {
        let lnk = new features.Navlink([{x: 400, y: 200}, {x: 100, y: 200}], {featureClass: 'NAVLINK'});

        link = editor.addFeature(lnk, linkLayer);

        expect(link.style()).to.deep.equal([
            {zIndex: 0, type: 'Line', strokeWidth: 10, stroke: '#ff0000'}
        ]);
    });

    it('set the link as a bridge and validate link style', function() {
        link.prop({type: 2});

        expect(link.style()).to.deep.equal([
            {zIndex: 0, type: 'Line', strokeWidth: 10, stroke: '#ff0000'}
        ]);

        expect(link.style('default')).to.deep.equal([
            {zIndex: 0, type: 'Line', strokeWidth: 10, stroke: '#ff0000'}
        ]);
    });

    it('select the link and validate link style', function() {
        link.select();
        expect(link.style()).to.deep.equal([
            {zIndex: 0, type: 'Line', strokeWidth: 10, stroke: '#ff0000'}
        ]);

        expect(link.style('default')).to.deep.equal([
            {zIndex: 0, type: 'Line', strokeWidth: 10, stroke: '#ff0000'}
        ]);
    });


    it('unselect the link and validate link style', function() {
        link.unselect();
        expect(link.style()).to.deep.equal([
            {zIndex: 0, type: 'Line', strokeWidth: 10, stroke: '#ff0000'}
        ]);

        expect(link.style('default')).to.deep.equal([
            {zIndex: 0, type: 'Line', strokeWidth: 10, stroke: '#ff0000'}
        ]);
    });

    it('set the link as a tunnel and validate link style', function() {
        link.prop({type: 4});
        expect(link.style()).to.deep.equal([
            {zIndex: 0, type: 'Line', strokeWidth: 10, stroke: '#ff0000'}
        ]);

        expect(link.style('default')).to.deep.equal([
            {zIndex: 0, type: 'Line', strokeWidth: 10, stroke: '#ff0000'}
        ]);
    });

    it('select the tunnel link and validate link style', async function() {
        link.select();
        expect(link.style()).to.deep.equal([
            {zIndex: 0, type: 'Line', strokeWidth: 10, stroke: '#ff0000'}
        ]);

        expect(link.style('default')).to.deep.equal([
            {zIndex: 0, type: 'Line', strokeWidth: 10, stroke: '#ff0000'}
        ]);
    });
});
