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

import TurnRestrictionHooks from './turnRestriction';
import InternalEditor from '../IEditor';

const initHooks = (internalEditor: InternalEditor) => {
    const addHooks = (hookMap) => {
        let hooks;
        for (let name in hookMap) {
            hooks = hookMap[name];

            if (typeof hooks == 'function') {
                hooks = [hooks];
            }
            for (let hook of hooks) {
                internalEditor.hooks.add(name, hook);
            }
        }
    };
    addHooks(TurnRestrictionHooks);
};

export {initHooks};
