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

/**
 *  @expose
 *  @public
 *  @interface
 *  @class here.xyz.maps.editor.features.Feature.Properties.EditorProperties
 */
class EditorProperties {
    created: boolean;
    modified: boolean;
    removed: boolean;
    split: boolean;

    selected: boolean;
    hovered: boolean;
};

const EditorNsPrototype = EditorProperties.prototype;

/**
 *  Creation timestamp of object, in Millis.
 *
 *  @public
 *  @expose
 *  @name here.xyz.maps.editor.features.Feature.Properties.EditorProperties#created
 *  @type {number}
 */
EditorNsPrototype.created = false;

/**
 *  True if this object is modified.
 *
 *  @public
 *  @expose
 *  @name here.xyz.maps.editor.features.Feature.Properties.EditorProperties#modified
 *  @type {boolean}
 */
EditorNsPrototype.modified = false;

/**
 *  Removed timestamp of object, in Millis.
 *
 *  @public
 *  @expose
 *  @name here.xyz.maps.editor.features.Feature.Properties.EditorProperties#removed
 *  @type {number}
 */
EditorNsPrototype.removed = false;

/**
 *  Split timestamp of object, in Millis.
 *
 *  @public
 *  @expose
 *  @name here.xyz.maps.editor.features.Feature.Properties.EditorProperties#split
 *  @type {number}
 */
EditorNsPrototype.split = false;

/**
 *  True if this object is selected.
 *
 *  @public
 *  @expose
 *  @name here.xyz.maps.editor.features.Feature.Properties.EditorProperties#selected
 *  @type {number}
 */
EditorNsPrototype.selected = false;

/**
 *  True if this object is hovered.
 *
 *  @public
 *  @expose
 *  @name here.xyz.maps.editor.features.Feature.Properties.EditorProperties#hovered
 *  @type {number}
 */
EditorNsPrototype.hovered = false;

export default EditorProperties;
