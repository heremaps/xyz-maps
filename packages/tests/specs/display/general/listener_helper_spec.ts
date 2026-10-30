import {afterAll, describe, expect, it, vi} from 'vitest';
import {Listener} from 'utils';

describe('test event listener cleanup', () => {
    const automaticCleanup: {target: EventTarget, listener: Listener}[] = [];

    afterAll(() => {
        // Check after test-finished callbacks, without detaching before dispatching the probe.
        const remainingEvents = automaticCleanup.map(({target, listener}) => {
            target.dispatchEvent(new Event('probe'));
            return listener.stop().probe;
        });
        expect(remainingEvents).toStrictEqual(automaticCleanup.map(() => []));
    });

    it('records each event type and stops at the explicit recording boundary', () => {
        const target = new EventTarget();
        const listener = new Listener(target, ['first', 'second']);
        const first = new Event('first');
        const second = new Event('second');
        target.dispatchEvent(first);
        target.dispatchEvent(second);

        const events = listener.stop();
        target.dispatchEvent(new Event('first'));
        expect(events.first).toStrictEqual([first]);
        expect(events.second).toStrictEqual([second]);
        expect(listener.stop()).toBe(events);
    });

    it('does not remove subscriptions again when stop is repeated', () => {
        const target = new EventTarget();
        const remove = vi.spyOn(target, 'removeEventListener');
        try {
            const listener = new Listener(target, ['first', 'second']);
            listener.stop();
            listener.stop();
            expect(remove).toHaveBeenCalledTimes(2);
            expect(remove).toHaveBeenCalledWith('first', expect.any(Function));
            expect(remove).toHaveBeenCalledWith('second', expect.any(Function));
        } finally {
            remove.mockRestore();
        }
    });

    it('automatically detaches after a successful test without an explicit stop', () => {
        const target = new EventTarget();
        automaticCleanup.push({target, listener: new Listener(target, 'probe')});
    });

    // Expected failure exercises the abort path; afterAll verifies that cleanup still ran.
    it.fails('automatically detaches when a test throws before its explicit stop', () => {
        const target = new EventTarget();
        automaticCleanup.push({target, listener: new Listener(target, 'probe')});
        throw new Error('Intentional failure before stopping the listener');
    });
});
