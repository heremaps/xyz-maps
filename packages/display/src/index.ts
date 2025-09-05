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

import {Map} from './Map';
import {global} from '@here/xyz-maps-common';
import * as styleTools from './displays/styleTools';

import {transformMat4} from 'gl-matrix/vec3';
import {scale, rotate, translate, create, identity} from 'gl-matrix/mat4';

import {FollowPathAnimationController} from './animation/FollowPathAnimationController';

export const mat4 = {scale, rotate, translate, create, identity};
export const vec3 = {transformMat4};


// WORKAROUND IF BUNDELED BY WEBPACK (UMD REMOVAL)
// make sure global ns is also available for webpack users.
const globalNamespace = global.here.xyz.maps;
globalNamespace.Map = Map;
globalNamespace.styleTools = styleTools;

export {styleTools};
export {Map};
export {MapEvent} from './event/Event';
export {MapOptions} from './MapOptions';
export {FollowPathAnimationController};

export default Map;
