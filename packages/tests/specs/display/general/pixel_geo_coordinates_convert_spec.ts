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
import {waitForViewportReady} from 'displayUtils';
import {Map} from '@here/xyz-maps-display';
import chaiAlmost from 'chai-almost';
import dataset from './pixel_geo_coordinates_convert_spec.json';
import {describe, beforeAll, afterAll, it, chai} from 'vitest';

describe('convert pixel and geo coordinates', function() {
    var display;

    beforeAll(async function() {
        chai.use(chaiAlmost(1e-4));
        let preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 77.79802, latitude: 12.62214},
            zoomlevel: 18,
            layers: preparedData.getLayers()
        });
    });

    afterAll(async function() {
        display.destroy();
    });

    it('validate geotopixel function', function() {
        chai.expect(display.geoToPixel({longitude: 77.79802, latitude: 12.62214})).to.deep.almost({x: 400, y: 300});
        let center = display.getCenter();
        chai.expect(display.geoToPixel(center)).to.deep.almost({x: 400, y: 300});
        let vb = display.getViewBounds();
        chai.expect(display.geoToPixel({longitude: vb.minLon, latitude: vb.minLat})).to.deep.almost({x: 0, y: 600});
        chai.expect(display.geoToPixel({longitude: vb.maxLon, latitude: vb.maxLat})).to.deep.almost({x: 800, y: 0});
    });

    it('validate pixelToGeo function', function() {
        let coord = display.pixelToGeo({x: 400, y: 300});
        chai.expect(coord).to.be.deep.almost({longitude: 77.79802, latitude: 12.62214});
    });

    it('get display configures and then validate again', async function() {
        await waitForViewportReady(display, ()=>{
            display.setCenter({longitude: 8.71902, latitude: 50.1109});
        });

        chai.expect(display.geoToPixel({longitude: 8.71902, latitude: 50.1109})).to.deep.almost({x: 400, y: 300});
        let coord = display.pixelToGeo({x: 400, y: 300});
        chai.expect(coord).to.be.deep.almost({longitude: 8.71902, latitude: 50.1109});


        let center = display.getCenter();
        chai.expect(display.geoToPixel(center)).to.deep.almost({x: 400, y: 300});
        let vb = display.getViewBounds();
        let pixel = display.geoToPixel({longitude: vb.minLon, latitude: vb.minLat});
        chai.expect(pixel).to.be.deep.almost({x: 0, y: 600});

        pixel = display.geoToPixel({longitude: vb.maxLon, latitude: vb.maxLat});
        chai.expect(pixel).to.be.deep.almost({x: 800, y: 0});
    });

    it('validate pixelToGeo works at boarder', async function() {
        await waitForViewportReady(display, ()=>{
            display.setCenter({longitude: 0, latitude: 0});
        });
        await waitForViewportReady(display, ()=>{
            display.setZoomlevel(2);
        });

        let pixel = display.geoToPixel(-180, -90);
        chai.expect(pixel).to.be.deep.almost({x: -112, y: 812});

        pixel = display.geoToPixel(-120, -90);
        chai.expect(pixel).to.be.deep.almost({x: 58.66666666666663, y: 812});

        pixel = display.geoToPixel(180, -90);
        chai.expect(pixel).to.be.deep.almost({x: 912, y: 812});

        pixel = display.geoToPixel(-180, 90);
        chai.expect(pixel).to.be.deep.almost({x: -112, y: -212});

        pixel = display.geoToPixel(-120, 90);
        chai.expect(pixel).to.be.deep.almost({x: 58.66666666666663, y: -212});

        pixel = display.geoToPixel(180, 90);
        chai.expect(pixel).to.be.deep.almost({x: 912, y: -212});
    });
});
