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
import {NavlinkShape} from '@here/xyz-maps-editor';
import {createEditorFixture, editorClick} from 'editorUtils';
import {drag} from 'triggerEvents';
import {beforeEach, describe, expect, it} from 'vitest';
import dataset from './transform-move-undo.json';

describe('Transform move undo', function() {
    let editor;
    let display;
    let preparedData;
    let link1;
    let linkLayer;

    beforeEach(async function() {
        ({preparedData, display, editor} = await createEditorFixture(dataset, {
            center: {longitude: 78.19335420161838, latitude: 12.548568361911578},
            zoomlevel: 18
        }));
        link1 = preparedData.getFeature('linkLayer', '-189183');
        linkLayer = preparedData.getLayers('linkLayer');
    });

    it('restores transformed features through undo', async () => {
        // validate connected links on the shape point
        {
            link1.select();
            let shp = <NavlinkShape>(await editorClick(editor, 200, 200)).target;

            expect(shp.getConnectedLinks()).toHaveLength(2);

            expect(link1.coord()).toEqualWithTolerance([[78.192281318, 12.549091989, 0], [78.191744876, 12.549091989, 0]], 1e-6);
        }

        // transform the link and validate
        {
            link1.transform();
            let mapContainer = display.getContainer();
            await drag(mapContainer, {x: 150, y: 200}, {x: 150, y: 250});

            expect(link1.coord()).toEqualWithTolerance([
                [78.192281318, 12.548830174, 0],
                [78.191744876, 12.548830174, 0]
            ], 1e-6);
        }

        // undo the change and validate the link still connects to other links
        {
            editor.undo();
            let lnk = editor.getFeature(link1.id, linkLayer);
            lnk.select();
            let shp = <NavlinkShape>(await editorClick(editor, 200, 200)).target;

            expect(shp.getConnectedLinks()).toHaveLength(2);

            expect(lnk.coord()).toEqualWithTolerance([[78.192281318, 12.549091989, 0], [78.191744876, 12.549091989, 0]], 1e-6);
        }
    });
});
