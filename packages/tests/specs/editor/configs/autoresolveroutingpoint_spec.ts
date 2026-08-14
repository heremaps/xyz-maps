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
import {Map} from '@here/xyz-maps-display';
import {Editor} from '@here/xyz-maps-editor';
// @ts-ignore @deprecated
import {features} from '@here/xyz-maps-editor';
import dataset from './maxroutingpointdistance_spec.json';

describe('autoResolveRoutingPoint configuration', function() {
    const expect = chai.expect;
    let preparedData;
    let display;
    let editor;

    beforeEach(async function() {
        preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 77.84172527566523, latitude: 17.450976000022266},
            zoomlevel: 19,
            layers: preparedData.getLayers()
        });
    });

    afterEach(async function() {
        if (editor) {
            editor.destroy();
        }
        display.destroy();
        await preparedData.clear();
    });

    function addNearbyLocations(options?, configure?) {
        editor = new Editor(display, {
            layers: preparedData.getLayers(),
            ...options
        });

        const link = new features.Navlink([{x: 100, y: 300}, {x: 400, y: 300}], {featureClass: 'NAVLINK'});
        const address = new features.Address({x: 200, y: 250}, {featureClass: 'ADDRESS'});
        const place = new features.Place({x: 300, y: 250}, {featureClass: 'PLACE'});
        let added;

        return waitForEditorReady(editor, () => {
            added = editor.addFeature([link, address, place]);

            if (configure) {
                configure(added[1], added[2]);
            }
        }).then(() => ({
            link: added[0],
            address: added[1],
            place: added[2]
        }));
    }

    it('resolves Address by default but not Place', async function() {
        let {link, address, place} = await addNearbyLocations();

        expect(address.getLink()).to.equal(link);
        expect(address.prop('routingPoint')).to.exist;
        expect(place.getLink()).to.equal(null);
        expect(place.prop('routingPoint')).to.equal(undefined);
    });

    it('resolves Place instead of Address when configured per class', async function() {
        let {link, address, place} = await addNearbyLocations({
            place: {
                autoResolveRoutingPoint: true
            },
            address: {
                autoResolveRoutingPoint: false
            }
        });

        expect(address.getLink()).to.equal(null);
        expect(address.prop('routingPoint')).to.equal(undefined);
        expect(place.getLink()).to.equal(link);
        expect(place.prop('routingPoint')).to.exist;
    });

    it('allows per-feature behavior to override the global setting', async function() {
        let {link, address, place} = await addNearbyLocations({
            address: {
                autoResolveRoutingPoint: false
            },
            place: {
                autoResolveRoutingPoint: false
            }
        }, (address, place) => {
            address.behavior('autoResolveRoutingPoint', false);
            place.behavior('autoResolveRoutingPoint', true);
        });

        expect(address.getLink()).to.equal(null);
        place.createRoutingPoint();
        expect(place.getLink()).to.equal(link);
    });

    it('explicitly resolves a Place with createRoutingPoint when disabled', async function() {
        let {link, place} = await addNearbyLocations({
            place: {
                autoResolveRoutingPoint: false
            }
        });

        expect(place.getLink()).to.equal(null);
        place.createRoutingPoint();

        expect(place.getLink()).to.equal(link);
        expect(place.prop('routingPoint')).to.exist;
    });
});
