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

type Keys = 'active' | 'ready' | 'history.current' | 'history.length' | 'changes.length';

type Observer = (type: Keys, value: any, oldValue: any) => void;

export const eObservers = (observerHandler) => {
    return {
        /**
         *  This method registers an observer for the property named by the caller.
         *
         *  @public
         *  @expose
         *
         *  @function
         *  @param {string} key
         *      The name of the property to observe. supported: 'active', 'ready', 'history.current', 'history.length', 'changes.length'
         *
         *  @param {Function} observer
         *      The function to be called if the observed property is modified; the function must be able to receive the following arguments:
         *      {string} key - the name of the property that was modified, created or deleted
         *      {variant} value - the new value that the property should be set to
         *      {variant} oldValue the old value of the property
         *
         *  @name here.xyz.maps.editor.Editor#addObserver
         */
        addObserver: (key: Keys, observer: Observer, context?) => {
            observerHandler.addObserver(key, observer, context);
        },

        /**
         *  This method retrieves the current value of a observable property.
         *
         *  @public
         *  @expose
         *
         *  @function
         *  @param {string} key
         *      The name of the property whose value is to be retrieved
         *  @return {variant} value
         *      The retrieved value of the property or undefined if no such property exists
         *
         *  @name here.xyz.maps.editor.Editor#get
         */
        get: (key: Keys) => {
            return observerHandler.get(key);
        },

        /**
         *  This method removes the observer for the property.
         *
         *  @public
         *  @expose
         *
         *  @function
         *  @param {string} key
         *      The name of the property that should no longer be observed
         *  @param {Function} observer
         *      The observer method to be removed
         *
         *  @name here.xyz.maps.editor.Editor#removeObserver
         */
        removeObserver: (key: Keys, observer: Observer, context?) => {
            observerHandler.removeObserver(key, observer, context);
        }
    };
};
