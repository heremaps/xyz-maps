import {waitForPointerEvent} from 'utils';
import {vi, describe, beforeEach, afterEach, it, expect} from 'vitest';

describe('pointer event helper', () => {
    let target: EventTarget;

    beforeEach(() => {
        target = new EventTarget();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it('registers before the action and cleans up after the event', async () => {
        const remove = vi.spyOn(target, 'removeEventListener');
        await waitForPointerEvent(target, 'pointerenter', () => {
            target.dispatchEvent(new Event('pointerenter'));
        });
        expect(remove.mock.calls).toHaveLength(1);
        expect(remove.mock.calls[0][0]).toBe('pointerenter');
        expect(vi.getTimerCount()).toBe(0);
    });

    it('waits for the action even if the event has already arrived', async () => {
        let completed = false;
        const pending = waitForPointerEvent(target, 'pointerleave', async () => {
            target.dispatchEvent(new Event('pointerleave'));
            await new Promise<void>((resolve) => setTimeout(resolve, 100));
        }).then(() => {
            completed = true;
        });
        await vi.advanceTimersByTimeAsync(99);
        expect(completed).toBe(false);
        await vi.advanceTimersByTimeAsync(1);
        await pending;
        expect(completed).toBe(true);
        expect(vi.getTimerCount()).toBe(0);
    });

    it('reports a missing event and removes its listener', async () => {
        const remove = vi.spyOn(target, 'removeEventListener');
        const pending = waitForPointerEvent(target, 'pointerleave', () => {})
            .then(() => null, (error: Error) => error);
        await vi.advanceTimersByTimeAsync(2000);
        const error = await pending;
        expect(error?.message).toBe('Timed out waiting for pointerleave');
        expect(remove.mock.calls).toHaveLength(1);
        expect(vi.getTimerCount()).toBe(0);
    });

    for (const asynchronous of [false, true]) {
        it(`propagates ${asynchronous ? 'asynchronous' : 'synchronous'} action errors and cleans up`, async () => {
            const remove = vi.spyOn(target, 'removeEventListener');
            const expected = new Error('pointer action failed');
            const pending = waitForPointerEvent(target, 'pointerenter', () => {
                if (asynchronous) return Promise.reject(expected);
                throw expected;
            }).then(() => null, (error: Error) => error);
            expect(await pending).toBe(expected);
            expect(remove.mock.calls).toHaveLength(1);
            expect(vi.getTimerCount()).toBe(0);
        });
    }
});
