/*
 * Copyright (C) 2019-2021 HERE Europe B.V.
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
import {waitForEditorReady} from 'editorUtils';
import {drag} from 'triggerEvents';
import {Map} from '@here/xyz-maps-display';
import {Editor} from '@here/xyz-maps-editor';
import chaiAlmost from 'chai-almost';
import dataset from './rangeselector_snap_overlap_spec.json';

describe('range selector: snapping and overlapping', () => {
    const expect = chai.expect;
    let editor;
    let display;
    let preparedData;
    let mapContainer;
    let link;

    before(async function() {
        chai.use(chaiAlmost());
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: -122.283766, latitude: 37.818477},
            zoomlevel: 17,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });

        await waitForEditorReady(editor);
        mapContainer = display.getContainer();

        link = preparedData.getFeature('linkLayer', '1');
    });

    after(async () => {
        editor.destroy();
        display.destroy();
        await preparedData.clear();
    });

    it('validate default snap & overlap behavior', async () => {
        editor.getZoneSelector().add(link);
        editor.getZoneSelector().show({
            from: 0.1,
            to: 0.4,
            side: 'B'
        }, {
            from: 0.6,
            to: 0.9,
            side: 'B'
        });

        await drag(mapContainer, {x: 370, y: 343}, {x: 580, y: 352});

        let info = editor.getZoneSelector().info();
        expect(info[0]).to.deep.include({
            from: 0.1,
            to: 0.4,
            side: 'B'
        });

        expect(info[0].segments[0]).to.deep.include({
            from: 0.1,
            reversed: false,
            to: 0.7525
        });

        expect(info[1]).to.deep.include({
            from: 0.6,
            to: 0.9,
            side: 'B'
        });

        expect(info[1].segments[0]).to.deep.include({
            from: 0.6,
            reversed: false,
            to: 0.9
        });
    });

    it('enable snapping and validate', async () => {
        editor.getZoneSelector().add(link);
        editor.getZoneSelector().show({
            from: 0.1,
            to: 0.4,
            side: 'B',
            snap: true,
            snapTolerance: 2
        }, {
            from: 0.6,
            to: 0.9,
            side: 'B'
        });

        await drag(mapContainer, {x: 370, y: 343}, {x: 580, y: 352});

        let info = editor.getZoneSelector().info();
        expect(info[0]).to.deep.include({
            from: 0.1,
            to: 0.4,
            side: 'B'
        });

        expect(info[0].segments[0]).to.deep.include({
            from: 0.1,
            reversed: false,
            to: 0.7525
        });

        expect(info[1]).to.deep.include({
            from: 0.6,
            to: 0.9,
            side: 'B'
        });

        expect(info[1].segments[0]).to.deep.include({
            from: 0.7525,
            reversed: false,
            to: 0.9
        });
    });

    it('enable snapping different side only (no match)', async () => {
        editor.getZoneSelector().add(link);
        editor.getZoneSelector().show({
            from: 0.1,
            to: 0.4,
            side: 'B',
            snap: 'L',
            snapTolerance: 2
        }, {
            from: 0.6,
            to: 0.9,
            side: 'B'
        });

        await drag(mapContainer, {x: 370, y: 343}, {x: 580, y: 352});

        let info = editor.getZoneSelector().info();
        expect(info[0]).to.deep.include({
            from: 0.1,
            to: 0.4,
            side: 'B'
        });

        expect(info[0].segments[0]).to.deep.include({
            from: 0.1,
            reversed: false,
            to: 0.7525
        });

        expect(info[1]).to.deep.include({
            from: 0.6,
            to: 0.9,
            side: 'B'
        });

        expect(info[1].segments[0]).to.deep.include({
            from: 0.6,
            reversed: false,
            to: 0.9
        });
    });

    it('enable snapping different side only (match)', async () => {
        editor.getZoneSelector().add(link);
        editor.getZoneSelector().show({
            from: 0.1,
            to: 0.4,
            side: 'B',
            snap: 'L',
            snapTolerance: 2
        }, {
            from: 0.6,
            to: 0.9,
            side: 'L'
        });

        await drag(mapContainer, {x: 370, y: 343}, {x: 580, y: 352});

        let info = editor.getZoneSelector().info();
        expect(info[0]).to.deep.include({
            from: 0.1,
            to: 0.4,
            side: 'B'
        });

        expect(info[0].segments[0]).to.deep.include({
            from: 0.1,
            reversed: false,
            to: 0.7525
        });

        expect(info[1]).to.deep.include({
            from: 0.6,
            to: 0.9,
            side: 'L'
        });

        expect(info[1].segments[0]).to.deep.include({
            from: 0.7525,
            reversed: false,
            to: 0.9
        });
    });

    it('enable snapping multiple side only (no match)', async () => {
        editor.getZoneSelector().add(link);
        editor.getZoneSelector().show({
            from: 0.1,
            to: 0.4,
            side: 'B',
            snap: ['L', 'R'],
            snapTolerance: 2
        }, {
            from: 0.6,
            to: 0.9,
            side: 'B'
        });

        await drag(mapContainer, {x: 370, y: 343}, {x: 580, y: 352});

        let info = editor.getZoneSelector().info();
        expect(info[0]).to.deep.include({
            from: 0.1,
            to: 0.4,
            side: 'B'
        });

        expect(info[0].segments[0]).to.deep.include({
            from: 0.1,
            reversed: false,
            to: 0.7525
        });

        expect(info[1]).to.deep.include({
            from: 0.6,
            to: 0.9,
            side: 'B'
        });

        expect(info[1].segments[0]).to.deep.include({
            from: 0.6,
            reversed: false,
            to: 0.9
        });
    });

    it('enable snapping multiple side only (match)', async () => {
        editor.getZoneSelector().add(link);
        editor.getZoneSelector().show({
            from: 0.1,
            to: 0.4,
            side: 'B',
            snap: ['R', 'B', 'L'],
            snapTolerance: 2
        }, {
            from: 0.6,
            to: 0.9,
            side: 'L'
        });

        await drag(mapContainer, {x: 370, y: 343}, {x: 580, y: 352});

        let info = editor.getZoneSelector().info();
        expect(info[0]).to.deep.include({
            from: 0.1,
            to: 0.4,
            side: 'B'
        });

        expect(info[0].segments[0]).to.deep.include({
            from: 0.1,
            reversed: false,
            to: 0.7525
        });

        expect(info[1]).to.deep.include({
            from: 0.6,
            to: 0.9,
            side: 'L'
        });

        expect(info[1].segments[0]).to.deep.include({
            from: 0.7525,
            reversed: false,
            to: 0.9
        });
    });


    it('enable snapping out of tolerance ', async () => {
        editor.getZoneSelector().add(link);
        editor.getZoneSelector().show({
            from: 0.1,
            to: 0.4,
            side: 'B',
            snap: 'L',
            snapTolerance: 30
        }, {
            from: 0.6,
            to: 0.9,
            side: 'L'
        });

        await drag(mapContainer, {x: 370, y: 343}, {x: 420, y: 352});

        let info = editor.getZoneSelector().info();
        expect(info[0]).to.deep.include({
            from: 0.1,
            to: 0.4,
            side: 'B'
        });

        expect(info[0].segments[0]).to.deep.include({
            from: 0.1,
            reversed: false,
            to: 0.485833
        });

        expect(info[1]).to.deep.include({
            from: 0.6,
            to: 0.9,
            side: 'L'
        });

        expect(info[1].segments[0]).to.deep.include({
            from: 0.6,
            reversed: false,
            to: 0.9
        });
    });

    it('enable snapping in tolerance ', async () => {
        editor.getZoneSelector().add(link);
        editor.getZoneSelector().show({
            from: 0.1,
            to: 0.4,
            side: 'B',
            snap: 'L',
            snapTolerance: 30
        }, {
            from: 0.6,
            to: 0.9,
            side: 'L'
        });

        await drag(mapContainer, {x: 370, y: 343}, {x: 460, y: 352});

        let info = editor.getZoneSelector().info();
        expect(info[0]).to.deep.include({
            from: 0.1,
            to: 0.4,
            side: 'B'
        });

        expect(info[0].segments[0]).to.deep.include({
            from: 0.1,
            reversed: false,
            to: 0.5525
        });

        expect(info[1]).to.deep.include({
            from: 0.6,
            to: 0.9,
            side: 'L'
        });

        expect(info[1].segments[0]).to.deep.include({
            from: 0.5525,
            reversed: false,
            to: 0.9
        });
    });


    it('disable overlap', async () => {
        editor.getZoneSelector().add(link);
        editor.getZoneSelector().show({
            from: 0.1,
            to: 0.4,
            side: 'B',
            allowOverlap: false
        }, {
            from: 0.6,
            to: 0.9,
            side: 'B'
        });

        await drag(mapContainer, {x: 370, y: 343}, {x: 580, y: 352});

        let info = editor.getZoneSelector().info();
        expect(info[0]).to.deep.include({
            from: 0.1,
            to: 0.4,
            side: 'B'
        });

        expect(info[0].segments[0]).to.deep.include({
            from: 0.1,
            reversed: false,
            to: 0.6
        });

        expect(info[1]).to.deep.include({
            from: 0.6,
            to: 0.9,
            side: 'B'
        });

        expect(info[1].segments[0]).to.deep.include({
            from: 0.6,
            reversed: false,
            to: 0.9
        });
    });

    it('disable overlap side (no match)', async () => {
        editor.getZoneSelector().add(link);
        editor.getZoneSelector().show({
            from: 0.1,
            to: 0.4,
            side: 'B',
            allowOverlap: 'L'
        }, {
            from: 0.6,
            to: 0.9,
            side: 'B'
        });

        await drag(mapContainer, {x: 370, y: 343}, {x: 580, y: 352});

        let info = editor.getZoneSelector().info();
        expect(info[0]).to.deep.include({
            from: 0.1,
            to: 0.4,
            side: 'B'
        });

        expect(info[0].segments[0]).to.deep.include({
            from: 0.1,
            reversed: false,
            to: 0.6
        });

        expect(info[1]).to.deep.include({
            from: 0.6,
            to: 0.9,
            side: 'B'
        });

        expect(info[1].segments[0]).to.deep.include({
            from: 0.6,
            reversed: false,
            to: 0.9
        });
    });

    it('disable overlap multiple side (no match)', async () => {
        editor.getZoneSelector().add(link);
        editor.getZoneSelector().show({
            from: 0.1,
            to: 0.4,
            side: 'B',
            allowOverlap: ['L', 'R']
        }, {
            from: 0.6,
            to: 0.9,
            side: 'B'
        });

        await drag(mapContainer, {x: 370, y: 343}, {x: 580, y: 352});

        let info = editor.getZoneSelector().info();
        expect(info[0]).to.deep.include({
            from: 0.1,
            to: 0.4,
            side: 'B'
        });

        expect(info[0].segments[0]).to.deep.include({
            from: 0.1,
            reversed: false,
            to: 0.6
        });

        expect(info[1]).to.deep.include({
            from: 0.6,
            to: 0.9,
            side: 'B'
        });

        expect(info[1].segments[0]).to.deep.include({
            from: 0.6,
            reversed: false,
            to: 0.9
        });
    });

    it('allow overlap multiple side (match)', async () => {
        editor.getZoneSelector().add(link);
        editor.getZoneSelector().show({
            from: 0.1,
            to: 0.4,
            side: 'B',
            allowOverlap: ['L', 'R']
        }, {
            from: 0.6,
            to: 0.9,
            side: 'B'
        });

        await drag(mapContainer, {x: 370, y: 343}, {x: 580, y: 352});

        let info = editor.getZoneSelector().info();
        expect(info[0]).to.deep.include({
            from: 0.1,
            to: 0.4,
            side: 'B'
        });

        expect(info[0].segments[0]).to.deep.include({
            from: 0.1,
            reversed: false,
            to: 0.6
        });

        expect(info[1]).to.deep.include({
            from: 0.6,
            to: 0.9,
            side: 'B'
        });

        expect(info[1].segments[0]).to.deep.include({
            from: 0.6,
            reversed: false,
            to: 0.9
        });
    });

    it('allow overlap and enable snapping max "to" position', async () => {
        editor.getZoneSelector().add(link);
        editor.getZoneSelector().show({
            from: 0.1,
            to: 0.4,
            side: 'R',
            allowOverlap: true,
            snap: true,
            snapTolerance: 2
        }, {
            from: 0.6,
            to: 0.9,
            side: 'L'
        });

        await drag(mapContainer, {x: 370, y: 343}, {x: 800, y: 352});

        let info = editor.getZoneSelector().info();
        expect(info[0]).to.deep.include({
            from: 0.1,
            to: 0.4,
            side: 'R'
        });

        expect(info[0].segments[0]).to.deep.include({
            from: 0.1,
            reversed: false,
            to: 1.0
        });

        expect(info[1]).to.deep.include({
            from: 0.6,
            to: 0.9,
            side: 'L'
        });

        expect(info[1].segments[0]).to.deep.include({
            from: 0.9,
            reversed: false,
            to: 1.0
        });
    });


    it('allow overlap and enable snapping min "from" position', async () => {
        editor.getZoneSelector().add(link);
        editor.getZoneSelector().show({
            from: 0.1,
            to: 0.4,
            side: 'R'
        }, {
            from: 0.6,
            to: 0.9,
            side: 'L',
            allowOverlap: true,
            snap: true,
            snapTolerance: 2
        });

        await drag(mapContainer, {x: 490, y: 343}, {x: 90, y: 342});

        let info = editor.getZoneSelector().info();
        expect(info[0]).to.deep.include({
            from: 0.1,
            to: 0.4,
            side: 'R'
        });

        expect(info[0].segments[0]).to.deep.include({
            from: 0.0,
            reversed: false,
            to: .1
        });

        expect(info[1]).to.deep.include({
            from: 0.6,
            to: 0.9,
            side: 'L'
        });

        expect(info[1].segments[0]).to.deep.include({
            from: 0.0,
            reversed: false,
            to: 0.9
        });
    });
});
