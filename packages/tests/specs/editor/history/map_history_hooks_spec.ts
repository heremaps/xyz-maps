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
import {waitForEditorReady} from 'editorUtils';
import {Map} from '@here/xyz-maps-display';
import {Editor} from '@here/xyz-maps-editor';
// @ts-ignore @deprecated
import {features} from '@here/xyz-maps-editor';
import dataset from './map_history_hooks.json';

describe('map history hooks', function() {
    const expect = chai.expect;

    var editor;
    var display;
    var preparedData;
    let addressLayer;

    before(async function() {
        preparedData = await prepare(dataset);

        addressLayer = preparedData.getLayers('paLayer');

        display = new Map(document.getElementById('map'), {
            center: {longitude: 73.192904, latitude: 18.916527},
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
        await preparedData.clear();
    });


    it('validate initial address', async () => {
        let address = addressLayer.search('testAddress');
        expect(address.prop('estate')).to.equal(undefined);
    });

    it('modify prop and validate "writeEditState" hook', async () => {
        let address = addressLayer.search('testAddress');
        address.prop('test', 'changed');
        expect(address.prop('estate')).to.equal('UPDATED');
    });

    it('undo change and validate address is in initial state', async () => {
        editor.undo();
        let address = addressLayer.search('testAddress');
        expect(address.prop('estate')).to.equal(undefined);
    });
});
