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
import {waitForEditorReady, editorClick, submit} from 'editorUtils';
import {Map} from '@here/xyz-maps-display';
import {Editor} from '@here/xyz-maps-editor';
// @ts-ignore @deprecated
import {features} from '@here/xyz-maps-editor';
import chaiAlmost from 'chai-almost';
import dataset from './link_split_spec.json';
import {Navlink, NavlinkShape} from '@here/xyz-maps-editor';
import {drag} from 'triggerEvents';

describe('link splitting and set its properties correctly', function() {
    const expect = chai.expect;

    let editor;
    let display;
    let preparedData;
    let linkLayer;

    before(async function() {
        chai.use(chaiAlmost());
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 77.47053701721183, latitude: 13.211750283939665},
            zoomlevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });

        await waitForEditorReady(editor);
        linkLayer = preparedData.getLayers('linkLayer');
    });

    after(async function() {
        editor.destroy();
        display.destroy();
        await preparedData.clear();
    });

    it('add link object and split it, validate address property', async function() {
        let lnk1 = new features.Navlink([{x: 100, y: 100}, {x: 100, y: 200}, {
            x: 200,
            y: 200
        }], {'featureClass': 'NAVLINK', 'type': 'residential', 'name': 'test street'});
        let link1 = editor.addFeature(lnk1, linkLayer);

        link1.select();
        let shape = <NavlinkShape>(await editorClick(editor, 100, 200)).target;
        let splitLinks = shape.splitLink();

        expect(splitLinks[0].prop()).to.deep.include({
            'type': 'residential',
            'name': 'test street',
            'originLink': link1.id,
            'parentLink': link1.id
        });
        expect(splitLinks[1].prop()).to.deep.include({
            'type': 'residential',
            'name': 'test street',
            'originLink': link1.id,
            'parentLink': link1.id
        });
        expect(link1.prop('splittedInto')).to.deep.equal([splitLinks[0].id, splitLinks[1].id]);
        expect(link1.prop('splitted')).to.deep.equal('HOOK');
        expect(link1.prop('estate')).to.be.equal('REMOVED');
    });

    // split turnRestrition
    it('split link object and validate speedlimit properties', async function() {
        let lnk2 = new features.Navlink([{x: 100, y: 100}, {x: 100, y: 200}, {x: 200, y: 200}], {
            'featureClass': 'NAVLINK',
            'type': 'primary',
            'turnRestrition': {start: ['abc'], end: 'efg'}
        });

        let link2 = editor.addFeature(lnk2, linkLayer);

        link2.select();
        let shape = <NavlinkShape>(await editorClick(editor, 100, 200)).target;
        let splitLinks = shape.splitLink();

        expect(splitLinks[0].prop().turnRestrition).to.deep.equal({start: ['abc'], end: 'efg'});
        expect(splitLinks[0].coord()).to.deep.almost([
            [77.468927692, 13.212794768, 0],
            [77.468927692, 13.212272527, 0]]
        );

        expect(splitLinks[1].prop().turnRestrition).to.deep.equal({start: ['abc'], end: 'efg'});
        expect(splitLinks[1].coord()).to.deep.almost([
            [77.468927692, 13.212272527, 0],
            [77.469464134, 13.212272527, 0]]
        );
    });

    // origin link
    it('get link to split and validate origin link properties', async function() {
        let lnk = new features.Navlink([{x: 100, y: 100}, {x: 100, y: 200}, {x: 200, y: 200}], {
            featureClass: 'NAVLINK',
            originLink: 'testOrigin'
        });
        let link = editor.addFeature(lnk, linkLayer);

        let idMap;

        await waitForEditorReady(editor, async () => {
            idMap = await submit(editor);
        });

        let linkId = idMap.permanentIDMap[link.getProvider().id][link.id];

        link = editor.getFeature(linkId, linkLayer);
        link.select();

        let shape = <NavlinkShape>(await editorClick(editor, 100, 200)).target;
        let splitLinks = shape.splitLink();

        expect(splitLinks[0].prop('originLink')).to.equal('testOrigin');
        expect(splitLinks[0].prop('parentLink')).to.equal(link.id);
        expect(splitLinks[1].prop('originLink')).to.equal('testOrigin');
        expect(splitLinks[1].prop('parentLink')).to.equal(link.id);
    });


    // parent link
    it('add link to split and set its attribute: originLink, validate parent link properties', async function() {
        let lnk3 = new features.Navlink([{x: 100, y: 100}, {x: 300, y: 200}, {
            x: 400,
            y: 200
        }], {featureClass: 'NAVLINK'});

        let link3 = editor.addFeature(lnk3, linkLayer);
        link3.prop({originLink: -8092793});
        expect(link3.prop()).to.deep.include({originLink: -8092793});

        let idMap;

        await waitForEditorReady(editor, async () => {
            idMap = await submit(editor);
        });

        let linkId = idMap.permanentIDMap[link3.getProvider().id][link3.id];

        lnk3 = editor.getFeature(linkId, linkLayer);
        lnk3.select();

        let shape = <NavlinkShape>(await editorClick(editor, 300, 200)).target;
        let splitLinks = shape.splitLink();

        expect(splitLinks[0].prop('parentLink')).to.equal(lnk3.id);
        expect(splitLinks[1].prop('parentLink')).to.equal(lnk3.id);
    });


    // origin and parent link
    it('get link to split and validate origin link properties', async function() {
        let lnk = new features.Navlink([{x: 100, y: 100}, {x: 100, y: 200}, {x: 200, y: 200}], {
            featureClass: 'NAVLINK',
            originLink: 'testOrigin',
            parentLink: 'testParent'
        });
        let link = editor.addFeature(lnk, linkLayer);

        let idMap;

        await waitForEditorReady(editor, async () => {
            idMap = await submit(editor);
        });

        let linkId = idMap.permanentIDMap[link.getProvider().id][link.id];

        link = editor.getFeature(linkId, linkLayer);
        link.select();

        let shape = <NavlinkShape>(await editorClick(editor, 100, 200)).target;
        let splitLinks = shape.splitLink();

        expect(splitLinks[0].prop('originLink')).to.equal('testOrigin');
        expect(splitLinks[0].prop('parentLink')).to.equal(link.id);
        expect(splitLinks[1].prop('originLink')).to.equal('testOrigin');
        expect(splitLinks[1].prop('parentLink')).to.equal(link.id);
    });


    it('split 3d Navlink geometries in forced 2d mode and validate intersection altitude', async ()=> {
        let link = editor.addFeature(new features.Navlink([{x: 100, y: 100, z: 100}, {x: 100, y: 200, z: 200}, {x: 200, y: 200, z: 300}], {
            featureClass: 'NAVLINK'
        }), linkLayer);

        let link2 = editor.addFeature(new features.Navlink([{x: 300, y: 300, z: 400}, {x: 500, y: 500, z: 500}], {
            featureClass: 'NAVLINK'
        }), linkLayer);

        link.select();

        await drag(display.getContainer(), {x: 200, y: 200}, {x: 400, y: 400});

        expect(link.coord()).to.be.deep.almost([
            [77.468927698, 13.212794768, 100],
            [77.468927698, 13.212272527, 200],
            [77.470537021, 13.211228043, 449.999953]
        ]);

        const child1 = <Navlink>(await editorClick(editor, 350, 350)).target;
        expect(child1.coord()).to.deep.almost([
            [77.47000058, 13.211750285, 400],
            [77.470537021, 13.211228043, 449.999953]
        ]);

        const child2 = <Navlink>(await editorClick(editor, 450, 450)).target;
        expect(child2.coord()).to.deep.almost([
            [77.470537021, 13.211228043, 449.999953],
            [77.471073462, 13.210705799, 500]
        ]);
    });
});
