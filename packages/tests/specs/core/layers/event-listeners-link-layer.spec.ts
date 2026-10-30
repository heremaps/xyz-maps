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

import {Listener, prepare} from 'utils';
import dataset from './event-listeners-link-layer.json';
import {describe, beforeEach, afterEach, it, expect} from 'vitest';

describe('Event listeners link layer', function() {
    var preparedData;
    var linkLayer;
    var linkProvider;
    var link1;
    var link2;

    beforeEach(async function() {
        preparedData = await prepare(dataset);
        linkLayer = preparedData.getLayers('linkLayer');
        linkProvider = linkLayer.getProvider();

        let results = linkLayer.search({
            point: {longitude: 73.42605, latitude: 17.89042},
            radius: 50
        });
        expect(results).toHaveLength(4);

        link1 = preparedData.getFeature('linkLayer', -9123);
        link2 = preparedData.getFeature('linkLayer', -9124);
    });

    afterEach(async function() {
        await preparedData?.clear();
    });

    it('validate an link feature exists', function() {
        let obj = linkProvider.exists({id: link1.id});

        expect(obj.feature).toEqual(expect.objectContaining({
            id: link1.id,
            type: 'Feature'
        }));
    });

    it('validate remove event', function() {
        let test = new Listener(linkLayer, 'featuresRemove');

        linkLayer.removeFeature({id: link1.id});

        let results = test.stop();

        let feature = results.featuresRemove[0].detail.features[0];
        expect(feature).toEqual(expect.objectContaining({
            id: link1.id,
            type: 'Feature'
        }));
    });

    it('validate add remove and modify events', function() {
        let test = new Listener(linkLayer, ['featuresAdd', 'featuresRemove', 'featureCoordinatesChange']);

        linkLayer.addFeature({
            geometry: {
                coordinates: [[73.425542163, 17.890502248, 0], [73.426006185, 17.890688581, 0]],
                type: 'LineString'
            },
            type: 'Feature',
            id: 'abc',
            properties: {
                direction: 'B'
            }
        });

        linkLayer.setFeatureCoordinates(
            {
                id: link2.id,
                geometry: {
                    // coordinates: [[49.97183, 8.2691, 0], [49.97195, 8.26949, 0]]
                }
            },
            [[73.426166081, 17.890420526, 0], [73.426191257, 17.890142343, 0]]
        );

        let results = test.stop();

        expect(results.featuresAdd).toHaveLength(1);
        expect(results.featuresRemove).toHaveLength(0);
        expect(results.featureCoordinatesChange).toHaveLength(1);

        // @ts-ignore
        let feature = results.featuresAdd[0].detail.features[0];
        expect(feature).toEqual(expect.objectContaining({
            id: 'abc',
            type: 'Feature'
        }));
        // @ts-ignore
        feature = results.featureCoordinatesChange[0].detail.feature;
        expect(feature).toEqual(expect.objectContaining({
            id: link2.id,
            type: 'Feature'
        }));

        linkLayer.removeFeature({
            type: 'Feature',
            id: 'abc'
        });
    });
});
