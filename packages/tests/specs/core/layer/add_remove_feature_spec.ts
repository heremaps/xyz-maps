/*
 * Copyright (C) 2019-2026 HERE Europe B.V.
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
import {describe, beforeEach, afterEach, it, expect} from 'vitest';

describe('add and remove features in layer', function() {
    var addrLayer;
    var preparedData;


    beforeEach(async function() {
        preparedData = await prepare(dataset);
        addrLayer = preparedData.getLayers('addressLayer');
    });

    afterEach(async function() {
        await preparedData?.clear();
    });

    it('search features', async function() {
        let objs = addrLayer.search({
            point: {longitude: 79.94419050205374, latitude: 12.957261773733392},
            radius: 100
        });

        expect(objs).toHaveLength(0);
    });

    it('add invalid feature (undefined)', async () => {
        let removed = addrLayer.addFeature(undefined);
        expect(removed).toBeUndefined();
    });

    it('adds two address features, searches and removes one', async function() {
        let first = addrLayer.addFeature({
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
        expect(first).toEqual(expect.objectContaining({type: 'Feature'}));

        let second = addrLayer.addFeature({
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
        expect(second).toEqual(expect.objectContaining({type: 'Feature'}));

        let objs = addrLayer.search({
            point: {longitude: 79.94419050205374, latitude: 12.957261773733392},
            radius: 100
        });

        expect(objs).toHaveLength(2);
        let area = {
            point: {longitude: 79.94419050205374, latitude: 12.957261773733392},
            radius: 100
        };
        let obj = addrLayer.search(area);
        let removed = addrLayer.removeFeature(obj[0]);

        expect(removed.type).toBe('Feature');

        let result = addrLayer.search(area);

        expect(result).toHaveLength(1);
    });

    it('remove empty feature ({})', async () => {
        let removed = addrLayer.removeFeature({});

        expect(removed).toBeUndefined();
    });

    it('remove invalid feature (undefined)', async () => {
        let removed = addrLayer.removeFeature(undefined);

        expect(removed).toBeUndefined();
    });
});
