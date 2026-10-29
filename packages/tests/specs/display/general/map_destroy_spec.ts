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
import {drag} from 'triggerEvents';
import {vi} from 'vitest';
import {Map} from '@here/xyz-maps-display';
import dataset from './map_destroy_spec.json';

describe('destroy display', function() {
    const expect = chai.expect;

    let display;

    before(async function() {
        let preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 77.852437, latitude: 13.542848},
            zoomlevel: 18,
            layers: preparedData.getLayers()
        });
    });

    after(async function() {
        if (display.destroy) display.destroy();
    });

    it('validate display is working', async function() {
        expect(display.getCenter()).to.deep.equal({longitude: 77.852437, latitude: 13.542848});
    });

    it('destroy display and validate', async function() {
        display.destroy();

        expect(display).to.deep.equal({});
    });

    it('cancels pending hover detection when the display is destroyed', async function() {
        const map = new Map(document.getElementById('map'), {
            center: {longitude: 77.852437, latitude: 13.542848},
            zoomlevel: 18,
            layers: []
        });
        const errors: string[] = [];
        const onError = (event: ErrorEvent) => errors.push(event.message);
        window.addEventListener('error', onError);
        try {
            await waitForViewportReady(map);
            map.addEventListener('pointermove', () => {});
            map.getContainer().querySelector('canvas').dispatchEvent(new MouseEvent('mousemove', {
                bubbles: true,
                clientX: 100,
                clientY: 100,
                altKey: true
            }));
            map.destroy();

            // Hover detection is deferred by 50 ms and must not run against the destroyed map.
            await new Promise<void>((resolve) => setTimeout(resolve, 200));
            expect(errors).to.deep.equal([]);
        } finally {
            window.removeEventListener('error', onError);
            if (map.destroy) map.destroy();
        }
    });

    it('cancels kinetic panning when the display is destroyed', async function() {
        const map = new Map(document.getElementById('map'), {
            center: {longitude: 77.852437, latitude: 13.542848},
            zoomlevel: 18,
            layers: []
        });
        const errors: string[] = [];
        const onError = (event: ErrorEvent) => errors.push(event.message);
        const pan = vi.spyOn(map, 'pan');
        window.addEventListener('error', onError);
        try {
            await waitForViewportReady(map);
            vi.useFakeTimers({
                toFake: ['Date', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval',
                    'requestAnimationFrame', 'cancelAnimationFrame']
            });
            const gesture = drag(map.getContainer(), {x: 300, y: 300}, {x: 400, y: 300});
            await vi.advanceTimersByTimeAsync(61);
            await gesture;
            const callsAfterRelease = pan.mock.calls.length;
            await vi.advanceTimersToNextFrame();
            expect(pan.mock.calls.length).to.be.greaterThan(callsAfterRelease);
            pan.mockRestore();
            map.destroy();

            await vi.advanceTimersByTimeAsync(600);
            expect(errors).to.deep.equal([]);
        } finally {
            window.removeEventListener('error', onError);
            if (map.destroy) {
                pan.mockRestore();
                map.destroy();
            }
            vi.useRealTimers();
        }
    });
});
