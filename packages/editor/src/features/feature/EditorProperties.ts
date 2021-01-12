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
 * The Editor Properties give a more detailed insight into the current state of the feature.
 */
interface EditorProperties {
    /**
     *  Creation timestamp of the feature, in milliseconds.
     */
    created: number | boolean;
    /**
     *  Timestamp when the feature has been modified/updated, otherwise false.
     */
    modified: number | boolean;
    /**
     *  Timestamp when the feature has been removed, otherwise false.
     */
    removed: number | boolean;
    /**
     *  Timestamp when the feature has been split, otherwise false.
     *  The property is on relevant for "Navlink" features.
     */
    split: number | boolean;
    /**
     *  True if this feature is currently selected, otherwise false.
     */
    selected: boolean;
    /**
     *  True if this feature is currently hovered, otherwise false.
     */
    hovered: boolean;
};

class DefaultEditorProperties implements EditorProperties {
    created;
    modified;
    removed;
    split;
    selected;
    hovered;
};

// debugger dude;

const EditorNsPrototype = DefaultEditorProperties.prototype;

EditorNsPrototype.created = false;

EditorNsPrototype.modified = false;

EditorNsPrototype.removed = false;

EditorNsPrototype.split = false;

EditorNsPrototype.selected = false;

EditorNsPrototype.hovered = false;

export {EditorProperties, DefaultEditorProperties};
