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
import {prepare} from 'utils';
import {waitForEditorReady, editorClick} from 'editorUtils';
import {drag} from 'triggerEvents';
import {Map} from '@here/xyz-maps-display';
import {Editor, DrawingShape, Line, LineShape} from '@here/xyz-maps-editor';
import chaiAlmost from 'chai-almost';
import dataset from './multiline_basics_spec.json';

describe('basic multiline tests', () => {
    const expect = chai.expect;

    let editor;
    let display;
    let preparedData;
    let mapContainer;
    let multiLine;

    before(async () => {
        chai.use(chaiAlmost());
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 76.08312571088209, latitude: 13.214838342327566},
            zoomlevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });

        await waitForEditorReady(editor);

        mapContainer = display.getContainer();

        multiLine = preparedData.getFeature('lineLayer', 'LINE');
    });

    after(async () => {
        editor.destroy();
        display.destroy();
    });

    it('validate geometry type', async () => {
        expect(multiLine.geometry.type).to.equal('MultiLineString');
    });

    it('validate pointerevents', async () => {
        const target = <Line>(await editorClick(editor, 400, 300)).target;

        expect(multiLine).to.equal(target);
    });


    it('validate line geometry', async () => {
        const coordinates = multiLine.coord();

        expect(coordinates.length).to.equal(1);

        expect(coordinates[0]).to.deep.almost([
            [76.083125712, 13.214838342, 0],
            [76.082589269, 13.215360578, 0],
            [76.082052827, 13.214838342, 0]
        ]);
    });

    it('modify geometry by dragging shape ', async () => {
        await drag(mapContainer, {x: 400, y: 300}, {x: 300, y: 400});

        const coordinates = multiLine.coord();
        expect(coordinates.length).to.equal(1);

        expect(coordinates[0]).to.deep.almost([
            [76.082589270, 13.214316105, 0],
            [76.082589269, 13.215360578, 0],
            [76.082052827, 13.214838342, 0]
        ]);
    });


    it('remove shape', async () => {
        const shape = <DrawingShape>(await editorClick(editor, 300, 400)).target;

        shape.remove();

        const coordinates = multiLine.coord();
        expect(coordinates.length).to.equal(1);

        expect(coordinates[0]).to.deep.almost([
            [76.082589269, 13.215360578, 0],
            [76.082052827, 13.214838342, 0]
        ]);
    });

    it('modify geometry by dragging virtual shape', async () => {
        multiLine.select();

        await drag(mapContainer, {x: 250, y: 250}, {x: 350, y: 350});

        const coordinates = multiLine.coord();
        expect(coordinates.length).to.equal(1);

        expect(coordinates[0]).to.deep.almost([
            [76.082589269, 13.215360578, 0],
            [76.082857490, 13.214577223, 0],
            [76.082052827, 13.214838342, 0]
        ]);
    });

    it('add linestring geometry', async () => {
        let coordinates = multiLine.coord();

        coordinates.push([
            [76.082589269, 13.2155, 0],
            [76.081157490, 13.2146, 0],
            [76.082052827, 13.2149, 0]
        ]);

        multiLine.coord(coordinates);

        coordinates = multiLine.coord();

        expect(coordinates.length).to.equal(2);

        expect(coordinates).to.deep.almost([[
            [76.082589269, 13.215360578, 0],
            [76.082857490, 13.214577223, 0],
            [76.082052827, 13.214838342, 0]
        ], [
            [76.082589269, 13.2155, 0],
            [76.081157490, 13.2146, 0],
            [76.082052827, 13.2149, 0]
        ]]);
    });

    it('validate pointer events', async () => {
        const {target} = (await editorClick(editor, 200, 240));

        expect(multiLine).to.equal(target);
    });


    it('add Shape to first linestring', async () => {
        multiLine.addShape({x: 200, y: 300});

        let coordinates = multiLine.coord();

        expect(coordinates).to.deep.almost([[
            [76.082589269, 13.215360578, 0],
            [76.082857490, 13.214577223, 0],
            [76.082052827, 13.214838342, 0],
            [76.082052827, 13.214838342, 0]
        ], [
            [76.082589269, 13.2155, 0],
            [76.081157490, 13.2146, 0],
            [76.082052827, 13.2149, 0]
        ]]);
    });

    it('add Shape to second linestring', async () => {
        multiLine.addShape({x: 200, y: 100}, 1);

        let coordinates = multiLine.coord();

        expect(coordinates).to.deep.almost([[
            [76.082589269, 13.215360578, 0],
            [76.082857490, 13.214577223, 0],
            [76.082052827, 13.214838342, 0],
            [76.082052827, 13.214838342, 0]
        ], [
            [76.082589269, 13.2155, 0],
            [76.082052827, 13.2158828, 0],
            [76.081157490, 13.2146, 0],
            [76.082052827, 13.2149, 0]
        ]]);
    });


    it('remove shape of LineString 1', async () => {
        const target = <LineShape>(await editorClick(editor, 200, 300)).target;

        target.remove();

        let coordinates = multiLine.coord();

        expect(coordinates).to.deep.almost([[
            [76.082589269, 13.215360578, 0],
            [76.082857490, 13.214577223, 0],
            [76.082052827, 13.214838342, 0]
        ], [
            [76.082589269, 13.2155, 0],
            [76.082052827, 13.2158828, 0],
            [76.081157490, 13.2146, 0],
            [76.082052827, 13.2149, 0]
        ]]);
    });

    it('remove shape of LineString 2', async () => {
        const target = <LineShape>(await editorClick(editor, 200, 100)).target;

        target.remove();

        let coordinates = multiLine.coord();

        expect(coordinates).to.deep.almost([[
            [76.082589269, 13.215360578, 0],
            [76.082857490, 13.214577223, 0],
            [76.082052827, 13.214838342, 0]
        ], [
            [76.082589269, 13.2155, 0],
            [76.081157490, 13.2146, 0],
            [76.082052827, 13.2149, 0]
        ]]);
    });

    it('remove multiline', async () => {
        const {id} = multiLine;
        const feature = editor.search({id}).pop();

        feature.remove();

        const result = editor.search({id});

        expect(result.length).to.equal(0);
    });
});
