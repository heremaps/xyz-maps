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
import {waitForEditorReady} from 'editorUtils';
import {mousemove} from 'triggerEvents';
import {Editor} from '@here/xyz-maps-editor';
import {Map} from '@here/xyz-maps-display';
import chaiAlmost from 'chai-almost';
import dataset from './marker_spec.json';

describe('Basic Marker tests', () => {
    const expect = chai.expect;

    let editor;
    let display;
    let preparedData;
    let marker;
    let mapContainer;

    before(async () => {
        chai.use(chaiAlmost());
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 73.29398409, latitude: 19.27905288},
            zoomlevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {layers: preparedData.getLayers()});

        await waitForEditorReady(editor);

        mapContainer = display.getContainer();

        marker = preparedData.getFeature('markerLayer', 'MyMarker');
    });

    after(async () => {
        editor.destroy();
        display.destroy();

        await preparedData.clear();
    });

    it('test default editStates', async () => {
        expect(marker.editState('selected')).to.be.false;
        expect(marker.editState('hovered')).to.be.false;
    });

    it('test hovered editStates', async () => {
        await mousemove(mapContainer, {x: 380, y: 300}, {x: 400, y: 300});
        expect(marker.editState('selected')).to.be.false;
        expect(marker.editState('hovered')).to.be.true;
    });

    it('test selected editStates', async () => {
        marker.select();
        expect(marker.editState('selected')).to.be.true;
        expect(marker.editState('hovered')).to.be.true;
    });

    it('unhover and validate editStates', async () => {
        await mousemove(mapContainer, {x: 380, y: 300}, {x: 400, y: 280});
        expect(marker.editState('selected')).to.be.true;
        expect(marker.editState('hovered')).to.be.false;
    });

    it('unselect and validate editStates', async () => {
        marker.unselect();
        expect(marker.editState('selected')).to.be.false;
        expect(marker.editState('hovered')).to.be.false;
    });

    it('get correct geo coordinates', async () => {
        expect(marker.coord()).to.deep.almost([73.29398409, 19.27905288, 0]);
    });

    it('update feature and validate editState', async () => {
        marker.prop('test', 'test');
        expect(marker.editState('modified')).to.be.greaterThan(0);
    });

    it('remove feature and validate editState', async () => {
        marker.remove();
        expect(marker.editState('removed')).to.be.greaterThan(0);
    });
});
