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
import {prepare} from 'utils';
import {waitForEditorReady, editorClick} from 'editorUtils';
import {drag, click} from 'triggerEvents';
import {Map} from '@here/xyz-maps-display';
// @ts-ignore @deprecated
import dataset from './link_zlevels_spec.json';
import {Editor, Navlink, NavlinkShape} from '@here/xyz-maps-editor';
import {TileLayer} from '@here/xyz-maps-core';
import {describe, beforeAll, afterAll, it, expect} from 'vitest';

describe('navlink zlevels', () => {
    let editor;
    let display;
    let preparedData;
    let mapContainer;
    let link: Navlink;
    let linkLayer: TileLayer;

    beforeAll(async () => {
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 77.19774634658813, latitude: 13.103736533151803},
            zoomlevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });
        await waitForEditorReady(editor);
        mapContainer = display.getContainer();

        link = preparedData.getFeature('linkLayer', -189094);
        linkLayer = preparedData.getLayers('linkLayer');
    });

    afterAll(async () => {
        editor.destroy();
        display.destroy();
        await preparedData.clear();
    });

    it('create a link and validate', () => {
        expect(link.getZLevels()).toStrictEqual([1, 2, 3]);
    });

    it('set zlevel and validate', () => {
        link.setZLevels([1, 1, 1]);
        expect(link.getZLevels()).toStrictEqual([1, 1, 1]);
    });

    it('remove shape and validate zlevels', async () => {
        link.select();
        let shape = <NavlinkShape>(await editorClick(editor, 200, 100)).target;
        shape.remove();
        expect(link.getZLevels()).toStrictEqual([1, 1]);
    });

    it('add one more shape point at head of the link and validate', () => {
        link.addShape({
            x: 200,
            y: 100
        }, 0);

        expect(link.getZLevels()).toStrictEqual([0, 1, 1]);
    });

    it('set zlevel and validate', () => {
        link.setZLevels([1, 1, 1]);
        expect(link.getZLevels()).toStrictEqual([1, 1, 1]);
    });


    it('drag shape point and validate', async () => {
        await click(mapContainer, 100, 200);
        await drag(mapContainer, {x: 400, y: 200}, {x: 200, y: 300});

        expect(link.getZLevels()).toStrictEqual([1, 1, 1]);
    });

    it('add a shape point and validate', () => {
        link.addShape({x: 133, y: 300});
        expect(link.getZLevels()).toStrictEqual([1, 1, 0, 1]);
    });

    it('add one more shape point, validate zlevel', () => {
        link.addShape({x: 166, y: 300});
        expect(link.getZLevels()).toStrictEqual([1, 1, 0, 0, 1]);
    });

    it('split link and validate', async () => {
        let shape = <NavlinkShape>(await editorClick(editor, 166, 300)).target;

        let splitLinks = shape.splitLink();

        expect(splitLinks[0].getZLevels()).toStrictEqual([1, 1, 0]);
        expect(splitLinks[1].getZLevels()).toStrictEqual([0, 0, 1]);
    });

    it('add shape and split Navlink and validate zlevels are set correctly', async () => {
        let link = editor.addFeature({
            type: 'Feature',
            properties: {
                featureClass: 'NAVLINK'
            },
            geometry: {
                type: 'LineString',
                coordinates: editor.toGeoJSONCoordinates([{x: 300, y: 300}, {x: 400, y: 300}, {
                    x: 500,
                    y: 300
                }])
            }
        }, linkLayer);

        link.setZLevels([1, 2, 3]);


        let link2 = editor.addFeature({
            type: 'Feature',
            properties: {
                featureClass: 'NAVLINK'
            },
            geometry: {
                type: 'LineString',
                coordinates: editor.toGeoJSONCoordinates([{x: 300, y: 100}, {x: 400, y: 100}, {
                    x: 500,
                    y: 100
                }])
            }
        }, linkLayer);
        link2.setZLevels([10, 20, 30]);

        link2.select();
        await drag(display.getContainer(), {x: 400, y: 100}, {x: 400, y: 300});

        const child1 = <Navlink>(await editorClick(editor, 350, 300)).target;

        expect(child1.getZLevels()).toEqualWithTolerance([1, 2], 1e-6);

        const child2 = <Navlink>(await editorClick(editor, 450, 300)).target;
        expect(child2.getZLevels()).toEqualWithTolerance([2, 3], 1e-6);
    });

    it('split Navlink and validate zlevels are set correctly', async () => {
        let link = editor.addFeature({
            type: 'Feature',
            properties: {
                featureClass: 'NAVLINK'
            },
            geometry: {
                type: 'LineString',
                coordinates: editor.toGeoJSONCoordinates([{x: 600, y: 300}, {x: 700, y: 300}, {
                    x: 800,
                    y: 300
                }])
            }
        }, linkLayer);

        link.setZLevels([1, 2, 3]);


        let link2 = editor.addFeature({
            type: 'Feature',
            properties: {
                featureClass: 'NAVLINK'
            },
            geometry: {
                type: 'LineString',
                coordinates: editor.toGeoJSONCoordinates([{x: 600, y: 100}, {x: 700, y: 100}, {
                    x: 800,
                    y: 100
                }])
            }
        }, linkLayer);
        link2.setZLevels([4, 5, 6]);

        link2.select();
        await drag(display.getContainer(), {x: 700, y: 100}, {x: 675, y: 300});

        const child1Link1 = <Navlink>(await editorClick(editor, 650, 300)).target;

        expect(child1Link1.getZLevels()).toEqualWithTolerance([1, 0], 1e-6);

        const child2Link1 = <Navlink>(await editorClick(editor, 750, 300)).target;
        expect(child2Link1.getZLevels()).toEqualWithTolerance([0, 2, 3], 1e-6);

        const child1Link2 = <Navlink>(await editorClick(editor, 650, 220)).target;
        expect(child1Link2.getZLevels()).toEqualWithTolerance([4, 5], 1e-6);

        const child2Link2 = <Navlink>(await editorClick(editor, 750, 180)).target;
        expect(child2Link2.getZLevels()).toEqualWithTolerance([5, 6], 1e-6);
    });
});
