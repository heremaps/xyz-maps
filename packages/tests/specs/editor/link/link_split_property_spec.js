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
import dataset from './link_split_property_spec.json';

describe('link splitting basic', function() {
    const expect = chai.expect;

    let link; let link1; let link2; let link3; let link4; let link5; let link6; let link7; let link8; let link9; let link10;
    let shape;
    let splitLinks;

    let editor;
    let display;
    let preparedData;

    before(async function() {
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 77.29272829961394, latitude: 13.124072806285966},
            zoomLevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });

        await editorTests.waitForEditorReady(editor);
    });

    after(async function() {
        editor.destroy();
        display.destroy();
        await preparedData.clear();
    });

    it('add a link object and split, validate type property', async function() {
        let lnk = new features.Navlink([{x: 100, y: 100}, {x: 100, y: 110}, {x: 100, y: 300}], {'featureClass': 'NAVLINK', 'type': 'highway'});
        link = editor.addFeature(lnk);

        link.select();
        shape = (await editorTests.click(editor, 100, 111)).target;

        splitLinks = shape.splitLink();

        expect(splitLinks[0].prop()).to.deep.include({'type': 'highway'});
        expect(splitLinks[1].prop()).to.deep.include({'type': 'highway'});
    });

    // link1
    it('add a link object and split at different position, validate name property', async function() {
        let lnk = new features.Navlink([{x: 100, y: 100}, {x: 100, y: 120}, {x: 100, y: 300}], {'featureClass': 'NAVLINK', 'type': 'highway', 'name': 'A1'});
        link1 = editor.addFeature(lnk);
        link1.select();

        shape = (await editorTests.click(editor, 100, 120)).target;

        splitLinks = shape.splitLink();

        expect(splitLinks[0].prop()).to.deep.include({'type': 'highway', 'name': 'A1'});
        expect(splitLinks[1].prop()).to.deep.include({'type': 'highway', 'name': 'A1'});
    });

    // link2
    it('add a link object and split at different position, validate turn restriction property', async function() {
        let lnk = new features.Navlink([{x: 100, y: 100}, {x: 100, y: 140}, {x: 100, y: 300}], {'featureClass': 'NAVLINK', 'type': 'highway', 'turnRestrition': {'start': ['abc'], 'end': [123]}});
        link2 = editor.addFeature(lnk);
        link2.select();

        shape = (await editorTests.click(editor, 100, 140)).target;

        splitLinks = shape.splitLink();

        expect(splitLinks[0].prop()).to.deep.include({'turnRestrition': {'start': ['abc'], 'end': [123]}});
        expect(splitLinks[1].prop()).to.deep.include({'turnRestrition': {'start': ['abc'], 'end': [123]}});
    });

    // link3
    it('add a link object and split at different position, validate direction property', async function() {
        let lnk = new features.Navlink([{x: 100, y: 100}, {x: 100, y: 160}, {x: 100, y: 300}], {'featureClass': 'NAVLINK', 'type': 'highway', 'direction': 'BOTH'});
        link2 = editor.addFeature(lnk);
        link2.select();

        shape = (await editorTests.click(editor, 100, 160)).target;

        splitLinks = shape.splitLink();
        expect(splitLinks[0].prop()).to.deep.include({'direction': 'BOTH'});
        expect(splitLinks[1].prop()).to.deep.include({'direction': 'BOTH'});
    });

    // link4
    it('add a link object and split at different position, validate pedestrianOnly property', async function() {
        let lnk = new features.Navlink([{x: 100, y: 100}, {x: 100, y: 200}, {x: 100, y: 300}], {'featureClass': 'NAVLINK', 'type': 'path', 'pedestrianOnly': true});
        link2 = editor.addFeature(lnk);
        link2.select();

        shape = (await editorTests.click(editor, 100, 200)).target;

        splitLinks = shape.splitLink();

        expect(splitLinks[0].prop()).to.deep.include({'pedestrianOnly': true});
        expect(splitLinks[1].prop()).to.deep.include({'pedestrianOnly': true});
    });

    // link5
    it('add a link object and split at different position, validate coordinates', async function() {
        let lnk = new features.Navlink([{x: 100, y: 100}, {x: 100, y: 240}, {x: 100, y: 300}], {'featureClass': 'NAVLINK', 'type': 'path'});
        link2 = editor.addFeature(lnk);
        link2.select();

        shape = (await editorTests.click(editor, 100, 240)).target;

        splitLinks = shape.splitLink();

        expect(splitLinks[0].coord()).to.deep.equal([[77.291118974, 13.125117665, 0], [77.291118974, 13.124386264, 0]]);
        expect(splitLinks[1].coord()).to.deep.equal([[77.291118974, 13.124386264, 0], [77.291118974, 13.124072806, 0]]);
    });
});
