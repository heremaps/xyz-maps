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
 */
import {MonitorXHR, prepare} from 'utils';
import {waitForEditorReady, submit} from 'editorUtils';
import {Map} from '@here/xyz-maps-core';
import {drag} from 'triggerEvents';
import {features, Editor} from '@here/xyz-maps-editor';
import chaiAlmost from 'chai-almost';
import dataset from './link_create_modify_remove_spec.json';

describe('Validate submit of creating new link, modifying and removing link', function() {
    const expect = chai.expect;

    let editor;
    let display;
    let preparedData;
    let mapContainer;
    let link;
    let linkLayer;

    before(async function() {
        chai.use(chaiAlmost());
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 76.98506, latitude: 12.88776},
            zoomLevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });
        await waitForEditorReady(editor);
        mapContainer = display.getContainer();
        linkLayer = preparedData.getLayers('linkLayer');
    });

    after(async function() {
        editor.destroy();
        display.destroy();
        await preparedData.clear();
    });

    it('create a link and submit', async function() {
        let l = new features.Navlink([{x: 100, y: 100}, {x: 350, y: 350}], {featureClass: 'NAVLINK'});
        link = editor.addFeature(l);

        expect(link.coord()).to.deep.almost([
            [76.983450675, 12.888805854, 0],
            [76.984791779, 12.887498536, 0]
        ]);

        let monitor = new MonitorXHR();
        monitor.start({method: 'post'});
        let idMap;

        await waitForEditorReady(editor, async ()=>{
            idMap = await submit(editor);
        });
        let linkId = idMap.permanentIDMap[link.getProvider().id][link.id];
        let reqs = monitor.stop();
        expect(reqs).to.have.lengthOf(1);
        let payload = reqs[0].payload;

        link = editor.getFeature(linkId, linkLayer);

        expect(payload.features[0].geometry.coordinates).to.deep.almost([
            [76.983450675, 12.888805854, 0],
            [76.984791779, 12.887498536, 0]
        ]);
        expect(payload.features[0].properties).to.deep.include({
            'featureClass': 'NAVLINK'
        });
    });

    it('modify link and validate', async function() {
        link.select();

        await drag(mapContainer, {x: 100, y: 100}, {x: 150, y: 150});

        expect(link.coord()).to.deep.almost([
            [76.983718921, 12.888544437, 0],
            [76.9847918, 12.8874985, 0]
        ]);

        let monitor = new MonitorXHR();
        monitor.start({method: 'post'});

        await waitForEditorReady(editor, async ()=>{
            await submit(editor);
        });

        let reqs = monitor.stop();
        expect(reqs).to.have.lengthOf(1);
        let payload = reqs[0].payload;

        link = editor.getFeature(link.id, linkLayer);

        expect(payload.features[0].geometry.coordinates).to.deep.almost([
            [76.983718921, 12.888544437, 0],
            [76.9847918, 12.8874985, 0]
        ]);
        expect(payload.features[0].properties).to.deep.include({
            'featureClass': 'NAVLINK'
        });
    });


    it('remove link and validate', async function() {
        link.select();
        let links = editor.search(display.getViewBounds());

        expect(links).to.be.lengthOf(1);

        link.remove();

        links = editor.search(display.getViewBounds());

        expect(links).to.be.lengthOf(0);

        let monitor = new MonitorXHR(/&id=/);
        monitor.start({method: 'delete'});
        await waitForEditorReady(editor, async ()=>{
            await submit(editor);
        });
        let request = monitor.stop()[0];

        expect(request.payload).to.equal(null);
        expect(request.method).to.equal('DELETE');
        expect(request.url.indexOf(link.id)>-1).to.be.true;
    });
});
