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
import {Observer, prepare} from 'utils';
import {drag} from 'triggerEvents';
import {waitForEditorReady, submit, clean} from 'editorUtils';
import {Map} from '@here/xyz-maps-display';
import {Editor} from '@here/xyz-maps-editor';
import dataset from './map_observer_submit_removed_link.json';
import {describe, beforeAll, afterAll, it, chai} from 'vitest';

describe.skip('ready event is triggered once after submitting removed links', function() {
    const expect = chai.expect;

    let editor;
    let display;
    let preparedData;
    let link;
    let poi;
    let linkLayer;
    let placeLayer;
    let idMaps = [];

    beforeAll(async function() {
        preparedData = await prepare(dataset);

        display = new Map(document.getElementById('map'), {
            center: {longitude: 77.75294, latitude: 17.97126},
            zoomlevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });
        await waitForEditorReady(editor);

        linkLayer = preparedData.getLayers('linkLayer');
        placeLayer = preparedData.getLayers('placeLayer');
    });

    afterAll(async function() {
        await clean(editor, idMaps);
        editor.destroy();
        display.destroy();
        await preparedData.clear();
    });

    it('create one place and one link, remove the link and submit', async function() {
        let p = {
            type: 'Feature',
            properties: {featureClass: 'PLACE'},
            geometry: {
                type: 'Point',
                coordinates: editor.toGeoJSONCoordinates({x: 400, y: 300})
            }
        };
        let lnk = {
            type: 'Feature',
            properties: {featureClass: 'NAVLINK'},
            geometry: {
                type: 'LineString',
                coordinates: editor.toGeoJSONCoordinates([{x: 250, y: 100}, {x: 250, y: 400}])
            }
        };

        link = editor.addFeature(lnk, linkLayer);
        poi = editor.addFeature(p, placeLayer);

        link.remove();

        let idMap;

        let observer = new Observer(editor, ['ready']);
        editor.addObserver('ready', (e, v)=>console.log(e, v));
        await waitForEditorReady(editor, async ()=>{
            idMap = await submit(editor);
        });

        idMaps.push(idMap);

        // wait for a while for all ready events to be triggered
        display.setBehavior('drag', false);
        let mapContainer = display.getContainer();
        await drag(mapContainer, {x: 200, y: 100}, {x: 500, y: 100}, 100);

        let results = observer.stop();

        // expect to have ready events triggered one time (false and true)
        expect(results.ready).to.have.lengthOf(2);
    });
});
