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
import chaiAlmost from 'chai-almost';


describe('link connection candidates', function() {
    const expect = chai.expect;

    let editor;
    let display;
    let linkLayer;
    let link1; // horizontal link at y=200
    let link2; // vertical link crossing link1 + link3
    let link3; // horizontal link at y=200 (overlapping with link1)
    let mapContainer;

    before(async function() {
        chai.use(chaiAlmost());

        linkLayer = new TileLayer({
            name: 'linkLayer',
            min: 14, max: 20,
            provider: new TestLocalProvider({
                editable: true,
                id: 'linkProvider',
                enforceRandomFeatureId: false
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
        mapContainer = display.getContainer();

        // link1: horizontal line at y=200 (from x=100 to x=300)
        link1 = editor.addFeature(new features.Navlink('link1', [
            {x: 100, y: 200},
            {x: 300, y: 200}
        ], {featureClass: 'NAVLINK'}), linkLayer);

        // link3: horizontal line also at y=200 (overlapping with link1)
        link3 = editor.addFeature(new features.Navlink('link3', [
            {x: 100, y: 200},
            {x: 300, y: 200}
        ], {featureClass: 'NAVLINK'}), linkLayer);

        // link2: vertical line from y=100 to y=150 (not touching link1/link3 yet)
        link2 = editor.addFeature(new features.Navlink('link2', [
            {x: 200, y: 100},
            {x: 200, y: 150}
        ], {featureClass: 'NAVLINK'}), linkLayer);
    });

    after(async function() {
        editor.destroy();
        display.destroy();
    });

    it('getConnectionCandidates returns empty array when no links are nearby', function() {
        const candidates = link2.getConnectionCandidates(0);
        expect(candidates).to.be.an('array');
        expect(candidates).to.have.lengthOf(0);
    });

    it('autoConnect behavior defaults to true', function() {
        expect(link2.behavior('autoConnect')).to.be.true;
    });

    it('set autoConnect behavior to false', function() {
        link2.behavior({autoConnect: false});
        expect(link2.behavior('autoConnect')).to.be.false;
    });

    it('drag shape with autoConnect=false does not connect', async function() {
        link2.behavior({autoConnect: false});
        link2.select();

        // drag endpoint of link2 (y=150) down to y=200 where link1 and link3 are
        await drag(mapContainer, {x: 200, y: 150}, {x: 200, y: 200});

        // shape should be at the dragged position but NOT connected
        const shape = <NavlinkShape>(await editorClick(editor, 200, 200)).target;
        expect(shape).to.not.be.undefined;
        expect(shape.class).to.equal('NAVLINK_SHAPE');

        const connectedLinks = shape.getConnectedLinks();
        expect(connectedLinks).to.have.lengthOf(0);
    });

    it('getConnectionCandidates returns multiple candidates when overlapping links are nearby', function() {
        // link2 endpoint is now at the same position as link1 and link3
        const candidates = link2.getConnectionCandidates(1);
        expect(candidates).to.be.an('array');
        expect(candidates).to.have.lengthOf(2);

        const candidateIds = candidates.map((c) => c.link.id).sort();
        expect(candidateIds).to.include(link1.id);
        expect(candidateIds).to.include(link3.id);
    });

    it('candidates are sorted by distance', function() {
        const candidates = link2.getConnectionCandidates(1);
        for (let i = 1; i < candidates.length; i++) {
            expect(candidates[i].distance).to.be.at.least(candidates[i - 1].distance);
        }
    });

    it('candidate has correct properties', function() {
        const candidates = link2.getConnectionCandidates(1);
        const candidate = candidates[0];

        expect(candidate).to.have.property('link');
        expect(candidate).to.have.property('point');
        expect(candidate).to.have.property('distance');
        expect(candidate).to.have.property('segment');
        expect(candidate.link.class).to.equal('NAVLINK');
        expect(candidate.point).to.be.an('array');
        expect(candidate.distance).to.be.a('number');
        // link2 endpoint is on segment 0 of link1/link3 (midpoint of their geometry)
        expect(candidate.segment).to.equal(0);
    });

    it('candidates do not include own link', function() {
        const candidates = link2.getConnectionCandidates(1);
        for (const candidate of candidates) {
            expect(candidate.link.id).to.not.equal(link2.id);
        }
    });

    it('candidate.connect() establishes connection', function() {
        const candidates = link2.getConnectionCandidates(1);
        const chosenCandidate = candidates[0];
        const targetId = chosenCandidate.link.id;

        const result = chosenCandidate.connect();
        expect(result).to.not.be.null;
        expect(result).to.have.property('targetSplittedInto');
        expect(result.targetSplittedInto).to.have.lengthOf(2);
        // the split links should belong to the target
        expect(result.targetSplittedInto[0].id).to.not.equal(targetId);
    });

    it('undo connect and verify shape is unconnected again', function() {
        editor.undo();
        link2 = editor.search({id: 'link2'})[0];
        link1 = editor.search({id: 'link1'})[0];
        link3 = editor.search({id: 'link3'})[0];
        const candidates = link2.getConnectionCandidates(1);
        // after undo, should still see both candidates
        expect(candidates).to.have.lengthOf(2);
        const candidateIds = candidates.map((c) => c.link.id).sort();
        expect(candidateIds).to.include(link1.id);
        expect(candidateIds).to.include(link3.id);
    });

    it('NavlinkShape.getConnectionCandidates delegates correctly', async function() {
        // click on link2's start shape at (200,100) - only link2 has a shape here
        link2.select();
        const shape = <NavlinkShape>(await editorClick(editor, 200, 100)).target;
        expect(shape).to.not.be.undefined;
        expect(shape.class).to.equal('NAVLINK_SHAPE');

        // start node (index 0) is far from link1/link3 -> no candidates
        const candidatesStart = shape.getConnectionCandidates();
        expect(candidatesStart).to.be.an('array');
        expect(candidatesStart).to.have.lengthOf(0);

        // verify that NavlinkShape delegates to Navlink correctly
        const candidatesFromLink = link2.getConnectionCandidates(1);
        expect(candidatesFromLink).to.have.lengthOf(2);
    });

    it('set autoConnect back to true', function() {
        link2.behavior({autoConnect: true});
        expect(link2.behavior('autoConnect')).to.be.true;
    });

    it('set autoConnect via behavior(name, value) overload', function() {
        link2.behavior('autoConnect', false);
        expect(link2.behavior('autoConnect')).to.be.false;
        link2.behavior('autoConnect', true);
        expect(link2.behavior('autoConnect')).to.be.true;
    });
});


