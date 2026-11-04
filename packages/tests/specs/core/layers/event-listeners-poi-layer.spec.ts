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
import dataset from './event-listeners-poi-layer.json';
import {describe, beforeEach, afterEach, it, expect} from 'vitest';

describe('Event listeners Place layer', function() {
    var preparedData;
    var placeLayer;
    var placeProvider;
    var place1;
    var place2;

    beforeEach(async function() {
        preparedData = await prepare(dataset);
        placeLayer = preparedData.getLayers('placeLayer');
        placeProvider = placeLayer.getProvider();

        place1 = preparedData.getFeature('placeLayer', -9118);
        place2 = preparedData.getFeature('placeLayer', -9119);
    });

    afterEach(async function() {
        await preparedData?.clear();
    });

    it('validate remove feature event', function() {
        let obj = placeProvider.exists({id: place1.id});

        expect(obj.feature).toEqual(expect.objectContaining({
            id: place1.id,
            type: 'Feature'
        }));
    });

    it('start event listener', function() {
        let listener = new Listener(placeLayer, 'featuresRemove');

        placeLayer.removeFeature({
            type: 'Feature',
            id: place1.id
        });

        let results = listener.stop();

        expect(results.featuresRemove[0].detail.features[0]).toEqual(expect.objectContaining({
            id: place1.id,
            type: 'Feature'
        }));
    });


    it('start add, remove and modify event', function() {
        let listener = new Listener(placeLayer, ['featuresAdd', 'featuresRemove', 'featureCoordinatesChange']);

        placeLayer.addFeature({
            geometry: {
                coordinates: [79.94556379306937, 12.955867528276273, 0],
                type: 'Point'
            },
            type: 'Feature',
            id: 'abcpoi',
            properties: {
                type: 'hotel',
                routingPoint: [79.9455691574874, 12.95738052826902, 0]
            }
        });

        placeLayer.setFeatureCoordinates(
            {
                id: place2.id,
                geometry: {
                    // coordinates: [[49.97183, 8.2691, 0], [49.97195, 8.26949, 0]]
                }
            },
            [79.94418050205374, 12.956967528276273, 0]
        );

        let results = listener.stop();

        expect(results.featuresAdd).toHaveLength(1);
        expect(results.featuresRemove).toHaveLength(0);
        expect(results.featureCoordinatesChange).toHaveLength(1);

        expect(results.featuresAdd[0].detail.features[0]).toEqual(expect.objectContaining({
            id: 'abcpoi',
            type: 'Feature'
        }));

        expect(results.featureCoordinatesChange[0].detail.feature).toEqual(expect.objectContaining({
            id: place2.id,
            type: 'Feature'
        }));

        placeLayer.removeFeature({
            type: 'Feature',
            id: 'abcpoi'
        });
    });
});
