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
import {prepare} from 'utils';
import {waitForEditorReady, submit, clean} from 'editorUtils';
import {Map} from '@here/xyz-maps-display';
import {features, Editor} from '@here/xyz-maps-editor';
import dataset from './poi_delete_new_connected_link_spec.json';

xdescribe('New poi connect to a new link and then remove the link', function() {
    const expect = chai.expect;

    var editor;
    var display;
    var preparedData;

    var link;
    var poi;
    var linkLayer;
    var placeLayer;
    var idMaps = [];

    before(async function() {
        preparedData = await prepare(dataset);

        display = new Map(document.getElementById('map'), {
            center: {longitude: 78.34913, latitude: 17.31552},
            zoomlevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });
        await waitForEditorReady(editor);

        linkLayer = preparedData.getLayers('linkLayer');
        placeLayer = preparedData.getLayers('placeLayer');

        // ready should be triggered two times after editor.submit, but it is triggered 4 times
        editor.addObserver('ready', function(e, v) {
            console.log(e, v, 'ready');
        });
    });

    after(async function() {
        await clean(editor, idMaps);
        editor.destroy();
        display.destroy();
        await preparedData.clear();
    });

    it('validate routingPoint value of poi', async function() {
        let p = new features.Place({x: 400, y: 300}, {featureClass: 'PLACE'}, );
        let lnk = new features.Navlink([{x: 250, y: 100}, {x: 250, y: 400}], {featureClass: 'NAVLINK'});

        link = editor.addFeature(lnk, linkLayer);
        poi = editor.addFeature(p, placeLayer);

        poi.createRoutingPoint();

        expect(poi.prop('routingPoint')).to.deep.equal([78.34833, 17.31552, 0]);
    });

    it('remove link and validate again', async function() {
        link.remove();

        expect(poi.prop('routingLink')).to.be.equal(null);
        expect(poi.prop('routingPoint')).to.be.equal(null);
    });


    it('submit created objects and validate again', async function() {
        let idMap;

        await waitForEditorReady(editor, async ()=>{
            idMap = await submit(editor);
        });

        idMaps.push(idMap);
        let poiId = idMap.permanentIDMap[poi.getProvider().id][poi.id];

        let p = editor.getFeature(poiId, placeLayer);

        expect(p.prop('routingLink')).to.be.undefined;
        expect(p.prop('routingPoint')).to.be.undefined;
    });
});
