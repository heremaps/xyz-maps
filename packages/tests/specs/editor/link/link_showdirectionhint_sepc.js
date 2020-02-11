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
import {Editor} from '@here/xyz-maps-editor';
import chaiAlmost from 'chai-almost';
import dataset from './link_showdirectionhint_spec.json';

describe('show link direction hint', function() {
    const expect = chai.expect;

    let editor;
    let display;
    let preparedData;

    let shape;
    let hint;
    let link1;
    let link2;
    let link3;

    before(async function() {
        chai.use(chaiAlmost(1e-7));
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 80.407689, latitude: 19.640012},
            zoomLevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });

        await editorTests.waitForEditorReady(editor);

        link1 = preparedData.getFeature('linkLayer', -189087);
        link2 = preparedData.getFeature('linkLayer', -189088);
        link3 = preparedData.getFeature('linkLayer', -189089);
    });

    after(async function() {
        editor.destroy();
        display.destroy();
        await preparedData.clear();
    });

    it('validate direction hint with shapes', async function() {
        let features = editor.getOverlay().search({rect: display.getViewBounds()});
        expect(features).to.be.empty;

        link1.showDirectionHint('BOTH');
        link2.showDirectionHint('START_TO_END');
        link3.showDirectionHint('END_TO_START');

        features = editor.getOverlay().search({rect: display.getViewBounds()});
        expect(features).to.be.lengthOf(9);

        // A and B shapes on link1
        shape = editor.getOverlay().search({point: {longitude: 80.406079675, latitude: 19.640517232}, radius: 5});
        expect(shape).to.be.lengthOf(1);
        expect(shape[0].properties).to.deep.include({type: 'NAVLINK_DIRECTION_HINT_A'});

        shape = editor.getOverlay().search({point: {longitude: 80.407152558, latitude: 19.640517232}, radius: 5});
        expect(shape).to.be.lengthOf(1);
        expect(shape[0].properties).to.deep.include({type: 'NAVLINK_DIRECTION_HINT_B'});

        // A and B shapes on link2
        shape = editor.getOverlay().search({point: {longitude: 80.406079675, latitude: 19.640012}, radius: 5});
        expect(shape).to.be.lengthOf(1);
        expect(shape[0].properties).to.deep.include({type: 'NAVLINK_DIRECTION_HINT_A'});

        shape = editor.getOverlay().search({point: {longitude: 80.407152558, latitude: 19.640012}, radius: 5});
        expect(shape).to.be.lengthOf(1);
        expect(shape[0].properties).to.deep.include({type: 'NAVLINK_DIRECTION_HINT_B'});

        // A and B shapes on link3
        shape = editor.getOverlay().search({point: {longitude: 80.406079675, latitude: 19.639506766}, radius: 5});
        expect(shape).to.be.lengthOf(1);
        expect(shape[0].properties).to.deep.include({type: 'NAVLINK_DIRECTION_HINT_A'});

        shape = editor.getOverlay().search({point: {longitude: 80.407152558, latitude: 19.639506766}, radius: 5});
        expect(shape).to.be.lengthOf(1);
        expect(shape[0].properties).to.deep.include({type: 'NAVLINK_DIRECTION_HINT_B'});

        // direction hint on link1
        hint = editor.getOverlay().search({point: {longitude: 80.4066161165, latitude: 19.640517232}, radius: 5});
        expect(hint).to.be.lengthOf(1);
        expect(hint[0].properties).to.deep.include({type: 'NAVLINK_DIRECTION_HINT_2WAY'});
        expect(hint[0].properties.bearing).to.almost.equal(-0.0001803074);

        // direction hint on link2
        hint = editor.getOverlay().search({point: {longitude: 80.4066161165, latitude: 19.640012}, radius: 5});
        expect(hint).to.be.lengthOf(1);
        expect(hint[0].properties).to.deep.include({type: 'NAVLINK_DIRECTION_HINT_1WAY'});
        expect(hint[0].properties.bearing).to.almost.equal(-0.0001803031);

        // direction hin on link3
        hint = editor.getOverlay().search({point: {longitude: 80.4066161165, latitude: 19.639506766}, radius: 5});
        expect(hint).to.be.lengthOf(1);
        expect(hint[0].properties).to.deep.include({type: 'NAVLINK_DIRECTION_HINT_1WAY'});
        expect(hint[0].properties.bearing).to.almost.equal(179.999819701);
    });

    it('hide direction hint and validate', async function() {
        link1.showDirectionHint();
        link2.showDirectionHint();
        link3.showDirectionHint();

        let features = editor.getOverlay().search({rect: display.getViewBounds()});
        expect(features).to.be.empty;
    });

    it('validate direction hint without shapes', async function() {
        let features = editor.getOverlay().search({rect: display.getViewBounds()});
        expect(features).to.be.empty;

        link1.showDirectionHint('BOTH', true);
        link2.showDirectionHint('START_TO_END', true);
        link3.showDirectionHint('END_TO_START', true);

        // no shape on link1
        shape = editor.getOverlay().search({point: {longitude: 80.406079675, latitude: 19.640517232}, radius: 5});
        expect(shape).to.be.empty;

        shape = editor.getOverlay().search({point: {longitude: 80.407152558, latitude: 19.640517232}, radius: 5});
        expect(shape).to.be.empty;

        // no shape on link2
        shape = editor.getOverlay().search({point: {longitude: 80.406079675, latitude: 19.640012}, radius: 5});
        expect(shape).to.be.empty;

        shape = editor.getOverlay().search({point: {longitude: 80.407152558, latitude: 19.640012}, radius: 5});
        expect(shape).to.be.empty;

        // no shape on link3
        shape = editor.getOverlay().search({point: {longitude: 80.406079675, latitude: 19.639506766}, radius: 5});
        expect(shape).to.be.empty;

        shape = editor.getOverlay().search({point: {longitude: 80.407152558, latitude: 19.639506766}, radius: 5});
        expect(shape).to.be.empty;

        // direction hint on link1
        hint = editor.getOverlay().search({point: {longitude: 80.4066161165, latitude: 19.640517232}, radius: 5});
        expect(hint).to.be.lengthOf(1);
        expect(hint[0].properties).to.deep.include({type: 'NAVLINK_DIRECTION_HINT_2WAY'});
        expect(hint[0].properties.bearing).to.almost.equal(-0.0001803074);

        // direction hint on link2
        hint = editor.getOverlay().search({point: {longitude: 80.4066161165, latitude: 19.640012}, radius: 5});
        expect(hint).to.be.lengthOf(1);
        expect(hint[0].properties).to.deep.include({type: 'NAVLINK_DIRECTION_HINT_1WAY'});
        expect(hint[0].properties.bearing).to.almost.equal(-0.0001803031);

        // direction hin on link3
        hint = editor.getOverlay().search({point: {longitude: 80.4066161165, latitude: 19.639506766}, radius: 5});
        expect(hint).to.be.lengthOf(1);
        expect(hint[0].properties).to.deep.include({type: 'NAVLINK_DIRECTION_HINT_1WAY'});
        expect(hint[0].properties.bearing).to.almost.equal(179.999819701);
    });
});
