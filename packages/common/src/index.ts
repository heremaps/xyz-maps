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

import TaskManager, {TaskOptions} from './TaskManager';
import Task from './Task';
import Listener from './Listener';
import LRU from './LRU';
import parseJSONArray from './parseJSONArray';
import JSUtils from './JSUtils';
import geotools from './geotools';
import global from './global';
import Set from './Set';
import Map from './Map';
import Queue from './Queue';
import * as vec3 from './Vec3';

// make sure global ns is also available for webpack users.
let scp: any = global;
'here.xyz.maps'.split('.').forEach((ns) => scp = (scp[ns] = scp[ns] || {}));

// support for deprecated root namespace
(<any>global).HERE = (<any>global).here;

const common = {LRU, TaskManager, Listener, parseJSONArray, JSUtils, geotools, global, Queue, Set, Map, vec3};

scp.common = common;

export {LRU, TaskManager, Task, TaskOptions, Listener, parseJSONArray, JSUtils, geotools, global, Queue, Set, Map, vec3};

export default common;
