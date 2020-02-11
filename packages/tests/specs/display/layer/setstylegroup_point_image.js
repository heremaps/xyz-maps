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

import {displayTests, prepare, testUtils} from 'hereTest';
import {Map} from '@here/xyz-maps-core';
import dataset from './setstylegroup_point_image.json';

describe('setStyleGroup Point with image', function() {
    const expect = chai.expect;

    let linkLayer;
    let paLayer;
    let display;
    let mapContainer;
    let feature;

    before(async function() {
        let preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            renderOptions: {
                preserveDrawingBuffer: true
            },
            center: {longitude: 73.76268, latitude: 20.291689},
            zoomLevel: 18,
            layers: preparedData.getLayers()
        });
        await displayTests.waitForViewportReady(display);

        mapContainer = display.getContainer();
        paLayer = preparedData.getLayers('paLayer');

        // get a feature
        feature = preparedData.getFeature('paLayer', '123');
    });

    after(async function() {
        display.destroy();
    });

    it('style feature with image and opacity, validate its style', async function() {
        let color1;
        let color2;
        let color3;
        let color4;
        let color5;

        // set style for the added feature
        paLayer.setStyleGroup(
            feature, [
                {'zIndex': 0, 'type': 'Image', 'width': 30, 'height': 30, 'src': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABoAAAAaCAYAAACpSkzOAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAABy2lUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iWE1QIENvcmUgNS40LjAiPgogICA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPgogICAgICA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIgogICAgICAgICAgICB4bWxuczp0aWZmPSJodHRwOi8vbnMuYWRvYmUuY29tL3RpZmYvMS4wLyIKICAgICAgICAgICAgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIj4KICAgICAgICAgPHRpZmY6T3JpZW50YXRpb24+MTwvdGlmZjpPcmllbnRhdGlvbj4KICAgICAgICAgPHhtcDpDcmVhdG9yVG9vbD5BZG9iZSBJbWFnZVJlYWR5PC94bXA6Q3JlYXRvclRvb2w+CiAgICAgIDwvcmRmOkRlc2NyaXB0aW9uPgogICA8L3JkZjpSREY+CjwveDp4bXBtZXRhPgqyI37xAAABsklEQVRIDWNkYGCoB2IHID4IxFgACyuDfIgnA7eUIRZJiND7G7sZnu84ycDw7y8ONfYsQAlGIAZZ0gDEmCD0Ig8DI6MEUAK3RQwMexi4pk5iWKD4A9MAsEgDEw4JqguPWkR2kA6/oGMBpm9mUHj8VmDgwBYuJa9Xc/SLBDH/YwLlBOyA5f9P1u4HqzgKFLDLsz5gYGYJZWcwB0uzM+RhU1b+ejLbGR4trYNcOtikwWJxHw9bx7/sYmBgZ/iNTRHIDhYDDgZXsOR/KI2mkvvfJwadHw8Y8Flk8P2GJ9f/H54M/9E0Q7lAOxiGX2IY9RH22CZClOXhL4bzYHX/oTSapl9MbCxPWMUsgMJqaFJw7iM26dN/GFmusf//hbU+AtphyDLnO8N2kI6pbAztcJ1IjGkS+dxbeA2BmQS3RVMEPTep/n04I+31LKz1EdCOSpZfwEIBZC7jVYYvSOYjmFrRINk/CAFM1g8mjl/pCpVf0g9gtwio4/doqsMMNyJFhl/QgSoZUJnrAMQNQIwJVuuD2nWGwHYdphxM5P0NF2C7jhfIxZqPgOLgdh2s4Qhq39EKHAAAniRovB1Mcr0AAAAASUVORK5CYII='}
            ]);

        // validate features have new style
        await new Promise((resolve) => {
            setTimeout(() => {
                color1 = testUtils.getCanvasPixelColor(mapContainer, 400, 300); // get color in the center
                color2 = testUtils.getCanvasPixelColor(mapContainer, 390, 300); // get color mid left
                color3 = testUtils.getCanvasPixelColor(mapContainer, 410, 300); // get color mid right
                color4 = testUtils.getCanvasPixelColor(mapContainer, 400, 290); // get color mid top
                color5 = testUtils.getCanvasPixelColor(mapContainer, 400, 310); // get color mid bottom

                expect(color1).to.not.equal('#ffffff');
                expect(color2).to.not.equal('#ffffff');
                expect(color3).to.not.equal('#ffffff');
                expect(color4).to.not.equal('#ffffff');
                expect(color5).to.not.equal('#ffffff');

                resolve();
            }, 100);
        });


        // set style for the added feature with opacity
        paLayer.setStyleGroup(
            feature, [{
                'zIndex': 0, 'type': 'Image', 'width': 30, 'height': 30,
                'opacity': 0.5,
                'src': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABoAAAAaCAYAAACpSkzOAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAABy2lUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iWE1QIENvcmUgNS40LjAiPgogICA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPgogICAgICA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIgogICAgICAgICAgICB4bWxuczp0aWZmPSJodHRwOi8vbnMuYWRvYmUuY29tL3RpZmYvMS4wLyIKICAgICAgICAgICAgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIj4KICAgICAgICAgPHRpZmY6T3JpZW50YXRpb24+MTwvdGlmZjpPcmllbnRhdGlvbj4KICAgICAgICAgPHhtcDpDcmVhdG9yVG9vbD5BZG9iZSBJbWFnZVJlYWR5PC94bXA6Q3JlYXRvclRvb2w+CiAgICAgIDwvcmRmOkRlc2NyaXB0aW9uPgogICA8L3JkZjpSREY+CjwveDp4bXBtZXRhPgqyI37xAAABsklEQVRIDWNkYGCoB2IHID4IxFgACyuDfIgnA7eUIRZJiND7G7sZnu84ycDw7y8ONfYsQAlGIAZZ0gDEmCD0Ig8DI6MEUAK3RQwMexi4pk5iWKD4A9MAsEgDEw4JqguPWkR2kA6/oGMBpm9mUHj8VmDgwBYuJa9Xc/SLBDH/YwLlBOyA5f9P1u4HqzgKFLDLsz5gYGYJZWcwB0uzM+RhU1b+ejLbGR4trYNcOtikwWJxHw9bx7/sYmBgZ/iNTRHIDhYDDgZXsOR/KI2mkvvfJwadHw8Y8Flk8P2GJ9f/H54M/9E0Q7lAOxiGX2IY9RH22CZClOXhL4bzYHX/oTSapl9MbCxPWMUsgMJqaFJw7iM26dN/GFmusf//hbU+AtphyDLnO8N2kI6pbAztcJ1IjGkS+dxbeA2BmQS3RVMEPTep/n04I+31LKz1EdCOSpZfwEIBZC7jVYYvSOYjmFrRINk/CAFM1g8mjl/pCpVf0g9gtwio4/doqsMMNyJFhl/QgSoZUJnrAMQNQIwJVuuD2nWGwHYdphxM5P0NF2C7jhfIxZqPgOLgdh2s4Qhq39EKHAAAniRovB1Mcr0AAAAASUVORK5CYII='}
            ]);

        // validate features have new style
        await new Promise((resolve) => {
            setTimeout(() => {
                let opacolor1 = testUtils.getCanvasPixelColor(mapContainer, 400, 300); // get color in the center
                let opacolor2 = testUtils.getCanvasPixelColor(mapContainer, 390, 300); // get color mid left
                let opacolor3 = testUtils.getCanvasPixelColor(mapContainer, 410, 300); // get color mid right
                let opacolor4 = testUtils.getCanvasPixelColor(mapContainer, 400, 290); // get color mid top
                let opacolor5 = testUtils.getCanvasPixelColor(mapContainer, 400, 310); // get color mid bottom

                // different opacity, different color
                expect(color1).to.not.equal(opacolor1);
                expect(color2).to.not.equal(opacolor2);
                expect(color3).to.not.equal(opacolor3);
                expect(color4).to.not.equal(opacolor4);
                expect(color5).to.not.equal(opacolor5);

                resolve();
            }, 100);
        });
    });

    it('style feature with image and offsetX, validate its style', async function() {
        // set style for the added feature
        paLayer.setStyleGroup(
            feature, [{
                'zIndex': 0, 'type': 'Image', 'width': 30, 'height': 30,
                'offsetX': 10,
                'src': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABoAAAAaCAYAAACpSkzOAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAABy2lUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iWE1QIENvcmUgNS40LjAiPgogICA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPgogICAgICA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIgogICAgICAgICAgICB4bWxuczp0aWZmPSJodHRwOi8vbnMuYWRvYmUuY29tL3RpZmYvMS4wLyIKICAgICAgICAgICAgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIj4KICAgICAgICAgPHRpZmY6T3JpZW50YXRpb24+MTwvdGlmZjpPcmllbnRhdGlvbj4KICAgICAgICAgPHhtcDpDcmVhdG9yVG9vbD5BZG9iZSBJbWFnZVJlYWR5PC94bXA6Q3JlYXRvclRvb2w+CiAgICAgIDwvcmRmOkRlc2NyaXB0aW9uPgogICA8L3JkZjpSREY+CjwveDp4bXBtZXRhPgqyI37xAAABsklEQVRIDWNkYGCoB2IHID4IxFgACyuDfIgnA7eUIRZJiND7G7sZnu84ycDw7y8ONfYsQAlGIAZZ0gDEmCD0Ig8DI6MEUAK3RQwMexi4pk5iWKD4A9MAsEgDEw4JqguPWkR2kA6/oGMBpm9mUHj8VmDgwBYuJa9Xc/SLBDH/YwLlBOyA5f9P1u4HqzgKFLDLsz5gYGYJZWcwB0uzM+RhU1b+ejLbGR4trYNcOtikwWJxHw9bx7/sYmBgZ/iNTRHIDhYDDgZXsOR/KI2mkvvfJwadHw8Y8Flk8P2GJ9f/H54M/9E0Q7lAOxiGX2IY9RH22CZClOXhL4bzYHX/oTSapl9MbCxPWMUsgMJqaFJw7iM26dN/GFmusf//hbU+AtphyDLnO8N2kI6pbAztcJ1IjGkS+dxbeA2BmQS3RVMEPTep/n04I+31LKz1EdCOSpZfwEIBZC7jVYYvSOYjmFrRINk/CAFM1g8mjl/pCpVf0g9gtwio4/doqsMMNyJFhl/QgSoZUJnrAMQNQIwJVuuD2nWGwHYdphxM5P0NF2C7jhfIxZqPgOLgdh2s4Qhq39EKHAAAniRovB1Mcr0AAAAASUVORK5CYII='
            }]);

        // validate features have new style
        await new Promise((resolve) => {
            setTimeout(() => {
                let color1 = testUtils.getCanvasPixelColor(mapContainer, 400, 300); // get color in the center
                let color2 = testUtils.getCanvasPixelColor(mapContainer, 390, 300); // get color mid left
                let color3 = testUtils.getCanvasPixelColor(mapContainer, 410, 300); // get color mid right
                let color4 = testUtils.getCanvasPixelColor(mapContainer, 400, 290); // get color mid top
                let color5 = testUtils.getCanvasPixelColor(mapContainer, 400, 310); // get color mid bottom

                expect(color1).to.not.equal('#ffffff');
                expect(color2).to.equal('#ffffff');
                expect(color3).to.not.equal('#ffffff');
                expect(color4).to.equal('#ffffff');
                expect(color5).to.equal('#ffffff');

                resolve();
            }, 100);
        });
    });

    it('style feature with image and offsetX again, validate its style', async function() {
        // set style for the added feature
        paLayer.setStyleGroup(
            feature, [{
                'zIndex': 0, 'type': 'Image', 'width': 30, 'height': 30,
                'offsetX': -10,
                'src': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABoAAAAaCAYAAACpSkzOAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAABy2lUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iWE1QIENvcmUgNS40LjAiPgogICA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPgogICAgICA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIgogICAgICAgICAgICB4bWxuczp0aWZmPSJodHRwOi8vbnMuYWRvYmUuY29tL3RpZmYvMS4wLyIKICAgICAgICAgICAgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIj4KICAgICAgICAgPHRpZmY6T3JpZW50YXRpb24+MTwvdGlmZjpPcmllbnRhdGlvbj4KICAgICAgICAgPHhtcDpDcmVhdG9yVG9vbD5BZG9iZSBJbWFnZVJlYWR5PC94bXA6Q3JlYXRvclRvb2w+CiAgICAgIDwvcmRmOkRlc2NyaXB0aW9uPgogICA8L3JkZjpSREY+CjwveDp4bXBtZXRhPgqyI37xAAABsklEQVRIDWNkYGCoB2IHID4IxFgACyuDfIgnA7eUIRZJiND7G7sZnu84ycDw7y8ONfYsQAlGIAZZ0gDEmCD0Ig8DI6MEUAK3RQwMexi4pk5iWKD4A9MAsEgDEw4JqguPWkR2kA6/oGMBpm9mUHj8VmDgwBYuJa9Xc/SLBDH/YwLlBOyA5f9P1u4HqzgKFLDLsz5gYGYJZWcwB0uzM+RhU1b+ejLbGR4trYNcOtikwWJxHw9bx7/sYmBgZ/iNTRHIDhYDDgZXsOR/KI2mkvvfJwadHw8Y8Flk8P2GJ9f/H54M/9E0Q7lAOxiGX2IY9RH22CZClOXhL4bzYHX/oTSapl9MbCxPWMUsgMJqaFJw7iM26dN/GFmusf//hbU+AtphyDLnO8N2kI6pbAztcJ1IjGkS+dxbeA2BmQS3RVMEPTep/n04I+31LKz1EdCOSpZfwEIBZC7jVYYvSOYjmFrRINk/CAFM1g8mjl/pCpVf0g9gtwio4/doqsMMNyJFhl/QgSoZUJnrAMQNQIwJVuuD2nWGwHYdphxM5P0NF2C7jhfIxZqPgOLgdh2s4Qhq39EKHAAAniRovB1Mcr0AAAAASUVORK5CYII='
            }]);

        // validate features have new style
        await new Promise((resolve) => {
            setTimeout(() => {
                let color1 = testUtils.getCanvasPixelColor(mapContainer, 400, 300); // get color in the center
                let color2 = testUtils.getCanvasPixelColor(mapContainer, 390, 300); // get color mid left
                let color3 = testUtils.getCanvasPixelColor(mapContainer, 410, 300); // get color mid right
                let color4 = testUtils.getCanvasPixelColor(mapContainer, 400, 290); // get color mid top
                let color5 = testUtils.getCanvasPixelColor(mapContainer, 400, 310); // get color mid bottom

                expect(color1).to.not.equal('#ffffff');
                expect(color2).to.not.equal('#ffffff');
                expect(color3).to.equal('#ffffff');
                expect(color4).to.equal('#ffffff');
                expect(color5).to.equal('#ffffff');

                resolve();
            }, 100);
        });
    });

    it('style feature with image and offsetY, validate its style', async function() {
        // set style for the added feature
        paLayer.setStyleGroup(
            feature, [{
                'zIndex': 0, 'type': 'Image', 'width': 30, 'height': 30,
                'offsetY': 10,
                'src': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABoAAAAaCAYAAACpSkzOAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAABy2lUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iWE1QIENvcmUgNS40LjAiPgogICA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPgogICAgICA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIgogICAgICAgICAgICB4bWxuczp0aWZmPSJodHRwOi8vbnMuYWRvYmUuY29tL3RpZmYvMS4wLyIKICAgICAgICAgICAgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIj4KICAgICAgICAgPHRpZmY6T3JpZW50YXRpb24+MTwvdGlmZjpPcmllbnRhdGlvbj4KICAgICAgICAgPHhtcDpDcmVhdG9yVG9vbD5BZG9iZSBJbWFnZVJlYWR5PC94bXA6Q3JlYXRvclRvb2w+CiAgICAgIDwvcmRmOkRlc2NyaXB0aW9uPgogICA8L3JkZjpSREY+CjwveDp4bXBtZXRhPgqyI37xAAABsklEQVRIDWNkYGCoB2IHID4IxFgACyuDfIgnA7eUIRZJiND7G7sZnu84ycDw7y8ONfYsQAlGIAZZ0gDEmCD0Ig8DI6MEUAK3RQwMexi4pk5iWKD4A9MAsEgDEw4JqguPWkR2kA6/oGMBpm9mUHj8VmDgwBYuJa9Xc/SLBDH/YwLlBOyA5f9P1u4HqzgKFLDLsz5gYGYJZWcwB0uzM+RhU1b+ejLbGR4trYNcOtikwWJxHw9bx7/sYmBgZ/iNTRHIDhYDDgZXsOR/KI2mkvvfJwadHw8Y8Flk8P2GJ9f/H54M/9E0Q7lAOxiGX2IY9RH22CZClOXhL4bzYHX/oTSapl9MbCxPWMUsgMJqaFJw7iM26dN/GFmusf//hbU+AtphyDLnO8N2kI6pbAztcJ1IjGkS+dxbeA2BmQS3RVMEPTep/n04I+31LKz1EdCOSpZfwEIBZC7jVYYvSOYjmFrRINk/CAFM1g8mjl/pCpVf0g9gtwio4/doqsMMNyJFhl/QgSoZUJnrAMQNQIwJVuuD2nWGwHYdphxM5P0NF2C7jhfIxZqPgOLgdh2s4Qhq39EKHAAAniRovB1Mcr0AAAAASUVORK5CYII='
            }]);

        // validate features have new style
        await new Promise((resolve) => {
            setTimeout(() => {
                let color1 = testUtils.getCanvasPixelColor(mapContainer, 400, 300); // get color in the center
                let color2 = testUtils.getCanvasPixelColor(mapContainer, 390, 300); // get color mid left
                let color3 = testUtils.getCanvasPixelColor(mapContainer, 410, 300); // get color mid right
                let color4 = testUtils.getCanvasPixelColor(mapContainer, 400, 290); // get color mid top
                let color5 = testUtils.getCanvasPixelColor(mapContainer, 400, 310); // get color mid bottom

                expect(color1).to.not.equal('#ffffff');
                expect(color2).to.equal('#ffffff');
                expect(color3).to.equal('#ffffff');
                expect(color4).to.equal('#ffffff');
                expect(color5).to.not.equal('#ffffff');

                resolve();
            }, 100);
        });
    });

    it('style feature with image and offsetY again, validate its style', async function() {
        // set style for the added feature
        paLayer.setStyleGroup(
            feature, [{
                'zIndex': 0, 'type': 'Image', 'width': 30, 'height': 30,
                'offsetY': -10,
                'src': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABoAAAAaCAYAAACpSkzOAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAABy2lUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iWE1QIENvcmUgNS40LjAiPgogICA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPgogICAgICA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIgogICAgICAgICAgICB4bWxuczp0aWZmPSJodHRwOi8vbnMuYWRvYmUuY29tL3RpZmYvMS4wLyIKICAgICAgICAgICAgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIj4KICAgICAgICAgPHRpZmY6T3JpZW50YXRpb24+MTwvdGlmZjpPcmllbnRhdGlvbj4KICAgICAgICAgPHhtcDpDcmVhdG9yVG9vbD5BZG9iZSBJbWFnZVJlYWR5PC94bXA6Q3JlYXRvclRvb2w+CiAgICAgIDwvcmRmOkRlc2NyaXB0aW9uPgogICA8L3JkZjpSREY+CjwveDp4bXBtZXRhPgqyI37xAAABsklEQVRIDWNkYGCoB2IHID4IxFgACyuDfIgnA7eUIRZJiND7G7sZnu84ycDw7y8ONfYsQAlGIAZZ0gDEmCD0Ig8DI6MEUAK3RQwMexi4pk5iWKD4A9MAsEgDEw4JqguPWkR2kA6/oGMBpm9mUHj8VmDgwBYuJa9Xc/SLBDH/YwLlBOyA5f9P1u4HqzgKFLDLsz5gYGYJZWcwB0uzM+RhU1b+ejLbGR4trYNcOtikwWJxHw9bx7/sYmBgZ/iNTRHIDhYDDgZXsOR/KI2mkvvfJwadHw8Y8Flk8P2GJ9f/H54M/9E0Q7lAOxiGX2IY9RH22CZClOXhL4bzYHX/oTSapl9MbCxPWMUsgMJqaFJw7iM26dN/GFmusf//hbU+AtphyDLnO8N2kI6pbAztcJ1IjGkS+dxbeA2BmQS3RVMEPTep/n04I+31LKz1EdCOSpZfwEIBZC7jVYYvSOYjmFrRINk/CAFM1g8mjl/pCpVf0g9gtwio4/doqsMMNyJFhl/QgSoZUJnrAMQNQIwJVuuD2nWGwHYdphxM5P0NF2C7jhfIxZqPgOLgdh2s4Qhq39EKHAAAniRovB1Mcr0AAAAASUVORK5CYII='
            }]);

        // validate features have new style
        await new Promise((resolve) => {
            setTimeout(() => {
                let color1 = testUtils.getCanvasPixelColor(mapContainer, 400, 300); // get color in the center
                let color2 = testUtils.getCanvasPixelColor(mapContainer, 390, 300); // get color mid left
                let color3 = testUtils.getCanvasPixelColor(mapContainer, 410, 300); // get color mid right
                let color4 = testUtils.getCanvasPixelColor(mapContainer, 400, 290); // get color mid top
                let color5 = testUtils.getCanvasPixelColor(mapContainer, 400, 310); // get color mid bottom

                expect(color1).to.not.equal('#ffffff');
                expect(color2).to.equal('#ffffff');
                expect(color3).to.equal('#ffffff');
                expect(color4).to.not.equal('#ffffff');
                expect(color5).to.equal('#ffffff');

                resolve();
            }, 100);
        });
    });

    it('style feature with image and offsetX and offsetY, validate its style', async function() {
        // set style for the added feature
        paLayer.setStyleGroup(
            feature, [{
                'zIndex': 0, 'type': 'Image', 'width': 30, 'height': 30,
                'offsetY': 10,
                'offsetX': 10,
                'src': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABoAAAAaCAYAAACpSkzOAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAABy2lUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iWE1QIENvcmUgNS40LjAiPgogICA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPgogICAgICA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIgogICAgICAgICAgICB4bWxuczp0aWZmPSJodHRwOi8vbnMuYWRvYmUuY29tL3RpZmYvMS4wLyIKICAgICAgICAgICAgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIj4KICAgICAgICAgPHRpZmY6T3JpZW50YXRpb24+MTwvdGlmZjpPcmllbnRhdGlvbj4KICAgICAgICAgPHhtcDpDcmVhdG9yVG9vbD5BZG9iZSBJbWFnZVJlYWR5PC94bXA6Q3JlYXRvclRvb2w+CiAgICAgIDwvcmRmOkRlc2NyaXB0aW9uPgogICA8L3JkZjpSREY+CjwveDp4bXBtZXRhPgqyI37xAAABsklEQVRIDWNkYGCoB2IHID4IxFgACyuDfIgnA7eUIRZJiND7G7sZnu84ycDw7y8ONfYsQAlGIAZZ0gDEmCD0Ig8DI6MEUAK3RQwMexi4pk5iWKD4A9MAsEgDEw4JqguPWkR2kA6/oGMBpm9mUHj8VmDgwBYuJa9Xc/SLBDH/YwLlBOyA5f9P1u4HqzgKFLDLsz5gYGYJZWcwB0uzM+RhU1b+ejLbGR4trYNcOtikwWJxHw9bx7/sYmBgZ/iNTRHIDhYDDgZXsOR/KI2mkvvfJwadHw8Y8Flk8P2GJ9f/H54M/9E0Q7lAOxiGX2IY9RH22CZClOXhL4bzYHX/oTSapl9MbCxPWMUsgMJqaFJw7iM26dN/GFmusf//hbU+AtphyDLnO8N2kI6pbAztcJ1IjGkS+dxbeA2BmQS3RVMEPTep/n04I+31LKz1EdCOSpZfwEIBZC7jVYYvSOYjmFrRINk/CAFM1g8mjl/pCpVf0g9gtwio4/doqsMMNyJFhl/QgSoZUJnrAMQNQIwJVuuD2nWGwHYdphxM5P0NF2C7jhfIxZqPgOLgdh2s4Qhq39EKHAAAniRovB1Mcr0AAAAASUVORK5CYII='
            }]);

        // validate features have new style
        await new Promise((resolve) => {
            setTimeout(() => {
                let color1 = testUtils.getCanvasPixelColor(mapContainer, 400, 300); // get color in the center
                let color2 = testUtils.getCanvasPixelColor(mapContainer, 390, 300); // get color mid left
                let color3 = testUtils.getCanvasPixelColor(mapContainer, 410, 300); // get color mid right
                let color4 = testUtils.getCanvasPixelColor(mapContainer, 400, 290); // get color mid top
                let color5 = testUtils.getCanvasPixelColor(mapContainer, 400, 310); // get color mid bottom

                expect(color1).to.equal('#ffffff');
                expect(color2).to.equal('#ffffff');
                expect(color3).to.not.equal('#ffffff');
                expect(color4).to.equal('#ffffff');
                expect(color5).to.not.equal('#ffffff');

                resolve();
            }, 100);
        });
    });
});
