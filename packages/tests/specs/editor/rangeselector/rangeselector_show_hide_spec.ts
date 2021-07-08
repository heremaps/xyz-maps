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
import {drag} from 'triggerEvents';
import {Map} from '@here/xyz-maps-display';
import {Editor} from '@here/xyz-maps-editor';
import dataset from './rangeselector_show_hide_spec.json';
import chaiAlmost from 'chai-almost';

describe('range selector util', function() {
    const expect = chai.expect;
    let editor;
    let display;
    let preparedData;
    let mapContainer;
    let link1;
    let link2;
    let link4;

    before(async function() {
        chai.use(chaiAlmost(0.001));
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: -107.791617, latitude: 37.247926},
            zoomlevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });
        await waitForEditorReady(editor);
        mapContainer = display.getContainer();
        link1 = preparedData.getFeature('linkLayer', '-18254');
        link2 = preparedData.getFeature('linkLayer', '-18255');
        link4 = preparedData.getFeature('linkLayer', '-18257');

        display.addEventListener('pointermove', (e)=>console.log(e.mapX, e.mapY));
    });

    after(async ()=>{
        editor.destroy();
        display.destroy();
        await preparedData.clear();
    });

    it('validate range is initialized correctly', async ()=>{
        editor.getRangeSelector().add(link1);

        editor.getRangeSelector().show({
            from: 0.1,
            to: 0.4,
            side: 'B'
        });

        let info = editor.getRangeSelector().info();

        expect(info[0].from).to.deep.almost(0.1);
        expect(info[0].to).to.deep.almost(0.4);
        expect(info[0].segments[0]).to.deep.include({
            reversed: false
        });

        expect(info[0].segments[0].navlink).to.deep.include({
            id: link1.id
        });
    });

    it('validate selected range info after dragging range selector', async function() {
        editor.getRangeSelector().hide();

        editor.getRangeSelector().add(link2);

        let range;
        editor.getRangeSelector().show({
            from: 0.1,
            to: 0.4,
            side: 'B',
            dragStop: function(e) {
                range = e.detail.range;
            }
        });

        await drag(mapContainer, {x: 120, y: 185}, {x: 120, y: 200});

        expect(range.segments[0].from).to.deep.almost(0.1);
        expect(range.segments[0].to).to.deep.almost(0.517);
        expect(range.segments[0]).to.deep.include({
            reversed: false
        });

        expect(range.segments[0].navlink).to.deep.include({
            id: link2.id
        });
    });


    it('hide rangeselector and add another link to range select, validate selected range info after dragging', async function() {
        editor.getRangeSelector().hide();

        editor.getRangeSelector().add(link1);

        let range;
        editor.getRangeSelector().show({
            from: 0.1,
            to: 0.7,
            side: 'R',
            dragStop: function(e) {
                range = e.detail.range;
            }
        });

        await drag(mapContainer, {x: 133, y: 301}, {x: 131, y: 285});

        expect(range.segments[0].from).to.deep.almost(0.1);
        expect(range.segments[0].to).to.deep.almost(0.488);
        expect(range.segments[0]).to.deep.include({
            reversed: false
        });

        expect(range.segments[0].navlink).to.deep.include({
            id: link1.id
        });
    });

    it('hide rangeselector and drag a link, validate the selected range info', async function() {
        editor.getRangeSelector().hide();

        link4.select();

        await drag(mapContainer, {x: 423, y: 276}, {x: 400, y: 276});

        expect(editor.info()).to.have.lengthOf(1);
    });
});
