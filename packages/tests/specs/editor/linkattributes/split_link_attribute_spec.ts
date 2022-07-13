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
import dataset from './split_link_attribute_spec.json';
import chaiAlmost from 'chai-almost';
import {Map} from '@here/xyz-maps-display';
import {Editor} from '@here/xyz-maps-editor';
// @ts-ignore @deprecated
import {features} from '@here/xyz-maps-editor';
import {NavlinkShape} from '@here/xyz-maps-editor';


describe('validate attributes after splitting a link', function() {
    const expect = chai.expect;
    chai.use(chaiAlmost());
    let editor;
    let display;
    let preparedData;

    before(async function() {
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 80.59799375789913, latitude: 16.650199051996044},
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

    it('split a link and validate its coord and type value', async function() {
        let l = new features.Navlink([{x: 100, y: 50}, {x: 300, y: 50}, {x: 500, y: 100}], {
            featureClass: 'NAVLINK',
            type: 'highway',
            name: 'A2',
            turnRestriction: {start: [], end: ['abc']},
            direction: 'START_TO_END',
            pedestrianOnly: false
        });
        let link0 = editor.addFeature(l);
        link0.select();

        let shape = <NavlinkShape>(await editorClick(editor, 300, 50)).target;

        let splitLinks = shape.splitLink();


        expect(splitLinks[0].coord()).to.deep.almost([[80.596384432, 16.651483922, 0], [80.597457316, 16.651483922, 0]]);
        expect(splitLinks[0].prop()).to.be.deep.include({
            featureClass: 'NAVLINK',
            type: 'highway',
            name: 'A2',
            turnRestriction: {start: [], end: ['abc']},
            direction: 'START_TO_END',
            pedestrianOnly: false
        });

        expect(splitLinks[1].coord()).to.deep.almost([[80.597457316, 16.651483922, 0], [80.5985302, 16.651226949, 0]]);
        expect(splitLinks[1].prop()).to.be.deep.include({
            featureClass: 'NAVLINK',
            type: 'highway',
            name: 'A2',
            turnRestriction: {start: [], end: ['abc']},
            direction: 'START_TO_END',
            pedestrianOnly: false
        });
    });
});
