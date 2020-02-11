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

import {Feature} from '../features/Feature';

type styleStringFunction = (feature: Feature, zoom: number) => string | null | undefined;
type styleNumberFunction = (feature: Feature, zoom: number) => number | null | undefined;

interface LayerStyle {
    type: 'Circle' | 'Rect' | 'Image' | 'Text' | 'Line' | 'Polygon';
    zIndex: number | styleNumberFunction;
    fill?: string | styleStringFunction;
    stroke?: string | styleStringFunction;
    strokeWidth?: number | styleNumberFunction;
    radius?: string | styleNumberFunction;
    width?: number | styleNumberFunction;
    height?: number | styleNumberFunction;
    font?: string | styleStringFunction;
    text?: string | number | boolean | styleStringFunction | styleNumberFunction;
    textRef?: string;
    offsetX?: number | styleNumberFunction;
    offsetY?: number | styleNumberFunction;
}

export type StyleGroupMap = { [id: string]: StyleGroup }

export type StyleGroup = Array<LayerStyle>;

export interface ILayerStyle {
    styleGroups: StyleGroupMap;
    assign: (feature: Feature, level: number) => string;
};
