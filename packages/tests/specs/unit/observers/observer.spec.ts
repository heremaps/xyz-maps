/*
 * Copyright (C) 2019-2026 HERE Europe B.V.
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
import {Observer} from '@test/observers/recorders';
import {describe, expect, it, onTestFinished, vi} from 'vitest';

type ObserverCallback = (name: string, value: string | number) => void;

function fixture() {
    const callbacks = new Map<string, ObserverCallback>();
    return {
        callbacks,
        addObserver: vi.fn((name: string, callback: ObserverCallback) => {
            callbacks.set(name, callback);
        }),
        removeObserver: vi.fn((name: string) => {
            callbacks.delete(name);
        }),
        emit(name: string, value: string | number) {
            callbacks.get(name)?.(name, value);
        }
    };
}

describe('test observer ownership', () => {
    it('records each value until stop and detaches only once', () => {
        const target = fixture();
        const observer = new Observer(target, ['ready', 'history.current']);
        target.emit('ready', 'busy');
        target.emit('ready', 'ready');
        target.emit('history.current', 1);
        const values = observer.stop();
        target.emit('history.current', 2);

        expect(values).toEqual({'ready': ['busy', 'ready'], 'history.current': [1]});
        expect(observer.stop()).toBe(values);
        expect(target.removeObserver).toHaveBeenCalledTimes(2);
        expect(target.callbacks.size).toBe(0);
    });

    it('automatically removes observers at test completion', () => {
        const target = fixture();
        onTestFinished(() => {
            expect(target.callbacks.size).toBe(0);
            expect(target.removeObserver).toHaveBeenCalledOnce();
        });
        new Observer(target, 'ready');
        expect(target.callbacks.size).toBe(1);
    });

    it('cleans up subscriptions after partial registration failure', () => {
        const target = fixture();
        const error = new Error('Second observer registration failed');
        target.addObserver.mockImplementation((name, callback) => {
            target.callbacks.set(name, callback);
            if (name === 'history.current') throw error;
        });
        onTestFinished(() => {
            expect(target.callbacks.size).toBe(0);
            expect(target.removeObserver).toHaveBeenCalledTimes(2);
        });

        expect(() => new Observer(target, ['ready', 'history.current'])).toThrow(error);
    });
});
