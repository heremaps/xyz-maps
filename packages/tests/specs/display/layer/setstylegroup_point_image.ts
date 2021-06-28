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

import {waitForViewportReady} from 'displayUtils';
import {getCanvasPixelColor, prepare} from 'utils';
import {Map} from '@here/xyz-maps-display';
import dataset from './setstylegroup_point_image.json';

const IMAGE_SRC = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABoAAAAaCAYAAACpSkzOAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAABy2lUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iWE1QIENvcmUgNS40LjAiPgogICA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPgogICAgICA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIgogICAgICAgICAgICB4bWxuczp0aWZmPSJodHRwOi8vbnMuYWRvYmUuY29tL3RpZmYvMS4wLyIKICAgICAgICAgICAgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIj4KICAgICAgICAgPHRpZmY6T3JpZW50YXRpb24+MTwvdGlmZjpPcmllbnRhdGlvbj4KICAgICAgICAgPHhtcDpDcmVhdG9yVG9vbD5BZG9iZSBJbWFnZVJlYWR5PC94bXA6Q3JlYXRvclRvb2w+CiAgICAgIDwvcmRmOkRlc2NyaXB0aW9uPgogICA8L3JkZjpSREY+CjwveDp4bXBtZXRhPgqyI37xAAABsklEQVRIDWNkYGCoB2IHID4IxFgACyuDfIgnA7eUIRZJiND7G7sZnu84ycDw7y8ONfYsQAlGIAZZ0gDEmCD0Ig8DI6MEUAK3RQwMexi4pk5iWKD4A9MAsEgDEw4JqguPWkR2kA6/oGMBpm9mUHj8VmDgwBYuJa9Xc/SLBDH/YwLlBOyA5f9P1u4HqzgKFLDLsz5gYGYJZWcwB0uzM+RhU1b+ejLbGR4trYNcOtikwWJxHw9bx7/sYmBgZ/iNTRHIDhYDDgZXsOR/KI2mkvvfJwadHw8Y8Flk8P2GJ9f/H54M/9E0Q7lAOxiGX2IY9RH22CZClOXhL4bzYHX/oTSapl9MbCxPWMUsgMJqaFJw7iM26dN/GFmusf//hbU+AtphyDLnO8N2kI6pbAztcJ1IjGkS+dxbeA2BmQS3RVMEPTep/n04I+31LKz1EdCOSpZfwEIBZC7jVYYvSOYjmFrRINk/CAFM1g8mjl/pCpVf0g9gtwio4/doqsMMNyJFhl/QgSoZUJnrAMQNQIwJVuuD2nWGwHYdphxM5P0NF2C7jhfIxZqPgOLgdh2s4Qhq39EKHAAAniRovB1Mcr0AAAAASUVORK5CYII=';

