import {Map} from '@here/xyz-maps-display';
import {waitForViewportReady} from 'displayUtils';
import {vi, describe, beforeEach, afterEach, it} from 'vitest';

describe('viewport readiness helper', () => {
    let display: Map;

    beforeEach(() => {
        display = new Map(document.getElementById('map'), {
            center: {longitude: 0, latitude: 0},
            zoomlevel: 18,
            layers: []
        });
    });

    afterEach(() => {
        display.destroy();
    });

    it('propagates synchronous action errors', async () => {
        const expected = new Error('viewport action failed');
        let received: unknown;
        try {
            await waitForViewportReady(display, () => {
                throw expected;
            });
        } catch (error) {
            received = error;
        }
        chai.expect(received).to.equal(expected);
    });

    it('propagates asynchronous action errors', async () => {
        const expected = new Error('async viewport action failed');
        let received: unknown;
        try {
            await waitForViewportReady(display, async () => {
                throw expected;
            });
        } catch (error) {
            received = error;
        }
        chai.expect(received).to.equal(expected);
    });

    it('waits for the action as well as viewport readiness', async () => {
        let actionDone = false;
        await waitForViewportReady(display, async () => {
            await new Promise<void>((resolve) => setTimeout(resolve, 200));
            actionDone = true;
        });
        chai.expect(actionDone).to.equal(true);
    });

    it('reports missing readiness signals instead of hanging', async () => {
        await waitForViewportReady(display);
        vi.useFakeTimers();
        try {
            const result = waitForViewportReady(display).then(() => null, (error: Error) => error);
            await vi.advanceTimersByTimeAsync(10000);
            const error = await result;
            chai.expect(error?.message).to.include('mapviewchangeend=false');
            chai.expect(error?.message).to.include('starts=0, ends=0');
            chai.expect(vi.getTimerCount()).to.equal(0);
        } finally {
            vi.useRealTimers();
        }
    });
});
