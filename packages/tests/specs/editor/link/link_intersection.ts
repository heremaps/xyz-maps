/*
 * Copyright (C) 2019-2025 HERE Europe B.V.
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

import {waitForEditorReady, editorClick, submit} from 'editorUtils';
import {TileLayer} from '@here/xyz-maps-core';
import {TestLocalProvider} from 'TestProviders';
import {Map} from '@here/xyz-maps-display';
// @ts-ignore @deprecated
import {Editor, features, Navlink, NavlinkShape} from '@here/xyz-maps-editor';
import chaiAlmost from 'chai-almost';


const expect = chai.expect;
let editor;
let display;
const runIntersectionTests = (customProviderOptions = {}) => {
    let linkLayer;
    let link1;
    let link2;

    before(async function() {
        chai.use(chaiAlmost());

        linkLayer = new TileLayer({
            name: 'linkLayer',
            min: 14, max: 20,
            provider: new TestLocalProvider({
                editable: true,
                id: 'linkProvider',
                enforceRandomFeatureId: false,
                ...customProviderOptions
            })
        });


        display = new Map(document.getElementById('map'), {
            center: {longitude: 77.47053701721183, latitude: 13.211750283939665},
            zoomlevel: 18,
            layers: [linkLayer]
        });
        editor = new Editor(display, {
            layers: [linkLayer]
        });


        await waitForEditorReady(editor);
        link1 = editor.addFeature(new features.Navlink('Link1', [{x: 100, y: 100}, {x: 200, y: 200}], {
            featureClass: 'NAVLINK',
            intersection: {
                endNode: {link: 'Link2', index: 0}
            }
        }), linkLayer);

        link2 = editor.addFeature(new features.Navlink('Link2', [{x: 200, y: 200}, {x: 300, y: 100}], {
            featureClass: 'NAVLINK',
            intersection: {
                startNode: {link: 'Link1', index: 1}
            }
        }), linkLayer);
    });

    it('link1: validate simple intersection', async function() {
        let connectedLinks1Start = link1.getConnectedLinks(0);
        let connectedLinks1End = link1.getConnectedLinks(1);

        expect(connectedLinks1Start).to.have.lengthOf(0);
        expect(connectedLinks1End).to.have.lengthOf(1);
        expect(connectedLinks1End[0].id).to.equal(link2.id);
    });


    it('link2: validate simple intersection', async function() {
        let connectedLinks2Start = link2.getConnectedLinks(0);
        let connectedLinks2End = link2.getConnectedLinks(1);

        expect(connectedLinks2Start).to.have.lengthOf(1);
        expect(connectedLinks2End).to.have.lengthOf(0);
        expect(connectedLinks2Start[0].id).to.equal(link1.id);
    });

    it('clear intersection - coordinates', async function() {
        let point = display.pixelToGeo({x: 150, y: 200});

        link1.coord([link1.coord()[0], [point.longitude, point.latitude]]);

        expect(link1.getConnectedLinks(0)).to.have.lengthOf(0);
        expect(link1.getConnectedLinks(1)).to.have.lengthOf(0);

        expect(link2.getConnectedLinks(0)).to.have.lengthOf(0);
        expect(link2.getConnectedLinks(1)).to.have.lengthOf(0);
    });

    it('recreate intersection', async () => {
        let point = display.pixelToGeo({x: 200, y: 200});
        link1.coord([link1.coord()[0], [point.longitude, point.latitude]]);

        const connectedLinks1Start = link1.getConnectedLinks(0);
        const connectedLinks1End = link1.getConnectedLinks(1);

        expect(connectedLinks1Start).to.have.lengthOf(0);
        expect(connectedLinks1End).to.have.lengthOf(1);
        expect(connectedLinks1End[0].id).to.equal(link2.id);

        const connectedLinks2Start = link2.getConnectedLinks(0);
        const connectedLinks2End = link2.getConnectedLinks(1);

        expect(connectedLinks2Start).to.have.lengthOf(1);
        expect(connectedLinks2End).to.have.lengthOf(0);
        expect(connectedLinks2Start[0].id).to.equal(link1.id);
    });

    it('clear intersection - disconnect', async () => {
        link1.select();
        const node = <NavlinkShape>(await editorClick(editor, 200, 200)).target;

        node.disconnect();

        expect(link1.getConnectedLinks(0)).to.have.lengthOf(0);
        expect(link1.getConnectedLinks(1)).to.have.lengthOf(0);

        expect(link2.getConnectedLinks(0)).to.have.lengthOf(0);
        expect(link2.getConnectedLinks(1)).to.have.lengthOf(0);
    });

    return {linkLayer, link1, link2};
};


describe('link intersections - default mode', () => {
    runIntersectionTests({readConnectedLinks: undefined});

    after(async function() {
        editor.destroy();
        display.destroy();
    });
});

describe('link intersections - custom mode', () => {
    let readConnectedLinksCalls = 0;

    runIntersectionTests({
        readConnectedLinks(link: Navlink, index: number) {
            readConnectedLinksCalls++;
            const connected = link.properties.intersection?.[index ? 'endNode' : 'startNode'];
            if (connected) {
                return Array.isArray(connected) ? connected : [connected];
            }
        }
        // writeConnectedLinks(link: Navlink, index: number, connectedLinks: {link: number|string, index: number}[]) {
        //     const propIntersection = link.properties.intersection ||= {};
        //     propIntersection[index ? 'endNode' : 'startNode'] = connectedLinks;
        // }
    });

    it('validate custom reader usage', async () => {
        expect(readConnectedLinksCalls).to.be.greaterThan(0);
    });

    it('validate unknown/invalid links are ignored', async () => {
        const [link1] = editor.search({id: 'Link1'}) as Navlink[];
        const [link2] = editor.search({id: 'Link2'}) as Navlink[];

        let point = display.pixelToGeo({x: 200, y: 200});
        link1.coord([link1.coord()[0], [point.longitude, point.latitude]]);

        link1.prop('intersection', {
            endNode: [{link: 'Link2', index: 0}, {link: 'UnknownLink', index: 0}]
        });

        let connectedLinks1Start = link1.getConnectedLinks(0);
        let connectedLinks1End = link1.getConnectedLinks(1);

        expect(connectedLinks1Start).to.have.lengthOf(0);
        expect(connectedLinks1End).to.have.lengthOf(1);
        expect(connectedLinks1End[0].id).to.equal(link2.id);
    });

    after(async () => {
        editor.destroy();
        display.destroy();
    });
});

