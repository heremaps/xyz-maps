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

import {JSUtils} from '@here/xyz-maps-common';
import EventHandler from '../handlers/EventHandler';

export const eListeners = (listeners: EventHandler) => {
    // /**
    // *  Return list of supported event types.
    // *
    // *  @function
    // *  @ignore
    // *  @name here.xyz.maps.editor.Editor.listeners#supported
    // *
    // *  @public
    // *  @expose
    // *
    // *  @return {Array<String>}
    // *      events that are supported in the API.
    // */
    const getSupported = function() {
        const supported = listeners.supported.apply(listeners, arguments);
        if (typeof supported == 'boolean') {
            return supported;
        }
        return supported.filter((ev) => ev[0] != '_');
    };

    return {
        /**
         *  This method registers an event listener.
         *
         *  @public
         *  @expose
         *
         *  @function
         *  @name here.xyz.maps.editor.Editor#addEventListener
         *
         *  @param {string} event
         *      Possible events are: 'tap', 'dbltap', 'pointerup', 'pointerenter', 'pointerleave',
         *      'featureUnselected', 'error', 'dragStart', 'dragStop'
         *  @param {Function} callback
         *      The callback will be called when the specific event has been triggered. These are the explanations on
         *      the different events:
         *      - "tap", "pointerup", "dbltap": These events are thrown when the user taps (or double taps) on any feature of the map.
         *      -"pointerenter", "pointerleave": Triggered when mouse is over / moves out of an object.
         *      -"featureUnselected": This event is thrown when an feature is unselected, the unselect is done by Editor ( ex: automatic linksplit ).
         *      -"error": The event is thrown when error occurs.
         *      -"dragStop": The event is triggered when Address, POI, shape point of a link stops being dragged
         *      -"dragStart": The event is triggered when Address, POI or shape point of a link starts to be dragged.
         *  @param {Object=} context
         *      The object to which "this" should refer to if the callback method is called.
         */
        addEventListener: (type, callback, context) => {
            const supported = getSupported();

            String(type).split(' ').forEach((t) => {
                if (supported.indexOf(t) > -1) {
                    listeners.bind.call(listeners, t, callback, context);
                } else {
                    JSUtils.dump(t + ' is not a valid event. Use: ' + supported.join(', '), 'warn');
                }
            });
        },

        /**
         *  Removes an event listener.
         *
         *  @public
         *  @expose
         *
         *  @function
         *  @name here.xyz.maps.editor.Editor#removeEventListener
         *
         *  @param {string} event
         *      Possible events are: 'pointerup', 'dblclick', 'pointerenter', 'pointerleave'
         *      'featureUnselected', 'error', 'dragStart', 'dragStop'
         *  @param {Function} callback
         *      The callback function which will be removed.
         */
        removeEventListener: function() {
            listeners.remove.apply(listeners, arguments);
        }
    };
};
export default ListenerInterface;
