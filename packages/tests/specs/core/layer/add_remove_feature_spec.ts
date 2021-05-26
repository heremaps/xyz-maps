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
import dataset from './add_remove_feature_spec.json';

describe('add and remove features in layer', function() {
    const expect = chai.expect;

    var addrLayer;


    before(async function() {
        let preparedData = await prepare(dataset);
        addrLayer = preparedData.getLayers('addressLayer');
    });

    it('search features', async function() {
        let objs = addrLayer.search({
            point: {longitude: 79.94419050205374, latitude: 12.957261773733392},
            radius: 100
        });

        expect(objs).to.have.lengthOf(0);
    });

    it('add invalid feature (undefined)', async () => {
        let removed = addrLayer.addFeature(undefined);
        expect(removed).to.be.an('undefined');
    });

    it('add an address feature', async function() {
        addrLayer.addFeature({
            geometry: {
                coordinates: [79.94419050205374, 12.957261773733392, 0],
                type: 'Point'
            },
            type: 'Feature',
            properties: {
                routingLink: '913951405',
                routingPoint: [79.94372, 12.95714, 0]
            }
        });
    });


    it('add another address feature', async function() {
        addrLayer.addFeature({
            geometry: {
                coordinates: [79.94429050205374, 12.957261773733392, 0],
                type: 'Point'
            },
            type: 'Feature',
            properties: {
                routingLink: '913951405',
                routingPoint: [79.94372, 12.95714, 0]
            }
        }
        , [[0, {r: 8, fill: '#F000F0'}]]);
    });


    it('search features', async function() {
        let objs = addrLayer.search({
            point: {longitude: 79.94419050205374, latitude: 12.957261773733392},
            radius: 100
        });

        expect(objs).to.have.lengthOf(2);
    });

    it('remove feature', async () => {
        let area = {
            point: {longitude: 79.94419050205374, latitude: 12.957261773733392},
            radius: 100
        };
        let obj = addrLayer.search(area);
        let removed = addrLayer.removeFeature(obj[0]);

        expect(removed.type).to.equal('Feature');

        let result = addrLayer.search(area);

        expect(result).to.have.lengthOf(1);
    });

    it('remove empty feature ({})', async () => {
        let removed = addrLayer.removeFeature({});

        expect(removed).to.be.an('undefined');
    });

    it('remove invalid feature (undefined)', async () => {
        let removed = addrLayer.removeFeature(undefined);

        expect(removed).to.be.an('undefined');
    });
});
