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
import {Map} from '@here/xyz-maps-display';
import {Editor, NavlinkShape} from '@here/xyz-maps-editor';
// @ts-ignore @deprecated
import {features} from '@here/xyz-maps-editor';
import dataset from './link_remove_shapepoint_spec.json';

describe('remove link shapepoints', function() {
    const expect = chai.expect;

    var editor;
    var display;
    var preparedData;

    var link;

    before(async function() {
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {latitude: 12.263805526394263, longitude: 79.92293529639585},
            zoomlevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });

        await waitForEditorReady(editor);
    });

    after(async function() {
        editor.destroy();
        display.destroy();
        await preparedData.clear();
    });

    it('validate the link is added', function() {
        let lnk = new features.Navlink([{x: 100, y: 100}, {x: 100, y: 200}, {
            x: 200,
            y: 200
        }], {featureClass: 'NAVLINK'});
        link = editor.addFeature(lnk);

        expect(editor.get('changes.length')).to.equal(1);
    });

    it('remove a shape point and validate the coord', async function() {
        link.select();

        let shape = <NavlinkShape>(await editorClick(editor, 200, 200)).target;
        shape.remove();

        expect(link.coord()).to.have.lengthOf(2);
    });

    it('click another link shape point to remove', async function() {
        let shape = <NavlinkShape>(await editorClick(editor, 100, 200)).target;
        shape.remove();

        expect(link.coord()).to.have.lengthOf(2);
    });
});
