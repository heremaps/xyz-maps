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

import {testUtils, prepare} from 'hereTest';
import dataset from './set_header_spec.json';

describe('set request header of requests that handled by provider', function() {
    const expect = chai.expect;

    var preparedData;
    var poiProvider;
    var placeProvider;
    var spaceProvider;

    before(async function() {
        preparedData = await prepare(dataset);

        let poiLayer = preparedData.getLayers('placeGeoJsonLayer');
        let placeLayer = preparedData.getLayers('placeLayer');
        let spaceLayer = preparedData.getLayers('spaceLayer');

        poiProvider = poiLayer.getProvider();
        placeProvider = placeLayer.getProvider();
        spaceProvider = spaceLayer.getProvider();
    });

    after(async function() {
        await preparedData.clear();
    });

    it('set header and make search with geojson provider', async function() {
        let monitor = new testUtils.MonitorXHR();
        // 1. make request with default headers
        let objs = poiProvider.search({
            point: {longitude: -95.936362, latitude: 28.885083},
            radius: 10,
            remote: true
        });

        let requestHeader = monitor.stop().requestHeader;
        expect(requestHeader).to.deep.equal({
            'Accept': 'application/geo+json'
        });


        monitor = new testUtils.MonitorXHR();
        // 2. set header and make requests
        poiProvider.setHeader('TEST', 'abc');
        objs = poiProvider.search({
            point: {longitude: -95.736362, latitude: 28.785083},
            radius: 10,
            remote: true
        });

        requestHeader = monitor.stop().requestHeader;
        expect(requestHeader).to.deep.equal({
            'Accept': 'application/geo+json',
            'TEST': 'abc'
        });


        monitor = new testUtils.MonitorXHR();
        // 3. make requests again with customized header
        objs = poiProvider.search({
            point: {longitude: -95.536362, latitude: 28.685083},
            radius: 10,
            remote: true
        });

        requestHeader = monitor.stop().requestHeader;
        expect(requestHeader).to.deep.equal({
            'Accept': 'application/geo+json',
            'TEST': 'abc'
        });


        monitor = new testUtils.MonitorXHR();
        // 4. make requests with set headers
        poiProvider.setHeaders({
            'TEST1': 'abc1',
            'TEST2': 'abc2'
        });
        objs = poiProvider.search({
            point: {longitude: -95.336362, latitude: 28.585083},
            radius: 10,
            remote: true
        });

        requestHeader = monitor.stop().requestHeader;
        expect(requestHeader).to.deep.equal({
            'Accept': 'application/geo+json',
            'TEST': 'abc',
            'TEST1': 'abc1',
            'TEST2': 'abc2'
        });


        monitor = new testUtils.MonitorXHR();
        // 5. overwrite header
        poiProvider.setHeader('TEST1', 'abcnew');
        objs = poiProvider.search({
            point: {longitude: -95.136362, latitude: 28.585083},
            radius: 10,
            remote: true
        });

        requestHeader = monitor.stop().requestHeader;
        expect(requestHeader).to.deep.equal({
            'Accept': 'application/geo+json',
            'TEST': 'abc',
            'TEST1': 'abcnew',
            'TEST2': 'abc2'
        });
    });


    it('set header and make search with space provider', async function() {
        let monitor = new testUtils.MonitorXHR();
        // 1. make request with default headers
        let objs = spaceProvider.search({
            point: {longitude: -95.936362, latitude: 28.885083},
            radius: 10,
            remote: true
        });

        let requestHeader = monitor.stop().requestHeader;
        expect(requestHeader).to.deep.equal({
            'Accept': 'application/geo+json'
        });


        monitor = new testUtils.MonitorXHR();
        // 2. set header and make requests
        spaceProvider.setHeader('TESTSPACE', 'abcspace');
        objs = spaceProvider.search({
            point: {longitude: -94.736362, latitude: 28.785083},
            radius: 10,
            remote: true
        });

        requestHeader = monitor.stop().requestHeader;
        expect(requestHeader).to.deep.equal({
            'Accept': 'application/geo+json',
            'TESTSPACE': 'abcspace'
        });


        monitor = new testUtils.MonitorXHR();
        // 3. make requests again with customized header
        objs = spaceProvider.search({
            point: {longitude: -95.536362, latitude: 28.685083},
            radius: 10,
            remote: true
        });

        requestHeader = monitor.stop().requestHeader;
        expect(requestHeader).to.deep.equal({
            'Accept': 'application/geo+json',
            'TESTSPACE': 'abcspace'
        });


        monitor = new testUtils.MonitorXHR();
        // 4. make requests with set headers
        spaceProvider.setHeaders({
            'TESTSPACE1': 'abcspace1',
            'TESTSPACE2': 'abcspace2'
        });
        objs = spaceProvider.search({
            point: {longitude: -95.336362, latitude: 28.585083},
            radius: 10,
            remote: true
        });

        requestHeader = monitor.stop().requestHeader;
        expect(requestHeader).to.deep.equal({
            'Accept': 'application/geo+json',
            'TESTSPACE': 'abcspace',
            'TESTSPACE1': 'abcspace1',
            'TESTSPACE2': 'abcspace2'
        });


        monitor = new testUtils.MonitorXHR();
        // 5. make requests with set headers
        spaceProvider.setHeader('TESTSPACE1', 'abcspacenew');
        objs = spaceProvider.search({
            point: {longitude: -95.136362, latitude: 28.585083},
            radius: 10,
            remote: true
        });

        requestHeader = monitor.stop().requestHeader;
        expect(requestHeader).to.deep.equal({
            'Accept': 'application/geo+json',
            'TESTSPACE': 'abcspace',
            'TESTSPACE1': 'abcspacenew',
            'TESTSPACE2': 'abcspace2'
        });
    });
});
