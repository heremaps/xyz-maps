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

import {RemoteTileProviderOptions} from './RemoteTileProviderOptions';
import {NavlinkSplitHook, NavlinkDisconnectHook, FeatureRemoveHook, CoordinatesUpdateHook} from '@here/xyz-maps-editor';

/**
 *  Options to configure an EditableRemoteTile.
 */
export interface EditableRemoteTileProviderOptions extends RemoteTileProviderOptions {
    /**
     *  Allow or prevent editing by the {@link editor.Editor} module.
     *
     *  @defaultValue false
     */
    editable?: boolean;
    /**
     * Enforce random ids for newly created features.
     * If "enforceRandomFeatureId" is set to true, the ids of features created by {@link editor.Editor.addFeature | editor.addFeature} are ignored and randomly created.
     * If "enforceRandomFeatureId" is set to false, ids of features created by {@link editor.Editor.addFeature | editor.addFeature} can be set. Random ids are only generated if none have been set.
     *
     * @defaultValue true
     */
    enforceRandomFeatureId?: boolean;
    /**
     * Add hook functions that will be called during the execution of the corresponding "editing operation".
     * The "hooks" option is a map with the "editing operation" as its key and the corresponding Hook or Array of Hook function(s) as its value.
     *
     * Available editing operations are 'Navlink.disconnect', 'Navlink.split', 'Feature.remove', 'Coordinates.remove'.
     *
     * @see {@link editor.Editor.addHook}
     */
    hooks?: {
        /**
         * The NavlinkSplitHook(s) will be called whenever a Navlink is devided into two new Navlinks. ('Navlink.split' operation).
         */
        'Navlink.split'?: NavlinkSplitHook | NavlinkSplitHook[],
        /**
         * The NavlinkDisconnectHook(s) will be called whenever a Navlink is disconnected from an intersection ('Navlink.disconnect' operation).
         */
        'Navlink.disconnect'?: NavlinkDisconnectHook | NavlinkDisconnectHook[],
        /**
         * The FeatureRemoveHook(s) will be called when a feature is being removed ('Feature.remove' operation).
         */
        'Feature.remove'?: FeatureRemoveHook | FeatureRemoveHook[],
        /**
         * The CoordinatesUpdateHook(s) will be called whenever the coordinates of a feature are added, updated or removed ('Coordinates.update' operation).
         */
        'Coordinates.update'?: CoordinatesUpdateHook | CoordinatesUpdateHook[]
    };

    staticData?: boolean;
};
