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

import {waitForViewportReady} from 'displayUtils';
import {Listener, prepare} from 'utils';
import {click} from 'triggerEvents';
import {Map} from '@here/xyz-maps-display';
import dataset from './pointer_down_up_listener_spec.json';

describe('pointer down and pointer up listener', () => {
    const expect = chai.expect;

    let preparedData;
    let display;
    let mapContainer;

    before(async () => {
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 73.02278439898076, latitude: 20.273712610318146},
            zoomlevel: 19,
            layers: preparedData.getLayers()
        });

        await waitForViewportReady(display);
        mapContainer = display.getContainer();
    });

    after(async () => {
        display.destroy();
        await preparedData.clear();
    });

    it('validate pointer down and up events on line', async () => {
        let listener = new Listener(display, ['pointerdown', 'pointerup']);

        await click(mapContainer, 554, 243);

        let results = listener.stop();

        expect(results.pointerdown).to.have.lengthOf(1);
        expect(results.pointerdown[0]).to.deep.include({
            button: 0,
            mapX: 554,
            mapY: 243,
            type: 'pointerdown'
        });
        expect(results.pointerup).to.have.lengthOf(1);
        expect(results.pointerup[0]).to.deep.include({
            button: 0,
            mapX: 554,
            mapY: 243,
            type: 'pointerup'
        });

        const {geometry} = (<any>results.pointerup[0]).target;
        expect(geometry).to.deep.include({
            type: 'LineString'
        });
    });

    it('validate pointer down and up events on point', async () => {
        let listener = new Listener(display, ['pointerdown', 'pointerup']);

        await click(mapContainer, 616, 240);

        let results = listener.stop();

        expect(results.pointerdown).to.have.lengthOf(1);
        expect(results.pointerdown[0]).to.deep.include({
            button: 0,
            mapX: 616,
            mapY: 240,
            type: 'pointerdown'
        });
        expect(results.pointerup).to.have.lengthOf(1);
        expect(results.pointerup[0]).to.deep.include({
            button: 0,
            mapX: 616,
            mapY: 240,
            type: 'pointerup'
        });
        const {geometry} = (<any>results.pointerup[0]).target;
        expect(geometry).to.deep.include({
            type: 'Point'
        });
    });


    it('validate pointer down and up events on the ground', async () => {
        let listener = new Listener(display, ['pointerdown', 'pointerup']);

        await click(mapContainer, 253, 204);

        let results = listener.stop();

        expect(results.pointerdown).to.have.lengthOf(1);
        expect(results.pointerup).to.have.lengthOf(1);
    });

    it('validate pointer event target on polygon', async () => {
        await waitForViewportReady(display, () => {
            display.setCenter(-74.0067173729875, 40.70065214195145);
            display.setZoomlevel(16);
        });

        let listener = new Listener(display, ['pointerup']);

        await click(mapContainer, 430, 300);

        let results = listener.stop();

        expect(results.pointerup).to.have.lengthOf(1);
        expect(results.pointerup[0]).to.deep.include({
            button: 0,
            mapX: 430,
            mapY: 300,
            type: 'pointerup'
        });
        const geometry = (<any>results.pointerup[0]).target.geometry;
        expect(geometry).to.deep.include({
            type: 'Polygon'
        });
    });

    it('validate pointer event target on polygon with hole', async () => {
        let listener = new Listener(display, ['pointerup']);

        await click(mapContainer, 400, 280);

        let results = listener.stop();

        expect(results.pointerup).to.have.lengthOf(1);

        expect(results.pointerup[0]).to.deep.include({
            button: 0,
            mapX: 400,
            mapY: 280,
            type: 'pointerup'
        });

        expect(results.pointerup[0].target).to.equal(undefined);
    });

    it('validate pointer event target on linestring "inside" a polygon hole', async () => {
        let listener = new Listener(display, ['pointerup']);

        await click(mapContainer, 400, 300);

        let results = listener.stop();

        expect(results.pointerup).to.have.lengthOf(1);
        expect(results.pointerup[0]).to.deep.include({
            button: 0,
            mapX: 400,
            mapY: 300,
            type: 'pointerup'
        });
        const geometry = (<any>results.pointerup[0]).target.geometry;
        expect(geometry).to.deep.include({
            type: 'LineString'
        });
    });


    it('validate pointer-events on linestring with strokeWidth <1', async () => {
        let listener = new Listener(display, ['pointerup']);
        let layer = display.getLayers(0);

        layer.setStyleGroup(layer.search('testLine'), [{type: 'Line', zIndex: 12, stroke: 'red', strokeWidth: .9}]);

        await click(mapContainer, 400, 300);

        let results = listener.stop();

        expect(results.pointerup).to.have.lengthOf(1);
        expect(results.pointerup[0]).to.deep.include({
            button: 0,
            mapX: 400,
            mapY: 300,
            type: 'pointerup'
        });
        const geometry = (<any>results.pointerup[0]).target.geometry;
        expect(geometry).to.deep.include({
            type: 'LineString'
        });
    });
});


