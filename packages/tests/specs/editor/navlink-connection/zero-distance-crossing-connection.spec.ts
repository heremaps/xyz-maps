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
import dataset from './zero-distance-crossing-connection.json';
import {describe, beforeAll, afterAll, it, expect} from 'vitest';

describe('Zero distance crossing connection', function() {
    let editor;
    let display;
    let preparedData;
    let link2;
    let crossings;

    beforeAll(async function() {
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 80.58758879566193, latitude: 16.564128450446262},
            zoomlevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });
        await waitForEditorReady(editor);

        link2 = preparedData.getFeature('linkLayer', -189096);
    });

    afterAll(async function() {
        editor.destroy();
        display.destroy();
        await preparedData.clear();
    });

    it('validate crossings', function() {
        link2.select();
        crossings = link2.checkCrossings();

        let c = crossings[0];
        expect(c.distance).toBe(0);
        expect(c.x).toEqualWithTolerance(200, 1e-1);
        expect(c.y).toEqualWithTolerance(200, 1e-1);
    });

    it('connect the crossing and validate links', async function() {
        crossings = link2.checkCrossings();

        crossings.forEach((c)=>{
            c.connect();
        });

        let objs = editor.search(display.getViewBounds());
        expect(objs).toHaveLength(3);
    });
});
