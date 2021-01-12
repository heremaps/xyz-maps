/*
 * Copyright (C) 2019-2021 HERE Europe B.V.
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

/**
 *  A TurnRestriction sucks.
 */
class TurnRestriction {
    constructor(internal) {
        this.hide = () => internal.hideRestrictions();
        this.isActive = () => internal.isActive();
    }

    /**
     *  Hide the turn restriction editor.
     */
    hide() {

    }

    /**
     *  Get current state of the turn restriction editor.
     */
    isActive(): boolean {
        return false;
    }
}

export default TurnRestriction;