describe('setStyleGroup Point with image', function() {
    const expect = chai.expect;

    let linkLayer;
    let paLayer;
    let display;
    let mapContainer;
    let feature;

    before(async () => {
        let preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            // @ts-ignore
            renderOptions: {
                preserveDrawingBuffer: true
            },
            center: {longitude: 73.76268, latitude: 20.291689},
            zoomlevel: 18,
            layers: preparedData.getLayers()
        });
        await waitForViewportReady(display);

        mapContainer = display.getContainer();
        paLayer = preparedData.getLayers('paLayer');

        // get a feature
        feature = preparedData.getFeature('paLayer', '123');
    });

    after(async () => {
        display.destroy();
    });

    it('style feature with image and opacity, validate its style', async () => {
        // set style for the added feature
        paLayer.setStyleGroup(feature, [{
            'zIndex': 0, 'type': 'Image', 'width': 30, 'height': 30, 'src': IMAGE_SRC
        }]);

        // validate features have new style
        // get color in the center
        // get color mid left
        // get color mid right
        // get color mid top
        // get color mid bottom
        let colors = await getCanvasPixelColor(mapContainer, [
            {x: 400, y: 300}, {x: 390, y: 300}, {x: 410, y: 300}, {x: 400, y: 290}, {x: 400, y: 310}
        ]);

        expect(colors[0]).to.not.equal('#ffffff');
        expect(colors[1]).to.not.equal('#ffffff');
        expect(colors[2]).to.not.equal('#ffffff');
        expect(colors[3]).to.not.equal('#ffffff');
        expect(colors[4]).to.not.equal('#ffffff');

        // set style for the added feature with opacity
        paLayer.setStyleGroup(feature, [{
            'zIndex': 0, 'type': 'Image', 'width': 30, 'height': 30,
            'opacity': 0.5,
            'src': IMAGE_SRC
        }]);

        // validate features have new style
        // get color in the center
        // get color mid left
        // get color mid right
        // get color mid top
        // get color mid bottom
        let opacolors = await getCanvasPixelColor(mapContainer, [
            {x: 400, y: 300}, {x: 390, y: 300}, {x: 410, y: 300}, {x: 400, y: 290}, {x: 400, y: 310}
        ]);

        expect(colors[0]).to.not.equal(opacolors[0]);
        expect(colors[1]).to.not.equal(opacolors[1]);
        expect(colors[2]).to.not.equal(opacolors[2]);
        expect(colors[3]).to.not.equal(opacolors[3]);
        expect(colors[4]).to.not.equal(opacolors[4]);
    });

    it('style feature with image and offsetX, validate its style', async () => {
        // set style for the added feature
        paLayer.setStyleGroup(feature, [{
            'zIndex': 1, 'type': 'Image', 'width': 30, 'height': 30,
            'offsetX': 10,
            'src': IMAGE_SRC
        }]);

        // validate features have new style
        // get color in the center
        // get color mid left
        // get color mid right
        // get color mid top
        // get color mid bottom
        let colors = await getCanvasPixelColor(mapContainer, [
            {x: 400, y: 300}, {x: 390, y: 300}, {x: 410, y: 300}, {x: 400, y: 290}, {x: 400, y: 310}
        ]);

        expect(colors[0]).to.not.equal('#ffffff');
        expect(colors[1]).to.equal('#ffffff');
        expect(colors[2]).to.not.equal('#ffffff');
        expect(colors[3]).to.equal('#ffffff');
        expect(colors[4]).to.equal('#ffffff');
    });

    it('style feature with image and offsetX again, validate its style', async () => {
        // set style for the added feature
        paLayer.setStyleGroup(feature, [{
            'zIndex': 0, 'type': 'Image', 'width': 30, 'height': 30,
            'offsetX': -10,
            'src': IMAGE_SRC
        }]);

        // validate features have new style
        // get color in the center
        // get color mid left
        // get color mid right
        // get color mid top
        // get color mid bottom
        let colors = await getCanvasPixelColor(mapContainer, [
            {x: 400, y: 300}, {x: 390, y: 300}, {x: 410, y: 300}, {x: 400, y: 290}, {x: 400, y: 310}
        ]);

        expect(colors[0]).to.not.equal('#ffffff');
        expect(colors[1]).to.not.equal('#ffffff');
        expect(colors[2]).to.equal('#ffffff');
        expect(colors[3]).to.equal('#ffffff');
        expect(colors[4]).to.equal('#ffffff');
    });

    it('style feature with image and offsetY, validate its style', async () => {
        // set style for the added feature
        paLayer.setStyleGroup(feature, [{
            'zIndex': 0, 'type': 'Image', 'width': 30, 'height': 30,
            'offsetY': 10,
            'src': IMAGE_SRC
        }]);

        // validate features have new style
        // get color in the center
        // get color mid left
        // get color mid right
        // get color mid top
        // get color mid bottom
        let colors = await getCanvasPixelColor(mapContainer, [
            {x: 400, y: 300}, {x: 390, y: 300}, {x: 410, y: 300}, {x: 400, y: 290}, {x: 400, y: 310}
        ]);

        expect(colors[0]).to.not.equal('#ffffff');
        expect(colors[1]).to.equal('#ffffff');
        expect(colors[2]).to.equal('#ffffff');
        expect(colors[3]).to.equal('#ffffff');
        expect(colors[4]).to.not.equal('#ffffff');
    });

    it('style feature with image and offsetY again, validate its style', async () => {
        // set style for the added feature
        paLayer.setStyleGroup(feature, [{
            'zIndex': 0, 'type': 'Image', 'width': 30, 'height': 30,
            'offsetY': -10,
            'src': IMAGE_SRC
        }]);

        // validate features have new style
        // get color in the center
        // get color mid left
        // get color mid right
        // get color mid top
        // get color mid bottom
        let colors = await getCanvasPixelColor(mapContainer, [
            {x: 400, y: 300}, {x: 390, y: 300}, {x: 410, y: 300}, {x: 400, y: 290}, {x: 400, y: 310}
        ]);

        expect(colors[0]).to.not.equal('#ffffff');
        expect(colors[1]).to.equal('#ffffff');
        expect(colors[2]).to.equal('#ffffff');
        expect(colors[3]).to.not.equal('#ffffff');
        expect(colors[4]).to.equal('#ffffff');
    });

    it('style feature with image and offsetX and offsetY, validate its style', async () => {
        // set style for the added feature
        paLayer.setStyleGroup(feature, [{
            'zIndex': 0, 'type': 'Image', 'width': 30, 'height': 30,
            'offsetY': 10,
            'offsetX': 10,
            'src': IMAGE_SRC
        }]);

        // validate features have new style
        // get color in the center
        // get color mid left
        // get color mid right
        // get color mid top
        // get color mid bottom
        let colors = await getCanvasPixelColor(mapContainer, [
            {x: 400, y: 300}, {x: 390, y: 300}, {x: 410, y: 300}, {x: 400, y: 290}, {x: 400, y: 310}
        ]);

        expect(colors[0]).to.equal('#ffffff');
        expect(colors[1]).to.equal('#ffffff');
        expect(colors[2]).to.not.equal('#ffffff');
        expect(colors[3]).to.equal('#ffffff');
        expect(colors[4]).to.not.equal('#ffffff');
    });
});
