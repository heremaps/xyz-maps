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
import {waitForEditorReady} from 'editorUtils';
import {Map} from '@here/xyz-maps-display';
import {Editor} from '@here/xyz-maps-editor';
import dataset from './map_functions_spec.json';
import chaiAlmost from 'chai-almost';

chai.use(chaiAlmost(1e-5));

describe('convert pixel and geo coordinates', () => {
    const expect = chai.expect;

    var editor;
    var display;
    var preparedData;

    before(async () => {
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 77.79802, latitude: 12.62214},
            zoomlevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });

        await waitForEditorReady(editor);
    });

    after(async () => {
        editor.destroy();
        display.destroy();
    });

    it('validate geotopixel function', () => {
        expect(editor.geoToPixel({longitude: 77.79802, latitude: 12.62214})).to.deep.equal({x: 400, y: 300});
    });

    it('validate pixelToGeo function', () => {
        expect(editor.pixelToGeo({x: 400, y: 300})).to.deep.almost({longitude: 77.79802, latitude: 12.62214});
    });

    it('move map to a new area', async () => {
        await waitForEditorReady(editor, () => {
            display.setCenter({longitude: 8.71902, latitude: 50.1109});
        });
    });

    it('validate geotopixel function after dragging', () => {
        expect(editor.geoToPixel({longitude: 8.71902, latitude: 50.1109})).to.deep.equal({x: 400, y: 300});
        expect(editor.pixelToGeo({x: 400, y: 300})).to.deep.almost({longitude: 8.71902, latitude: 50.1109});
    });
});
