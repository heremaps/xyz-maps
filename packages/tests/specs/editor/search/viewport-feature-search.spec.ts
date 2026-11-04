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
import dataset from './viewport-feature-search.json';

describe('Viewport feature search', function() {
    var editor;
    var display;
    var preparedData;

    var poi1;
    var poiLayer;

    beforeEach(async function() {
        ({preparedData, display, editor} = await createEditorFixture(dataset, {
            center: {longitude: 77.20057, latitude: 13.143919},
            zoomlevel: 18
        }));

        poiLayer = preparedData.getLayers('placeLayer');

        poi1 = preparedData.getFeature('placeLayer', -29498);
    });

    it('validate objects in viewport', function() {
        let obj = editor.search(display.getViewBounds());

        expect(obj).toHaveLength(3);
    });

    it('validate POI objects in viewport', function() {
        let obj = editor.search({rect: display.getViewBounds(), layers: [poiLayer]});
        expect(obj).toHaveLength(2);
    });

    it('preserves a POI when its existing routing link cannot be resolved', function() {
        const coordinates = poi1.coord();
        poi1.createRoutingPoint();
        expect(poi1.getLink()).toBeNull();
        expect(poi1.prop('routingLink')).toBe('abc');
        expect(poi1.coord()).toEqual(coordinates);
    });

    it('validate POI objects in boundingbox of the viewport', function() {
        let objs = editor.search({
            rect: {minLon: 77.19860754268157, minLat: 13.143048347212835, maxLon: 77.19968042628752, maxLat: 13.143831930849458},
            layers: [poiLayer]
        });

        expect(objs).toHaveLength(1);
    });

    it('select a poi, validate POI objects in boundingbox of the viewport again', async function() {
        poi1.createRoutingPoint();
        poi1.select();
        let mapContainer = display.getContainer();
        await drag(mapContainer, {x: 150, y: 100}, {x: 180, y: 100});

        let obj = editor.search({
            rect: {minLon: 77.19860754268157, minLat: 13.143048347212835, maxLon: 77.19968042628752, maxLat: 13.143831930849458},
            layers: [poiLayer]
        });

        expect(obj).toHaveLength(1);

        poi1.unselect();
    });
});
