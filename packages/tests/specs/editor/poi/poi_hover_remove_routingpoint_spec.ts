/*
 * Copyright (C) 2019-2026 HERE Europe B.V.
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
import {mousemove} from 'triggerEvents';
import {Map} from '@here/xyz-maps-display';
import {Editor} from '@here/xyz-maps-editor';
// @ts-ignore @deprecated
import {features} from '@here/xyz-maps-editor';
import dataset from './poi_hover_remove_routingpoint_spec.json';

describe('POI hover then remove routing point then disable editing', function() {
    const expect = chai.expect;

    let editor;
    let display;
    let preparedData;
    let mapContainer;
    let objs;

    before(async function() {
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 78.35537822414972, latitude: 17.31379770143876},
            zoomlevel: 18,
            layers: preparedData.getLayers()
        });
        editor = new Editor(display, {
            layers: preparedData.getLayers()
        });

        await waitForEditorReady(editor);
        mapContainer = display.getContainer();
    });

    after(async function() {
        editor.destroy();
        display.destroy();
        await preparedData.clear();
    });

    it('hover POI, remove its routing point and disable editing should not throw', async function() {
        await waitForEditorReady(editor, ()=>{
            display.setZoomlevel(19);
        });

        const l = new features.Navlink([{x: 100, y: 100}, {x: 120, y: 400}], {featureClass: 'NAVLINK'});
        const p = new features.Place({x: 400, y: 300}, {featureClass: 'PLACE'});
        objs = editor.addFeature([l, p]);
        const place = objs[1];

        place.createRoutingPoint();
        expect(place.prop('routingLink')).to.equal(objs[0].id);

        const hovered = [];
        editor.addEventListener('pointerenter pointerleave', function(e) {
            // Get feature in event
            const feature = e.target;
            // mouse enters a place
            if (feature && feature.geometry.type == 'Point') {
                hovered.push(e.type);
            }
        });

        // mouse enters the place -> prv.isHovered is set to the event object
        await mousemove(mapContainer, {x: 380, y: 280}, {x: 400, y: 300});
        expect(hovered).to.include('pointerenter');

        // removes the routing point -> hideRoutingPoint(obj) without event -> prv.isHovered = true
        place.removeRoutingPoint();

        // _editable(false) -> `prv.isHovered.type = 'mouseout'` on a boolean -> TypeError in strict mode
        expect(() => place.editable(false)).to.not.throw();
    });
});
