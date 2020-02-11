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

import EditorEvent from '../API/Event';
import {Listener} from '@here/xyz-maps-common';

function isInternalEvent(type) {
    return type[0] == '_';
    // return String(type).indexOf('_') == 0;
}

function isEditorFeature(o) {
    return o && o.class; // || (o.properties && o.properties['@ns:com:here:editor'].type) || o.objType;

    // return o && o.objType;
    // return o && o.type && !o.type.indexOf('HERE_')
}

type DisplayEvent = any;

type EventCallback = (event: EditorEvent) => void;

class EventHandler {
    private listeners = new Listener([
        'tap', 'dbltap',

        'pointerup', // 'click',

        'pointerenter', 'pointerleave', // 'mouseover', 'mouseout',

        'dragStart', 'dragStop', 'dragMove',
        // 'touchstart', 'touchmove', 'touchend',

        'featureUnselected', // data: true/false

        'error',

        // internal events only
        '_domResize', '_panMap',

        '_layerAdd', '_layerRemove',

        '_clearOverlay'
    ]).sync(true);

    constructor() {
    }

    trigger(ev: DisplayEvent, object?, evType?: string) {
        const that = this;
        const type = evType || ev.type || ev;
        let triggered;
        let detail;
        let target;

        if (isEditorFeature(object)) {
            detail = ev.detail;
            target = object;
        } else {
            detail = object;
        }

        // ev is a native event triggered directly from DOMHandler, take the event from changedTouches as
        // this is a touchend event, lift a finger causes the event and in this case touches property is empty
        if (ev.type == 'touchend') {
            ev = ev.changedTouches[0];
        }

        triggered = that.listeners.trigger(type,
            [new EditorEvent(
                type,
                ev.mapX,
                ev.mapY,
                ev.nativeEvent,
                ev.button,
                target,
                detail
            )],
            isInternalEvent(type)
        );

        if (type == 'pointerup') {
            triggered = that.listeners.trigger('tap',
                [new EditorEvent(
                    'tap',
                    ev.mapX,
                    ev.mapY,
                    ev.nativeEvent,
                    ev.button,
                    target,
                    detail
                )],
                false
            ) || triggered;
        }

        return triggered;
    };

    bind(type: string, callback: EventCallback, context?) {
        return this.listeners.add(type, callback, context);
    };

    remove(type: string, callback: EventCallback, context?) {
        return this.listeners.remove(type, callback, context);
    };

    supported(): string[] {
        return this.listeners.getEvents();
    };

    destroy() {
        this.listeners = null;
    };
}

export default EventHandler;
