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
export type LibraryComponent = 'common' | 'core' | 'display' | 'editor';
export type Component = LibraryComponent | 'integration';
export type MapMarkup = 'none' | 'plain' | 'sized';

export interface MapPosition {
    x: number;
    y: number;
}

export interface MapDragOptions {
    duration: number;
    button: 'left' | 'middle' | 'right';
    modifiers: ('Alt' | 'Control' | 'Meta')[];
}

declare module 'vitest/internal/browser' {
    interface BrowserCommands {
        mapDrag(selector: string, from: MapPosition, to: MapPosition, options: MapDragOptions): Promise<void>;
        mapWheel(selector: string, position: MapPosition, deltaY: number): Promise<void>;
    }
}
