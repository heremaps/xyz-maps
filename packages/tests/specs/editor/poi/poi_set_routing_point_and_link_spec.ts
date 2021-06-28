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
import dataset from './poi_set_routing_point_and_link_spec.json';

describe('poi set routing point and link manually', function() {
    const expect = chai.expect;

    let editor;
    let display;
    let preparedData;
    let link1;
    let link2;
    let poi;
    let linkLayer;
    let placeLayer;

    before(async function() {
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 76.32698191406115, latitude: 14.402797404529764},
            zoomlevel: 19,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });

        await waitForEditorReady(editor);
        linkLayer = preparedData.getLayers('linkLayer');
        placeLayer = preparedData.getLayers('placeLayer');
        link1 = preparedData.getFeature('linkLayer', -189177);
        link2 = preparedData.getFeature('linkLayer', -189178);
        poi = preparedData.getFeature('placeLayer', -29536);

        let objs = editor.search({rect: display.getViewBounds()});
        expect(objs).to.have.lengthOf(3);
    });

    after(async function() {
        editor.destroy();
        display.destroy();
        await preparedData.clear();
    });

    it('create routing point for poi and validate', function() {
        poi.createRoutingPoint();

        expect(poi.prop('routingPoint')).to.deep.equal([76.32645, 14.4028, 0]);
        expect(poi.getLink().id).to.equal(link1.id);
    });


    it('set new routing point and validate', function() {
        poi.prop({
            routingLink: link2.id,
            routingPoint: [76.32627, 14.40262, 0]
        });

        expect(poi.prop('routingPoint')).to.deep.equal([76.32627, 14.40262, 0]);
        expect(poi.getLink().id).to.equal(link2.id);
    });


    it('undo change and validate again', function() {
        editor.undo();

        let p = editor.getFeature(poi.id, placeLayer);
        let lnk = editor.getFeature(link1.id, linkLayer);

        expect(p.prop('routingPoint')).to.deep.equal([76.32645, 14.4028, 0]);
        expect(p.getLink().id).to.equal(lnk.id);
    });
});
