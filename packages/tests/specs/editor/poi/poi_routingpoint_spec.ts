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
import {waitForEditorReady, editorClick} from 'editorUtils';
import {drag, click} from 'triggerEvents';
import {Map} from '@here/xyz-maps-display';
import {Editor, NavlinkShape} from '@here/xyz-maps-editor';
import chaiAlmost from 'chai-almost';
import dataset from './poi_routingpoint_spec.json';

describe('set POI routing point', function() {
    const expect = chai.expect;
    let editor;
    let display;
    let preparedData;
    let mapContainer;
    let poi;
    let link;

    before(async function() {
        chai.use(chaiAlmost(1e-4));
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 77.21454522937796, latitude: 12.975487274218025},
            zoomlevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });
        await waitForEditorReady(editor);
        mapContainer = display.getContainer();
        link = preparedData.getFeature('linkLayer', -189176);
        poi = preparedData.getFeature('placeLayer', -29535);
    });

    after(async function() {
        editor.destroy();
        display.destroy();
        await preparedData.clear();
    });

    it('validate routing point of poi is not created and create it', function() {
        expect(poi.prop().routingPoint).to.equal(undefined);

        poi.createRoutingPoint();

        expect(poi.prop('routingPoint')).to.deep.almost([77.21294, 12.97549, 0]);
        expect(poi.getLink().id).to.equal(link.id);
    });


    it('click and drag routingPoint of poi, validate routing point of another poi not created and create it', async function() {
        await click(mapContainer, 180, 300);
        await drag(mapContainer, {x: 100, y: 300}, {x: 100, y: 400});

        poi.createRoutingPoint();

        expect(poi.prop('routingPoint')).to.deep.almost([77.21294, 12.97497, 0]);
        expect(poi.getLink().id).to.equal(link.id);
    });

    it('split link, validate poi connects to split link', async function() {
        link.select();

        let shape = <NavlinkShape>(await editorClick(editor, 100, 300)).target;

        let splitLinks = shape.splitLink();

        expect(poi.prop('routingPoint')).to.deep.almost([77.21294, 12.97497, 0]);
        expect(poi.getLink().id).to.equal(splitLinks[1].id);
    });


    it('validate routing point is removed', function() {
        poi.removeRoutingPoint();

        expect(poi.prop().routingPoint).to.equal(null);
    });
});
