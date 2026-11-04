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
import dataset from './pixel-geo-conversion.json';
import {describe, beforeEach, afterEach, it, expect} from 'vitest';

describe('Pixel geo conversion', function() {
    var display;

    beforeEach(async function() {
        let preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 77.79802, latitude: 12.62214},
            zoomlevel: 18,
            layers: preparedData.getLayers()
        });
    });

    afterEach(async function() {
        display.destroy();
    });

    it('validate geotopixel function', function() {
        expect(display.geoToPixel({longitude: 77.79802, latitude: 12.62214})).toEqualWithTolerance({x: 400, y: 300}, 1e-4);
        let center = display.getCenter();
        expect(display.geoToPixel(center)).toEqualWithTolerance({x: 400, y: 300}, 1e-4);
        let vb = display.getViewBounds();
        expect(display.geoToPixel({longitude: vb.minLon, latitude: vb.minLat})).toEqualWithTolerance({x: 0, y: 600}, 1e-4);
        expect(display.geoToPixel({longitude: vb.maxLon, latitude: vb.maxLat})).toEqualWithTolerance({x: 800, y: 0}, 1e-4);
    });

    it('validate pixelToGeo function', function() {
        let coord = display.pixelToGeo({x: 400, y: 300});
        expect(coord).toEqualWithTolerance({longitude: 77.79802, latitude: 12.62214}, 1e-4);
    });

    it('get display configures and then validate again', async function() {
        await waitForViewportReady(display, ()=>{
            display.setCenter({longitude: 8.71902, latitude: 50.1109});
        });

        expect(display.geoToPixel({longitude: 8.71902, latitude: 50.1109})).toEqualWithTolerance({x: 400, y: 300}, 1e-4);
        let coord = display.pixelToGeo({x: 400, y: 300});
        expect(coord).toEqualWithTolerance({longitude: 8.71902, latitude: 50.1109}, 1e-4);


        let center = display.getCenter();
        expect(display.geoToPixel(center)).toEqualWithTolerance({x: 400, y: 300}, 1e-4);
        let vb = display.getViewBounds();
        let pixel = display.geoToPixel({longitude: vb.minLon, latitude: vb.minLat});
        expect(pixel).toEqualWithTolerance({x: 0, y: 600}, 1e-4);

        pixel = display.geoToPixel({longitude: vb.maxLon, latitude: vb.maxLat});
        expect(pixel).toEqualWithTolerance({x: 800, y: 0}, 1e-4);
    });

    it('validate pixelToGeo works at boarder', async function() {
        await waitForViewportReady(display, ()=>{
            display.setCenter({longitude: 0, latitude: 0});
        });
        await waitForViewportReady(display, ()=>{
            display.setZoomlevel(2);
        });

        let pixel = display.geoToPixel(-180, -90);
        expect(pixel).toEqualWithTolerance({x: -112, y: 812}, 1e-4);

        pixel = display.geoToPixel(-120, -90);
        expect(pixel).toEqualWithTolerance({x: 58.66666666666663, y: 812}, 1e-4);

        pixel = display.geoToPixel(180, -90);
        expect(pixel).toEqualWithTolerance({x: 912, y: 812}, 1e-4);

        pixel = display.geoToPixel(-180, 90);
        expect(pixel).toEqualWithTolerance({x: -112, y: -212}, 1e-4);

        pixel = display.geoToPixel(-120, 90);
        expect(pixel).toEqualWithTolerance({x: 58.66666666666663, y: -212}, 1e-4);

        pixel = display.geoToPixel(180, 90);
        expect(pixel).toEqualWithTolerance({x: 912, y: -212}, 1e-4);
    });
});
