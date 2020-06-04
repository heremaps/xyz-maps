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
import {prepare} from 'utils';
import {waitForEditorReady} from 'editorUtils';
import {mousemove} from 'triggerEvents';
import {Editor} from '@here/xyz-maps-editor';
import {Map} from '@here/xyz-maps-display';
import chaiAlmost from 'chai-almost';
import dataset from './poi_get_functions_spec.json';

describe('Place get functions', function() {
    const expect = chai.expect;

    var editor;
    var display;
    var preparedData;
    var place;
    var mapContainer;

    before(async function() {
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

        place = preparedData.getFeature('placeLayer', -48135);
    });

    after(async function() {
        editor.destroy();
        display.destroy();

        await preparedData.clear();
    });

    it('get editstates', async function() {
        expect(place.editState('selected')).to.be.false;
        expect(place.editState('hovered')).to.be.false;

        // hover place
        await mousemove(mapContainer, {x: 380, y: 300}, {x: 400, y: 300});
        expect(place.editState('selected')).to.be.false;
        expect(place.editState('hovered')).to.be.true;

        // select place
        place.select();
        expect(place.editState('selected')).to.be.true;
        expect(place.editState('hovered')).to.be.true;

        // leave place
        await mousemove(mapContainer, {x: 380, y: 300}, {x: 400, y: 280});
        expect(place.editState('selected')).to.be.true;
        expect(place.editState('hovered')).to.be.false;

        // unselect place
        place.unselect();
        expect(place.editState('selected')).to.be.false;
        expect(place.editState('hovered')).to.be.false;
    });

    it('get correct geoCoordinates, properties', async function() {
        expect(place.coord()).to.deep.almost([73.29398409, 19.27905288, 0]);
        expect(place.prop()).to.deep.include({
            routingPoint: [78.26291, 19.20981, 0],
            routingLink: '-178821',
            name: 'test hotel',
            type: 'hotel'
        });
    });
});
