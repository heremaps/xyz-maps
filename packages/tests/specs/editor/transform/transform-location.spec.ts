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
import {createEditorFixture} from 'editorUtils';
import {drag} from 'triggerEvents';
import {beforeEach, describe, expect, it} from 'vitest';
import dataset from './transform-location.json';

describe('Transform location', () => {
    let editor;
    let display;
    let preparedData;
    let mapContainer;
    let poi;
    let address;
    let container;

    beforeEach(async () => {
        ({preparedData, display, editor} = await createEditorFixture(dataset, {
            center: {longitude: 76.03547451898947, latitude: 13.709170873282702},
            zoomlevel: 19
        }));
        mapContainer = display.getContainer();

        poi = preparedData.getFeature('placeLayer', '-29538');
        address = preparedData.getFeature('paLayer', '-48036');

        container = editor.createFeatureContainer();
        container.push(poi, address);

        expect(poi.coord()).toEqualWithTolerance([76.035206298, 13.709301163, 0], 1e-6);
        expect(address.coord()).toEqualWithTolerance([76.035072188, 13.709170873, 0], 1e-6);
    });

    it('transforms locations and preserves them when panning outside the handles', async () => {
        // transform right boarder
        {
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

            expect(poi.coord()).toEqualWithTolerance([76.035251896, 13.709301163, 0], 1e-6);
            expect(address.coord()).toEqualWithTolerance([76.035072188, 13.709170873, 0], 1e-6);
        }

        // transform left boarder
        {
            container.transform();

            await drag(mapContainer, {x: 235, y: 250}, {x: 210, y: 250});

            expect(poi.coord()).toEqualWithTolerance([76.035251896, 13.709301163, 0], 1e-6);
            expect(address.coord()).toEqualWithTolerance([76.035005132, 13.709170873, 0], 1e-6);
        }

        // transform top boarder
        {
            container.transform();

            await drag(mapContainer, {x: 270, y: 233}, {x: 270, y: 200});

            expect(poi.coord()).toEqualWithTolerance([76.035251896, 13.709387155, 0], 1e-6);
            expect(address.coord()).toEqualWithTolerance([76.035005132, 13.709170873, 0], 1e-6);
        }

        // transform bottom boarder
        {
            container.transform();

            await drag(mapContainer, {x: 270, y: 315}, {x: 270, y: 280});

            expect(poi.coord()).toEqualWithTolerance([76.035251896, 13.709387155, 0], 1e-6);
            expect(address.coord()).toEqualWithTolerance([76.035005132, 13.709262076, 0], 1e-6);
        }

        // move transformer
        {
            container.transform();

            await drag(mapContainer, {x: 270, y: 240}, {x: 300, y: 280});

            expect(poi.coord()).toEqualWithTolerance([76.035332364, 13.709282931, 0], 1e-6);
            expect(address.coord()).toEqualWithTolerance([76.0350856, 13.709157852, 0], 1e-6);
        }

        // rotate transformer
        {
            container.transform();

            await drag(mapContainer, {x: 360, y: 320}, {x: 300, y: 330});

            expect(poi.coord()).toEqualWithTolerance([76.03532932, 13.709152485, 0], 1e-6);
            expect(address.coord()).toEqualWithTolerance([76.035088644, 13.709288298, 0], 1e-6);
        }

        // pan map inside container
        {
        // expect transformer not to transform when dragging inside transformer
            container.transform();

            await drag(mapContainer, {x: 330, y: 270}, {x: 340, y: 300});

            expect(poi.coord()).toEqualWithTolerance([76.03532932, 13.709152485, 0], 1e-6);
            expect(address.coord()).toEqualWithTolerance([76.035088644, 13.709288298, 0], 1e-6);
        }
    });
});
