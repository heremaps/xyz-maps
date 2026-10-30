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
import {waitForEditorReady} from 'editorUtils';
import {Map} from '@here/xyz-maps-display';
import {Editor} from '@here/xyz-maps-editor';
import dataset from './legacy_provider_class_spec.json';
import {describe, beforeAll, afterAll, it, expect} from 'vitest';

// Legacy coverage. The linkLayer provider in legacy_provider_class_spec.json sets "class": "NAVLINK".
// The editor still reads this key (IEditor.getLayerForClass, IEditor.getLayerForFeature), but the key
// is not documented for public use. This is the only editor spec that sets a provider class.
// Do not copy it into new layer configs.
describe('legacy provider class in layer config', function() {
    let editor;
    let display;
    let preparedData;

    beforeAll(async function() {
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {latitude: 18.865855, longitude: 73.07682},
            zoomlevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });
        await waitForEditorReady(editor);
    });

    afterAll(async function() {
        editor.destroy();
        display.destroy();
        await preparedData.clear();
    });

    it('keeps the config order with the generic placeLayer first', function() {
        // A NAVLINK that lands in linkLayer must come from the class lookup, not from "first layer".
        expect(preparedData.getLayers().map((layer) => layer.id)).toStrictEqual(['placeLayer', 'linkLayer']);
    });

    it('addFeature without layer puts a NAVLINK into the layer with the matching provider class', function() {
        const link = editor.addFeature({
            type: 'Feature',
            properties: {featureClass: 'NAVLINK'},
            geometry: {
                type: 'LineString',
                coordinates: editor.toGeoJSONCoordinates([{x: 100, y: 150}, {x: 300, y: 150}])
            }
        });

        expect(link.getProvider().id).toBe('linkProvider');
    });

    it('addFeature without layer puts a PLACE into the first layer without provider class', function() {
        const poi = editor.addFeature({
            type: 'Feature',
            properties: {featureClass: 'PLACE'},
            geometry: {
                type: 'Point',
                coordinates: editor.toGeoJSONCoordinates({x: 100, y: 200})
            }
        });

        expect(poi.getProvider().id).toBe('placeProvider');
    });

    it('drawingboard creates a NAVLINK in the layer with the matching provider class by default', function() {
        editor.getDrawingBoard().start();
        editor.getDrawingBoard().addShape({x: 100, y: 250});
        editor.getDrawingBoard().addShape({x: 300, y: 250});
        const link = editor.getDrawingBoard().create({featureClass: 'NAVLINK'});

        expect(link.getProvider().id).toBe('linkProvider');
    });
});
