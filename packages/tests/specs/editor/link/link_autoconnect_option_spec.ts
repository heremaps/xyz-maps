/*
 * Copyright (C) 2019-2026 HERE Europe B.V.
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

import {waitForEditorReady, editorClick} from 'editorUtils';
import {drag} from 'triggerEvents';
import {TileLayer} from '@here/xyz-maps-core';
import {TestLocalProvider} from 'TestProviders';
import {Map} from '@here/xyz-maps-display';
// @ts-ignore @deprecated
import {Editor, features, NavlinkShape} from '@here/xyz-maps-editor';


const initTest = async (autoConnect?: boolean) => {
    const linkLayer = new TileLayer({
        name: 'linkLayer2',
        min: 14, max: 20,
        provider: new TestLocalProvider({
            editable: true,
            id: 'autoConnectProvider2',
            enforceRandomFeatureId: false
        })
    });

    const display = new Map(document.getElementById('map'), {
        center: {longitude: 77.47053701721183, latitude: 13.211750283939665},
        zoomlevel: 18,
        layers: [linkLayer]
    });

    const editor = new Editor(display, <any>{
        autoConnect: !!autoConnect,
        layers: [linkLayer]
    });
    await waitForEditorReady(editor);

    // horizontal link at y=300
    const link1 = editor.addFeature(new features.Navlink('ac_link1', [
        {x: 100, y: 300},
        {x: 400, y: 300}
    ], {featureClass: 'NAVLINK'}), linkLayer);

    // vertical link ending at y=200 (above link1)
    const link2 = editor.addFeature(new features.Navlink('ac_link2', [
        {x: 250, y: 100},
        {x: 250, y: 200}
    ], {featureClass: 'NAVLINK'}), linkLayer);


    return {display, editor, linkLayer, link1, link2};
};


describe('global autoConnect EditorOption', function() {
    const expect = chai.expect;

    describe('autoConnect: true (default)', function() {
        let editor: Editor;
        let display: Map;
        let link1;
        let link2;

        before(async function() {
            const test = await initTest(true);
            editor = test.editor;
            display = test.display;
            link1 = test.link1;
            link2 = test.link2;
        });

        after(function() {
            editor.destroy();
            display.destroy();
        });

        it('autoConnect defaults to true in behavior', function() {
            expect(link2.behavior('autoConnect')).to.be.true;
        });

        it('drag shape onto another link auto-connects by default', async function() {
            link2.select();

            // drag endpoint of link2 (y=200) down to y=300 where link1 is
            await drag(display.getContainer(), {x: 250, y: 200}, {x: 250, y: 300});

            // after autoConnect, link1 should have been split
            const searchResult = editor.search({id: 'ac_link1'});
            // link1 was split, so original id is gone
            expect(searchResult).to.have.lengthOf(0);
        });
    });

    describe('autoConnect: false (global option)', function() {
        let editor: Editor;
        let display: Map;
        let link1;
        let link2;

        before(async function() {
            const test = await initTest();
            editor = test.editor;
            display = test.display;
            link1 = test.link1;
            link2 = test.link2;
        });

        after(function() {
            editor.destroy();
            display.destroy();
        });

        it('autoConnect defaults to false in behavior when global option is false', function() {
            expect(link2.behavior('autoConnect')).to.be.false;
        });

        it('drag shape onto another link does NOT auto-connect when global is false', async function() {
            link2.select();

            // drag endpoint of link2 (y=200) down to y=300 where link1 is
            await drag(display.getContainer(), {x: 250, y: 200}, {x: 250, y: 300});

            // link1 should NOT have been split (still exists)
            const searchResult = editor.search({id: 'ac_link1'});
            expect(searchResult).to.have.lengthOf(1);

            // shape should be at the dragged position but NOT connected
            const shape = <NavlinkShape>(await editorClick(editor, 250, 300)).target;
            expect(shape).to.not.be.undefined;
            expect(shape.class).to.equal('NAVLINK_SHAPE');

            const connectedLinks = shape.getConnectedLinks();
            expect(connectedLinks).to.have.lengthOf(0);
        });

        it('per-feature override: behavior autoConnect=true overrides global false', async function() {
            // undo previous drag
            editor.undo();
            link2 = editor.search({id: 'ac_link2'})[0];
            link1 = editor.search({id: 'ac_link1'})[0];

            // override per-feature
            link2.behavior({autoConnect: true});
            expect(link2.behavior('autoConnect')).to.be.true;

            link2.select();

            // drag endpoint of link2 (y=200) down to y=300 where link1 is
            await drag(display.getContainer(), {x: 250, y: 200}, {x: 250, y: 300});

            // link1 should have been split (autoConnect was enabled per-feature)
            const searchResult = editor.search({id: 'ac_link1'});
            expect(searchResult).to.have.lengthOf(0);
        });
    });

    describe('autoConnect: true with per-feature override to false', function() {
        let editor: Editor;
        let display: Map;
        let link1;
        let link2;

        before(async function() {
            const test = await initTest(true);
            editor = test.editor;
            display = test.display;
            link1 = test.link1;
            link2 = test.link2;
        });

        after(function() {
            editor.destroy();
            display.destroy();
        });

        it('per-feature behavior false prevents autoConnect even with global true', async function() {
            link2.behavior({autoConnect: false});
            expect(link2.behavior('autoConnect')).to.be.false;

            link2.select();

            // drag endpoint of link2 (y=200) down to y=300 where link1 is
            await drag(display.getContainer(), {x: 250, y: 200}, {x: 250, y: 300});

            // link1 should NOT have been split
            const searchResult = editor.search({id: 'ac_link1'});
            expect(searchResult).to.have.lengthOf(1);

            const connectedLinks = link2.getConnectedLinks(1);
            expect(connectedLinks).to.have.lengthOf(0);
        });
    });
});

