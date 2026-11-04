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
import dataset from './add-remove-multiple-feature.json';
import {describe, beforeEach, afterEach, it, expect} from 'vitest';

describe('Layer batch feature addition and removal', function() {
    var layer;
    var preparedData;

    beforeEach(async () => {
        preparedData = await prepare(dataset);
        layer = preparedData.getLayers('addressLayer');
    });

    afterEach(async () => {
        await preparedData?.clear();
    });

    it('search features', async () => {
        let objs = layer.search({
            rect: {
                minLon: 76.6156351977292,
                minLat: 16.398663218659152,
                maxLon: 76.61992673215303,
                maxLat: 16.400809170779567
            }
        });

        expect(objs).toHaveLength(0);
    });

    it('add an empty FeatureCollection', async () => {
        let result = layer.addFeature({
            type: 'FeatureCollection',
            features: []
        });
        expect(result).toHaveLength(0);
    });

    it('add invalid FeatureCollection', async () => {
        let result = layer.addFeature({
            type: 'FeatureCollection'
        });
        expect(result).toHaveLength(0);
    });

    it('add an empty feature array', async () => {
        let result = layer.addFeature([]);
        expect(result).toHaveLength(0);
    });

    it('adds, searches and removes two address features', async () => {
        let added = layer.addFeature([{
            geometry: {
                coordinates: [76.61612872418794, 16.399283334351907, 0],
                type: 'Point'
            },
            type: 'Feature',
            properties: {
                routingLink: '1',
                routingPoint: [76.61612872418794, 16.399283334351907, 0]
            }
        }, {
            geometry: {
                coordinates: [76.61612872418794, 16.399283334351907, 0],
                type: 'Point'
            },
            type: 'Feature',
            properties: {
                routingLink: '1',
                routingPoint: [76.61612872418794, 16.399283334351907, 0]
            }
        }],
        [{zIndex: 0, type: 'Circle', radius: 8, fill: '#F000F0'}]);
        expect(added).toHaveLength(2);

        let objs = layer.search({
            rect: {
                minLon: 76.6156351977292,
                minLat: 16.398663218659152,
                maxLon: 76.61992673215303,
                maxLat: 16.400809170779567
            }
        });

        expect(objs).toHaveLength(2);
        let rect = {
            minLon: 76.6156351977292,
            minLat: 16.398663218659152,
            maxLon: 76.61992673215303,
            maxLat: 16.400809170779567
        };
        let removed = layer.removeFeature(layer.search({rect: rect}));

        expect(removed).toHaveLength(2);

        let result = layer.search({rect: rect});

        expect(result).toHaveLength(0);
    });

    it('remove empty feature array', async () => {
        let removed = layer.removeFeature([]);

        expect(removed).toHaveLength(0);
    });
});
