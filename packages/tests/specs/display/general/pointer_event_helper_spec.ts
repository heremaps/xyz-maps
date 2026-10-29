import {waitForPointerEvent} from 'utils';
import {vi, describe, beforeEach, afterEach, it, chai} from 'vitest';

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
        chai.expect(remove.mock.calls).to.have.lengthOf(1);
        chai.expect(remove.mock.calls[0][0]).to.equal('pointerenter');
        chai.expect(vi.getTimerCount()).to.equal(0);
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
        chai.expect(completed).to.equal(false);
        await vi.advanceTimersByTimeAsync(1);
        await pending;
        chai.expect(completed).to.equal(true);
        chai.expect(vi.getTimerCount()).to.equal(0);
    });

    it('reports a missing event and removes its listener', async () => {
        const remove = vi.spyOn(target, 'removeEventListener');
        const pending = waitForPointerEvent(target, 'pointerleave', () => {})
            .then(() => null, (error: Error) => error);
        await vi.advanceTimersByTimeAsync(2000);
        const error = await pending;
        chai.expect(error?.message).to.equal('Timed out waiting for pointerleave');
        chai.expect(remove.mock.calls).to.have.lengthOf(1);
        chai.expect(vi.getTimerCount()).to.equal(0);
    });

    for (const asynchronous of [false, true]) {
        it(`propagates ${asynchronous ? 'asynchronous' : 'synchronous'} action errors and cleans up`, async () => {
            const remove = vi.spyOn(target, 'removeEventListener');
            const expected = new Error('pointer action failed');
            const pending = waitForPointerEvent(target, 'pointerenter', () => {
                if (asynchronous) return Promise.reject(expected);
                throw expected;
            }).then(() => null, (error: Error) => error);
            chai.expect(await pending).to.equal(expected);
            chai.expect(remove.mock.calls).to.have.lengthOf(1);
            chai.expect(vi.getTimerCount()).to.equal(0);
        });
    }
});
