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
import {createEditorFixture} from '@test/fixtures/editor';
import {beforeEach, describe, expect, it} from 'vitest';
import dataset from './map_getobjects_spec.json';

describe('map getobjects', function() {
    var editor;
    var display;

    var preparedData;
    var linkLayer;
    var placeLayer;
    var addressLayer;

    beforeEach(async function() {
        ({preparedData, display, editor} = await createEditorFixture(dataset, {
            center: {longitude: 77.435113, latitude: 15.653134},
            zoomlevel: 18
        }));

        linkLayer = preparedData.getLayers('linkLayer');
        placeLayer = preparedData.getLayers('placeLayer');
        addressLayer = preparedData.getLayers('paLayer');
    });

    it('centers the viewport at the configured location', function() {
        expect(display.getCenter()).toEqual({longitude: 77.435113, latitude: 15.653134});
    });

    it('finds all six features in the viewport', function() {
        let objs = editor.search(display.getViewBounds());

        expect(objs).toHaveLength(6);
    });

    it('finds a Navlink in the western bounding box', function() {
        let objs = editor.search({rect: {minLon: 77.43435955529584, minLat: 15.652189542987028, maxLon: 77.4354324389018, maxLat: 15.652964365088488}, layers: [linkLayer]});

        expect(objs).toHaveLength(1);
    });

    it('accepts the viewport as an explicit search rectangle', function() {
        let objs = editor.search({rect: display.getViewBounds()});

        expect(objs).toHaveLength(6);
    });

    it('filters the western bounding box to Places and Navlinks', function() {
        let objs = editor.search({rect: {minLon: 77.43435955529584, minLat: 15.652189542987028, maxLon: 77.4354324389018, maxLat: 15.652964365088488}, layers: [placeLayer, linkLayer]});

        expect(objs).toHaveLength(2);
        expect(new Set(objs.map((feature) => feature.getProvider().id))).toEqual(
            new Set([placeLayer.getProvider().id, linkLayer.getProvider().id])
        );
    });

    it('filters viewport searches to the Address layer', function() {
        let objs = editor.search({rect: display.getViewBounds(), layers: [addressLayer]});

        expect(objs).toHaveLength(2);
        expect(new Set(objs.map((feature) => feature.getProvider().id))).toEqual(new Set([addressLayer.getProvider().id]));
    });

    it('filters viewport searches to the Navlink layer', function() {
        let objs = editor.search({rect: display.getViewBounds(), layers: [linkLayer]});

        expect(objs).toHaveLength(2);
        expect(new Set(objs.map((feature) => feature.getProvider().id))).toEqual(new Set([linkLayer.getProvider().id]));
    });

    it('finds an Address in the eastern bounding box', function() {
        let objs = editor.search({rect: {minLon: 77.43482481562621, minLat: 15.652383991839185, maxLon: 77.43592788044107, maxLat: 15.653180609603492}, layers: [addressLayer]});

        expect(objs).toHaveLength(1);
    });

    it('finds a Navlink in the eastern bounding box', function() {
        let objs = editor.search({rect: {minLon: 77.43482481562621, minLat: 15.652383991839185, maxLon: 77.43592788044107, maxLat: 15.653180609603492}, layers: [linkLayer]});

        expect(objs).toHaveLength(1);
    });

    it('filters viewport searches to the Place layer', function() {
        let objs = editor.search({rect: display.getViewBounds(), layers: [placeLayer]});
        expect(objs).toHaveLength(2);
        expect(new Set(objs.map((feature) => feature.getProvider().id))).toEqual(new Set([placeLayer.getProvider().id]));
    });
});
