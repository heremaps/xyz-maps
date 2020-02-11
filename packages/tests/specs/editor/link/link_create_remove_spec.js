/*
 * Copyright (C) 2019-2020 HERE Europe B.V.
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
 */import {editorTests, prepare} from 'hereTest';
import {Map} from '@here/xyz-maps-core';
import {features, Editor} from '@here/xyz-maps-editor';
import dataset from './link_create_remove_spec.json';

describe('Create new Link then remove', function() {
    const expect = chai.expect;

    var editor;
    var display;
    var preparedData;

    var link1;
    var linkLayer;

    before(async function() {
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 76.59506, latitude: 12.88776},
            zoomLevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });
        await editorTests.waitForEditorReady(editor);
        linkLayer = preparedData.getLayers('linkLayer');
    });

    after(async function() {
        editor.destroy();
        display.destroy();
        await preparedData.clear();
    });

    it('validate new link attributes', function() {
        let l = new features.Navlink([{x: 400, y: 200}, {x: 100, y: 200}], {featureClass: 'NAVLINK', type: 'residential'});
        link1 = editor.addFeature(l, linkLayer);

        expect(link1.prop('type')).to.equal('residential');
        expect(link1.style()).to.deep.equal([
            {zIndex: 0, type: 'Line', strokeWidth: 10, stroke: '#ff0000'}
        ]);
    });


    it('remove a link', function() {
        link1.remove();
        expect(link1.prop('removed')).to.be.equal('HOOK');
        expect(link1.prop('estate')).to.be.equal('REMOVED');
    });
});
