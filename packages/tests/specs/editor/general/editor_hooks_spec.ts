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
import {editorClick, waitForEditorReady} from 'editorUtils';
import {click, drag} from 'triggerEvents';
import {Map} from '@here/xyz-maps-display';
import {TileLayer} from '@here/xyz-maps-core';
import {Editor, LineShape, NavlinkShape} from '@here/xyz-maps-editor';
import {TestLocalProvider} from '../../../src/TestProvider';

describe('editor hooks test', function() {
    const expect = chai.expect;
    let editor;
    var display;
    let localLayer: TileLayer;
    let line;
    let navlink;
    let marker;
    let place;
    let address;

    before(async () => {
        localLayer = new TileLayer({
            min: 2, max: 28,
            provider: new TestLocalProvider({
                editable: true,
                hooks: {
                    'Coordinates.update': ({feature, previousCoordinates}) => {
                        const {properties} = feature;
                        properties.coordinatesUpdateHook = (properties.coordinatesUpdateHook || 0) + 1;
                        properties.previousCoordinates = previousCoordinates;
                    }
                }
            })
        });

        display = new Map(document.getElementById('map'), {
            center: {longitude: 76.089289, latitude: 13.010477},
            zoomlevel: 18,
            layers: [localLayer]
        });


        editor = new Editor(display, {
            layers: [localLayer]
        });

        await waitForEditorReady(editor);
    });

    after(() => {
        editor.destroy();
        display.destroy();
    });


    it('"Coordinates.update": add a line', () => {
        const p1 = display.pixelToGeo(200, 400);
        const p2 = display.pixelToGeo(600, 400);

        line = localLayer.addFeature({
            type: 'Feature',
            geometry: {
                type: 'LineString',
                coordinates: [
                    [p1.longitude, p1.latitude],
                    [p2.longitude, p2.latitude]
                ]
            },
            properties: {
                featureClass: 'LINE'
            }
        });

        expect(line.properties.coordinatesUpdateHook).to.equal(undefined);
    });

    it('"Coordinates.update": change line geometry by dragging shape', async () => {
        const mapDiv = display.getContainer();

        // select the line
        await click(mapDiv, 400, 400);
        // drag the shape
        await drag(mapDiv, {x: 200, y: 400}, {x: 100, y: 400});

        expect(line.properties.coordinatesUpdateHook).to.equal(1);

        expect(line.coord()).to.deep.almost([
            [76.08767968, 13.009954328],
            [76.09036188, 13.009954328]
        ]);
    });

    it('"Coordinates.update": change line geometry by api', () => {
        line.coord(line.prop('previousCoordinates'));

        expect(line.properties.coordinatesUpdateHook).to.equal(2);

        expect(line.coord()).to.deep.almost([
            [76.08821612, 13.009954328],
            [76.09036188, 13.009954328]
        ]);
    });

    it('"Coordinates.update": add a line shape by api', () => {
        line.coord([
            [76.08821612, 13.009954328],
            [76.08921612, 13.009954328],
            [76.09036188, 13.009954328]
        ]);

        expect(line.properties.coordinatesUpdateHook).to.equal(3);

        expect(line.coord()).to.deep.almost([
            [76.08821612, 13.009954328],
            [76.08921612, 13.009954328],
            [76.09036188, 13.009954328]
        ]);
    });

    it('"Coordinates.update": remove a line shape by api', async () => {
        line.select();

        let ev = await editorClick(editor, 600, 400);

        (<LineShape>ev.target).remove();

        expect(line.properties.coordinatesUpdateHook).to.equal(4);

        expect(line.coord()).to.deep.almost([
            [76.08821612, 13.009954328],
            [76.08921612, 13.009954328]
        ]);
    });


    it('"Coordinates.update": undo and validate line', async () => {
        editor.undo();

        line = localLayer.search(line.id);

        expect(line.properties.coordinatesUpdateHook).to.equal(3);

        expect(line.coord()).to.deep.almost([
            [76.08821612, 13.009954328],
            [76.08921612, 13.009954328],
            [76.09036188, 13.009954328]
        ]);

        line.remove();
    });

    it('"Coordinates.update": add a marker', () => {
        const p1 = display.pixelToGeo(400, 400);

        marker = localLayer.addFeature({
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: [p1.longitude, p1.latitude]
            },
            properties: {
                featureClass: 'MARKER'
            }
        });

        expect(marker.properties.coordinatesUpdateHook).to.equal(undefined);
    });

    it('"Coordinates.update": modify marker geometry by dragging', async () => {
        marker.select();

        // drag the shape
        await drag(display.getContainer(), {x: 400, y: 400}, {x: 600, y: 400});

        expect(marker.properties.coordinatesUpdateHook).to.equal(1);

        expect(marker.coord()).to.deep.almost([76.090361884, 13.009954328, 0]);
        expect(marker.properties.previousCoordinates).to.deep.almost([76.089289, 13.0099543]);
    });

    it('"Coordinates.update": modify marker geometry by api', async () => {
        const p1 = display.pixelToGeo(300, 300);

        marker.coord([p1.longitude, p1.latitude]);

        expect(marker.properties.coordinatesUpdateHook).to.equal(2);

        expect(marker.coord()).to.deep.almost([p1.longitude, p1.latitude]);
        expect(marker.properties.previousCoordinates).to.deep.almost([76.090361884, 13.009954328, 0]);
    });

    it('"Coordinates.update": undo and validate marker', async () => {
        editor.undo();

        marker = localLayer.search(marker.id);

        expect(marker.properties.coordinatesUpdateHook).to.equal(1);

        expect(marker.coord()).to.deep.almost([76.090361884, 13.009954328, 0]);
        expect(marker.properties.previousCoordinates).to.deep.almost([76.089289, 13.0099543]);

        marker.remove();
    });


    it('"Coordinates.update": add a Place', () => {
        const p1 = display.pixelToGeo(400, 400);

        place = localLayer.addFeature({
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: [p1.longitude, p1.latitude]
            },
            properties: {
                featureClass: 'PLACE'
            }
        });

        expect(place.properties.coordinatesUpdateHook).to.equal(undefined);
    });

    it('"Coordinates.update": modify Place geometry by dragging', async () => {
        place.select();

        // drag the shape
        await drag(display.getContainer(), {x: 400, y: 400}, {x: 600, y: 400});

        expect(place.properties.coordinatesUpdateHook).to.equal(1);

        expect(place.coord()).to.deep.almost([76.090361884, 13.009954328, 0]);
        expect(place.properties.previousCoordinates).to.deep.almost([76.089289, 13.0099543]);
    });

    it('"Coordinates.update": modify Place geometry by api', async () => {
        const p1 = display.pixelToGeo(300, 300);

        place.coord([p1.longitude, p1.latitude]);

        expect(place.properties.coordinatesUpdateHook).to.equal(2);

        expect(place.coord()).to.deep.almost([p1.longitude, p1.latitude]);
        expect(place.properties.previousCoordinates).to.deep.almost([76.090361884, 13.009954328, 0]);
    });

    it('"Coordinates.update": undo and validate Place', async () => {
        editor.undo();

        place = localLayer.search(place.id);

        expect(place.properties.coordinatesUpdateHook).to.equal(1);

        expect(place.coord()).to.deep.almost([76.090361884, 13.009954328, 0]);
        expect(place.properties.previousCoordinates).to.deep.almost([76.089289, 13.0099543]);

        place.remove();
    });


    it('"Coordinates.update": add a Navlink', () => {
        const p1 = display.pixelToGeo(200, 400);
        const p2 = display.pixelToGeo(600, 400);

        navlink = localLayer.addFeature({
            type: 'Feature',
            geometry: {
                type: 'LineString',
                coordinates: [
                    [p1.longitude, p1.latitude],
                    [p2.longitude, p2.latitude]
                ]
            },
            properties: {
                featureClass: 'NAVLINK'
            }
        });

        expect(navlink.properties.coordinatesUpdateHook).to.equal(undefined);
    });

    it('"Coordinates.update": change Navlink geometry by dragging shape', async () => {
        const mapDiv = display.getContainer();

        // select the line
        await click(mapDiv, 400, 400);
        // drag the shape
        await drag(mapDiv, {x: 200, y: 400}, {x: 100, y: 400});

        expect(navlink.properties.coordinatesUpdateHook).to.equal(1);

        expect(navlink.coord()).to.deep.almost([
            [76.08767968, 13.009954328],
            [76.09036188, 13.009954328]
        ]);
    });

    it('"Coordinates.update": change Navlink geometry by api', () => {
        navlink.coord(navlink.prop('previousCoordinates'));

        expect(navlink.properties.coordinatesUpdateHook).to.equal(2);

        expect(navlink.coord()).to.deep.almost([
            [76.08821612, 13.009954328, 0],
            [76.09036188, 13.009954328, 0]
        ]);
    });

    it('"Coordinates.update": add a Navlink shape by api', () => {
        navlink.coord([
            [76.08821612, 13.009954328],
            [76.08921612, 13.009954328],
            [76.09036188, 13.009954328]
        ]);

        expect(navlink.properties.coordinatesUpdateHook).to.equal(3);

        expect(navlink.coord()).to.deep.almost([
            [76.08821612, 13.009954328, 0],
            [76.08921612, 13.009954328, 0],
            [76.09036188, 13.009954328, 0]
        ]);
    });

    it('"Coordinates.update": remove a Navlink shape by api', async () => {
        navlink.select();

        let ev = await editorClick(editor, 600, 400);

        (<NavlinkShape>ev.target).remove();

        expect(navlink.properties.coordinatesUpdateHook).to.equal(4);

        expect(navlink.coord()).to.deep.almost([
            [76.08821612, 13.009954328, 0],
            [76.08921612, 13.009954328, 0]
        ]);
    });


    it('"Coordinates.update": undo and validate Navlink', async () => {
        editor.undo();

        navlink = localLayer.search(navlink.id);

        expect(navlink.properties.coordinatesUpdateHook).to.equal(3);

        expect(navlink.coord()).to.deep.almost([
            [76.08821612, 13.009954328, 0],
            [76.08921612, 13.009954328, 0],
            [76.09036188, 13.009954328, 0]
        ]);
    });

    it('"Coordinates.update": add an Address', () => {
        const p1 = display.pixelToGeo(400, 400);

        address = localLayer.addFeature({
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: [p1.longitude, p1.latitude]
            },
            properties: {
                featureClass: 'PLACE'
            }
        });

        expect(address.properties.coordinatesUpdateHook).to.equal(undefined);
    });

    it('"Coordinates.update": modify Address geometry by dragging', async () => {
        address.select();

        // drag the shape
        await drag(display.getContainer(), {x: 400, y: 400}, {x: 600, y: 400});

        expect(address.properties.coordinatesUpdateHook).to.equal(1);

        expect(address.coord()).to.deep.almost([76.090361884, 13.009954328, 0]);
        expect(address.properties.previousCoordinates).to.deep.almost([76.089289, 13.0099543]);
    });

    it('"Coordinates.update": modify Address geometry by api', async () => {
        const p1 = display.pixelToGeo(300, 300);

        address.coord([p1.longitude, p1.latitude]);

        expect(address.properties.coordinatesUpdateHook).to.equal(2);

        expect(address.coord()).to.deep.almost([p1.longitude, p1.latitude]);
        expect(address.properties.previousCoordinates).to.deep.almost([76.090361884, 13.009954328, 0]);
    });

    it('"Coordinates.update": undo and validate Address', () => {
        editor.undo();

        address = localLayer.search(address.id);

        expect(address.properties.coordinatesUpdateHook).to.equal(1);

        expect(address.coord()).to.deep.almost([76.090361884, 13.009954328, 0]);
        expect(address.properties.previousCoordinates).to.deep.almost([76.089289, 13.0099543]);

        // address.remove();
    });

    it('add an additional Hook via editor.addHook', () => {
        editor.addHook('Coordinates.update', ({feature}) => {
            feature.properties.hook2 = true;
        });

        const p1 = display.pixelToGeo(300, 300);

        address.coord([p1.longitude, p1.latitude]);

        expect(address.properties.hook2).to.equal(true);
    });

    it('get all hooks via editor.getHooks', () => {
        let hooks = editor.getHooks('Coordinates.update');

        expect(hooks.length).to.equal(2);
    });

    it('remove additional Hook and validate', () => {
        let hooks = editor.getHooks('Coordinates.update');

        editor.removeHook('Coordinates.update', hooks[1]);

        address.prop('hook2', null);

        const p1 = display.pixelToGeo(100, 100);

        address.coord([p1.longitude, p1.latitude]);

        expect(address.properties.hook2).to.equal(null);
    });
});
