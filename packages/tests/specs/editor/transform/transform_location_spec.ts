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
import {drag} from 'triggerEvents';
import {Map} from '@here/xyz-maps-display';
import {Editor} from '@here/xyz-maps-editor';
import dataset from './transform_location_spec.json';
import chaiAlmost from 'chai-almost';

describe('transform for poi and point address', () => {
    const expect = chai.expect;

    let editor;
    let display;
    let preparedData;
    let mapContainer;
    let poi;
    let address;
    let container;

    before(async () => {
        chai.use(chaiAlmost());
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 76.03547451898947, latitude: 13.709170873282702},
            zoomlevel: 19,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });

        await waitForEditorReady(editor);
        mapContainer = display.getContainer();

        poi = preparedData.getFeature('placeLayer', '-29538');
        address = preparedData.getFeature('paLayer', '-48036');

        container = editor.createFeatureContainer();
        container.push(poi, address);


        expect(poi.coord()).to.deep.almost([76.035206298, 13.709301163, 0]);
        expect(address.coord()).to.deep.almost([76.035072188, 13.709170873, 0]);
    });

    after(async () => {
        editor.destroy();
        display.destroy();
        await preparedData.clear();
    });

    it('transform right boarder', async () => {
        container.transform();


        // console.log(JSON.stringify(area.coord()));
        await drag(mapContainer, {x: 313, y: 250}, {x: 330, y: 250});


        // preparedData.getLayers('paLayer').addFeature({
        //     'type': 'Feature',
        //     'properties': {},
        //     'geometry': {
        //         'type': 'Point',
        //         'coordinates': ((x,y)=>[
        //             display.pixelToGeo(x,y).longitude,
        //             display.pixelToGeo(x,y).latitude
        //         ])(155,195)
        //     }
        // });console.log(JSON.stringify(link.coord()));
        //         console.log(JSON.stringify(address.coord()));

        // preparedData.getLayers('placeLayer').addFeature({
        //     'type': 'Feature',
        //     'properties': {},
        //     'geometry': {
        //         'type': 'Point',
        //         'coordinates': [76.035246764, 13.709301163, 0]
        //     }
        // }, [{zIndex: 9, type: 'Circle', fill: 'blue', radius: 4, opacity: .5}]);
        //
        // preparedData.getLayers('placeLayer').addFeature({
        //     'type': 'Feature',
        //     'properties': {},
        //     'geometry': {
        //         'type': 'Point',
        //         'coordinates': [76.035072188, 13.709170873, 0]
        //     }
        // }, [{zIndex: 9, type: 'Circle', fill: 'blue', radius: 4, opacity: .5}]);

        expect(poi.coord()).to.deep.almost([76.035241467, 13.709301163, 0]);
        expect(address.coord()).to.deep.almost([76.035072188, 13.709170873, 0]);
    });

    it('transform left boarder', async () => {
        container.transform();

        await drag(mapContainer, {x: 235, y: 250}, {x: 210, y: 250});

        expect(poi.coord()).to.deep.almost([76.035241467, 13.709301163, 0]);
        expect(address.coord()).to.deep.almost([76.035008515, 13.709170873, 0]);
    });


    it('transform top boarder', async () => {
        container.transform();

        await drag(mapContainer, {x: 270, y: 233}, {x: 270, y: 200});

        expect(poi.coord()).to.deep.almost([76.035241467, 13.709388819, 0]);
        expect(address.coord()).to.deep.almost([76.035008515, 13.709170873, 0]);
    });

    it('transform bottom boarder', async () => {
        container.transform();

        await drag(mapContainer, {x: 270, y: 315}, {x: 270, y: 280});

        expect(poi.coord()).to.deep.almost([76.035241467, 13.709388819, 0]);
        expect(address.coord()).to.deep.almost([76.035008515, 13.709257493, 0]);
    });

    it('move transformer', async () => {
        container.transform();

        await drag(mapContainer, {x: 270, y: 240}, {x: 300, y: 280});

        expect(poi.coord()).to.deep.almost([76.035321933, 13.709284587, 0]);
        expect(address.coord()).to.deep.almost([76.035088981, 13.709153261, 0]);
    });

    it('rotate transformer', async () => {
        container.transform();

        await drag(mapContainer, {x: 360, y: 320}, {x: 300, y: 330});

        expect(poi.coord()).to.deep.almost([76.035325452, 13.709159544, 0]);
        expect(address.coord()).to.deep.almost([76.035085462, 13.709278304, 0]);
    });

    xit('pan map inside container', async () => {
        // expect transformer not to transform when dragging inside transformer
        container.transform();

        await drag(mapContainer, {x: 330, y: 270}, {x: 340, y: 300});

        expect(poi.coord()).to.deep.almost([76.035325452, 13.709159544, 0]);
        expect(address.coord()).to.deep.almost([76.035085462, 13.709278304, 0]);
    });
});
