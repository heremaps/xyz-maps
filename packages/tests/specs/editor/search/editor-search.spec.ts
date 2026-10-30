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
import {beforeEach, describe, expect, it} from 'vitest';
import dataset from './editor-search.json';

describe('Editor search', function() {
    var preparedData;
    var editor;
    var display;

    var link1;
    var link2;

    var linkLayer;
    var paLayer;
    var placeLayer;
    var buildingLayer;

    beforeEach(async function() {
        ({preparedData, display, editor} = await createEditorFixture(dataset, {
            center: {longitude: 76.904889, latitude: 16.410735},
            zoomlevel: 18
        }));

        link1 = preparedData.getFeature('linkLayer', 'link1');
        link2 = preparedData.getFeature('linkLayer', 'link2');

        linkLayer = preparedData.getLayers('linkLayer');
        paLayer = preparedData.getLayers('paLayer');
        placeLayer = preparedData.getLayers('placeLayer');
        buildingLayer = preparedData.getLayers('buildingLayer');
    });

    it('search with id', function() {
        let objs = editor.search({id: link1.id, layers: [linkLayer]});

        expect(objs).toHaveLength(1);
    });

    it('search with ids', function() {
        let objs = editor.search({ids: [link1.id, link2.id], layers: [linkLayer]});

        expect(objs).toHaveLength(2);
    });

    it('search with point', function() {
        const [longitude, latitude] = link1.coord()[0];
        const objects = editor.search({point: {longitude, latitude}, radius: 1, layers: [linkLayer]});
        expect(objects.map((feature) => feature.id)).toContain(link1.id);
    });

    it('search with rect', function() {
        let objs = editor.search({rect: {minLon: 76.904027, minLat: 16.410843, maxLon: 76.906172, maxLat: 16.412387}});
        expect(objs).toHaveLength(3);

        objs = editor.search({rect: {minLon: 76.904027, minLat: 16.410843, maxLon: 76.906172, maxLat: 16.412387}, layers: [placeLayer]});
        expect(objs).toHaveLength(2);

        objs = editor.search({rect: {minLon: 76.904027, minLat: 16.410843, maxLon: 76.906172, maxLat: 16.412387}, layers: [linkLayer]});
        expect(objs).toHaveLength(1);

        objs = editor.search({rect: {minLon: 76.904027, minLat: 16.410843, maxLon: 76.906172, maxLat: 16.412387}, layers: [buildingLayer, paLayer]});
        expect(objs).toHaveLength(0);
    });
});
