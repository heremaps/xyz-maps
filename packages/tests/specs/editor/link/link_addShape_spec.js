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
import chaiAlmost from 'chai-almost';
import dataset from './link_addShape_spec.json';

describe('link add shape point', function() {
    const expect = chai.expect;

    var editor;
    var display;
    var preparedData;

    var link;
    var linkLayer;

    before(async function() {
        chai.use(chaiAlmost());
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {latitude: 12.94086, longitude: 76.99443},
            zoomLevel: 17,
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

    it('create a link and validate', function() {
        let l = new features.Navlink([{x: 400, y: 200}, {x: 100, y: 200}], {featureClass: 'NAVLINK'});
        link = editor.addFeature(l, linkLayer);

        expect(link.coord()).to.deep.almost([
            [76.99443, 12.941905632, 0],
            [76.991211349, 12.941905632, 0]
        ]);
    });

    it('add one shape point and validate', function() {
        link.addShape({x: 200, y: 50});
        expect(link.coord()).to.deep.almost([
            [76.99443, 12.941905632, 0],
            [76.992284233, 12.943474072, 0],
            [76.991211349, 12.941905632, 0]
        ]);
    });

    it('add one more shape point at head of the link and validate', function() {
        link.addShape({x: 200, y: 200, z: 1}, 0);
        expect(link.coord()).to.deep.almost([
            [76.992284233, 12.941905632, 1],
            [76.99443, 12.941905632, 0],
            [76.992284233, 12.943474072, 0],
            [76.991211349, 12.941905632, 0]
        ]);
    });

    it('add one more shape point close to existing shape point', function() {
        link.addShape({x: 196, y: 55});
        expect(link.coord()).to.deep.almost([
            [76.992284233, 12.941905632, 1],
            [76.99443, 12.941905632, 0],
            [76.992284233, 12.943474072, 0],
            [76.992241317, 12.943421791, 0],
            [76.991211349, 12.941905632, 0]
        ]);
    });

    it('undo last change', function() {
        editor.undo();

        let lnk = editor.getFeature(link.id, linkLayer);
        expect(lnk.coord()).to.deep.almost([
            [76.992284233, 12.941905632, 1],
            [76.99443, 12.941905632, 0],
            [76.992284233, 12.943474072, 0],
            [76.991211349, 12.941905632, 0]
        ]);
    });

    it('redo last change', async function() {
        editor.undo();

        let lnk = editor.getFeature(link.id, linkLayer);
        expect(lnk.coord()).to.deep.almost([
            [76.99443, 12.941905632, 0],
            [76.992284233, 12.943474072, 0],
            [76.991211349, 12.941905632, 0]
        ]);
    });
});
