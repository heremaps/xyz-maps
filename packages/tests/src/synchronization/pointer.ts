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

type PointerEventType = 'pointerenter' | 'pointerleave' | 'pointermove';

interface PointerEventTarget {
    addEventListener(type: PointerEventType, listener: () => void): unknown;
    removeEventListener(type: PointerEventType, listener: () => void): unknown;
}

/**
 * Waits for deferred Map or Editor hover detection, which mousemove()'s fixed delay does not guarantee.
 * Registers before the action and waits for both the action and the pointer event.
 * Viewport/editor readiness helpers do not guarantee completion of hover detection.
 */
export async function waitForPointerEvent(
    target: PointerEventTarget,
    type: PointerEventType,
    action: () => unknown
): Promise<void> {
    let timer: ReturnType<typeof setTimeout>;
    const timeoutError = new Error(`Timed out waiting for ${type}`);
    let onEvent: () => void;
    const event = new Promise<void>((resolve) => {
        onEvent = resolve;
    });
    try {
        target.addEventListener(type, onEvent);
        const timeout = new Promise<never>((resolve, reject) => {
            timer = setTimeout(() => reject(timeoutError), 2000);
        });
        await Promise.race([Promise.all([event, Promise.resolve().then(action)]), timeout]);
    } finally {
        clearTimeout(timer);
        target.removeEventListener(type, onEvent);
    }
}
