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

import type {Editor, EditorEvent} from '@here/xyz-maps-editor';
import {userEvent} from 'vitest/browser';

interface EditorClickTarget extends Pick<Editor, 'container'> {
    addEventListener(type: 'pointerup', listener: (event: EditorEvent) => void): void;
    removeEventListener(type: 'pointerup', listener: (event: EditorEvent) => void): void;
}

/** Waits for both the native browser click and editor pointerup, with a two-second deadline and listener cleanup. */
export async function editorClick(editor: EditorClickTarget, x: number, y: number): Promise<EditorEvent> {
    const timeoutError = new Error('Timed out waiting for editor click');
    let timer: ReturnType<typeof setTimeout>;
    let pointerUpDone = false;
    let clickDone = false;
    let onPointerUp: (event: EditorEvent) => void;
    const pointerUp = new Promise<EditorEvent>((resolve) => {
        onPointerUp = (event) => {
            pointerUpDone = true;
            resolve(event);
        };
    });
    const timeout = new Promise<never>((resolve, reject) => {
        timer = setTimeout(() => {
            timeoutError.message += `: pointerup=${pointerUpDone}, click=${clickDone}`;
            reject(timeoutError);
        }, 2000);
    });
    try {
        editor.addEventListener('pointerup', onPointerUp);
        const nativeClick = userEvent.click(editor.container, {
            position: {x, y},
            modifiers: ['Alt'],
            timeout: 2000
        }).then(() => {
            clickDone = true;
        });
        const [event] = await Promise.race([Promise.all([pointerUp, nativeClick]), timeout]);
        return event;
    } finally {
        clearTimeout(timer);
        editor.removeEventListener('pointerup', onPointerUp);
    }
}
