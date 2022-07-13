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
import dataset from './address_get_functions_spec.json';

describe('Address get functions', function() {
    const expect = chai.expect;

    var editor;
    var display;
    var preparedData;
    var link;
    var address;
    var mapContainer;

    before(async function() {
        chai.use(chaiAlmost());
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 73.26398409, latitude: 19.20905288},
            zoomlevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {layers: preparedData.getLayers()});

        await waitForEditorReady(editor);

        mapContainer = display.getContainer();

        link = preparedData.getFeature('linkLayer', -188821);
        address = preparedData.getFeature('paLayer', -47935);
    });

    after(async function() {
        editor.destroy();
        display.destroy();

        await preparedData.clear();
    });


    it('get editstates', async function() {
        expect(address.editState('selected')).to.be.false;
        expect(address.editState('hovered')).to.be.false;

        // hover address
        await mousemove(mapContainer, {x: 180, y: 100}, {x: 200, y: 100});
        expect(address.editState('selected')).to.be.false;
        expect(address.editState('hovered')).to.be.true;

        // select address
        address.select();
        expect(address.editState('selected')).to.be.true;
        expect(address.editState('hovered')).to.be.true;

        // leave address
        await mousemove(mapContainer, {x: 180, y: 100}, {x: 200, y: 80});
        expect(address.editState('selected')).to.be.true;
        expect(address.editState('hovered')).to.be.false;

        // unselect address
        address.unselect();
        expect(address.editState('selected')).to.be.false;
        expect(address.editState('hovered')).to.be.false;
    });

    it('get correct geoCoordinates, pixel coordinate', async function() {
        expect(address.coord()).to.deep.almost([73.262911206, 19.210066027, 0]);
        expect(address.prop()).to.deep.include({
            'routingLink': link.id + '',
            'routingPoint': [73.26291, 19.20981, 0],
            'housenumber': '180a',
            'roadname': 'test street'
        });
        expect(address.getLink()).to.deep.include({
            'id': link.id
        });
    });
});
