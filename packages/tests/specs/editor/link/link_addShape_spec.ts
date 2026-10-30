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
import dataset from './link_addShape_spec.json';

describe('link add shape point', function() {
    let editor;
    let display;
    let preparedData;
    let link;
    let linkLayer;

    beforeEach(async function() {
        ({preparedData, display, editor} = await createEditorFixture(dataset, {
            center: {latitude: 12.94086, longitude: 76.99443},
            zoomlevel: 17
        }));
        linkLayer = preparedData.getLayers('linkLayer');
        let l = {
            type: 'Feature',
            properties: {featureClass: 'NAVLINK'},
            geometry: {
                type: 'LineString',
                coordinates: editor.toGeoJSONCoordinates([{x: 400, y: 200}, {x: 100, y: 200}])
            }
        };
        link = editor.addFeature(l, linkLayer);
    });

    function addHeadShape() {
        link.addShape({x: 200, y: 50});
        link.addShape({x: 200, y: 200, z: 1}, 0);
    }

    function addNearbyShape() {
        addHeadShape();
        link.addShape({x: 196, y: 55});
    }

    it('creates a link with the requested geometry', function() {
        expect(link.coord()).toEqualWithTolerance([
            [76.99443, 12.941905632, 0],
            [76.991211349, 12.941905632, 0]
        ], 1e-6);
    });

    it('add one shape point and validate', function() {
        link.addShape({x: 200, y: 50});
        expect(link.coord()).toEqualWithTolerance([
            [76.99443, 12.941905632, 0],
            [76.992284233, 12.943474072, 0],
            [76.991211349, 12.941905632, 0]
        ], 1e-6);
    });

    it('add one more shape point at head of the link and validate', function() {
        link.addShape({x: 200, y: 50});
        link.addShape({x: 200, y: 200, z: 1}, 0);
        expect(link.coord()).toEqualWithTolerance([
            [76.992284233, 12.941905632, 1],
            [76.99443, 12.941905632, 0],
            [76.992284233, 12.943474072, 0],
            [76.991211349, 12.941905632, 0]
        ], 1e-6);
    });

    it('add one more shape point close to existing shape point', function() {
        addHeadShape();
        link.addShape({x: 196, y: 55});
        expect(link.coord()).toEqualWithTolerance([
            [76.992284233, 12.941905632, 1],
            [76.99443, 12.941905632, 0],
            [76.992284233, 12.943474072, 0],
            [76.992241317, 12.943421791, 0],
            [76.991211349, 12.941905632, 0]
        ], 1e-6);
    });

    it('undo last change', function() {
        addNearbyShape();
        editor.undo();

        let lnk = editor.getFeature(link.id, linkLayer);
        expect(lnk.coord()).toEqualWithTolerance([
            [76.992284233, 12.941905632, 1],
            [76.99443, 12.941905632, 0],
            [76.992284233, 12.943474072, 0],
            [76.991211349, 12.941905632, 0]
        ], 1e-6);
    });

    it('undoes head insertion after undoing the nearby shape', function() {
        addNearbyShape();
        editor.undo();
        editor.undo();

        let lnk = editor.getFeature(link.id, linkLayer);
        expect(lnk.coord()).toEqualWithTolerance([
            [76.99443, 12.941905632, 0],
            [76.992284233, 12.943474072, 0],
            [76.991211349, 12.941905632, 0]
        ], 1e-6);
    });

    it('restores an undone nearby shape through redo', function() {
        addHeadShape();
        const before = structuredClone(link.coord());
        link.addShape({x: 196, y: 55});
        const inserted = structuredClone(link.coord());

        editor.undo();
        expect(editor.getFeature(link.id, linkLayer).coord()).toEqual(before);
        editor.redo();
        expect(editor.getFeature(link.id, linkLayer).coord()).toEqual(inserted);
    });
});
