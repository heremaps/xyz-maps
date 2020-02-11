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

import {prepare} from 'hereTest';
import dataset from './set_style_spec.json';

describe('set features style and restore', function() {
    const expect = chai.expect;

    var preparedData;
    var buildingLayer;
    var linkLayer;
    var placeLayer;
    var addrLayer;
    var addrProvider;

    before(async function() {
        preparedData = await prepare(dataset);

        buildingLayer = preparedData.getLayers('buildingLayer');
        linkLayer = preparedData.getLayers('linkLayer');
        placeLayer = preparedData.getLayers('placeLayer');
        addrLayer = preparedData.getLayers('paLayer');
        addrProvider = addrLayer.getProvider();
    });

    after(async function() {
        await preparedData.clear();
    });

    it('get style and validate', function() {
        expect(buildingLayer.getStyle().styleGroups['MultiPolygon'][0]).to.deep.include({'zIndex': 0, 'type': 'Polygon'});

        expect(linkLayer.getStyle().styleGroups['LineString'][0]).to.deep.include({'zIndex': 0, 'type': 'Line'});

        expect(placeLayer.getStyle().styleGroups['Point'][0]).to.deep.include({'zIndex': 0, 'type': 'Circle'});
    });

    it('search by point and radius and validate object is returned', async function() {
        await new Promise((resolve) => {
            let objs = addrLayer.search({
                point: {longitude: 80.01097, latitude: 13.00157},
                radius: 50,
                remote: true,
                onload: resolve
            });

            expect(objs).to.equal(undefined);
        });
    });

    it('get address style and validate', function() {
        let styles = addrLayer.getStyle();

        expect(styles.styleGroups.Point).to.deep.equal([
            {zIndex: 0, type: 'Circle', radius: 6, fill: '#ff0000'}
        ]);
    });


    it('get address feature style and validate', function() {
        let pa = preparedData.getFeature('paLayer', -804);

        let styles = addrLayer.getStyleGroup(pa);

        expect(styles).to.deep.equal([
            {zIndex: 0, type: 'Circle', radius: 6, fill: '#ff0000'}
        ]);
    });

    it('set address feature style', function() {
        let pa = preparedData.getFeature('paLayer', -804);

        addrLayer.setStyleGroup(pa, [
            {'zIndex': 0, 'type': 'Rect', 'fill': '#FFFFFF', 'width': 32, 'height': 32}
        ]);

        let styles = addrLayer.getStyleGroup(pa);

        expect(styles).to.deep.equal([
            {'zIndex': 0, 'type': 'Rect', 'fill': '#FFFFFF', 'width': 32, 'height': 32}
        ]);
    });

    it('reset feature style', function() {
        let pa = preparedData.getFeature('paLayer', -804);

        addrLayer.setStyleGroup(pa);

        let styles = addrLayer.getStyleGroup(pa);

        expect(styles).to.deep.equal([
            {zIndex: 0, type: 'Circle', radius: 6, fill: '#ff0000'}
        ]);
    });
});
