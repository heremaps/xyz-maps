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

import oTools from '../../features/oTools';

import RotateCursor from './RotateCursor';
import MoveCursor from './MoveCursor';
import ScaleSelector from './ScaleSelector';

import iconRotateBlack from '../../../assets/icons/rotate.black.gif';
import iconRotateWhite from '../../../assets/icons/rotate.white.gif';

const ICON_SIZE = 18;


const getBBox = (features) => {
    const bbox = [Infinity, Infinity, -Infinity, -Infinity];

    for (let f of features) {
        const fBbox = f.getBBox ? f.getBBox() : f.bbox;

        if (fBbox[0] < bbox[0]) {
            bbox[0] = fBbox[0];
        }

        if (fBbox[1] < bbox[1]) {
            bbox[1] = fBbox[1];
        }

        if (fBbox[2] > bbox[2]) {
            bbox[2] = fBbox[2];
        }

        if (fBbox[3] > bbox[3]) {
            bbox[3] = fBbox[3];
        }
    }

    return bbox;
};

function Transformer(HERE_WIKI, editor) {
    const overlay = HERE_WIKI.objects.overlay;
    const that = this;
    let scaleRect = null;
    let moveCursor = null;
    let rotateCursor = null;
    let objects = null;
    const defaultGap = 4e-5;
    const gap = defaultGap;
    let objsEditable = [];
    const STROKE_COLOR = '#010B1E';


    that.markObjsAsMod = () => {
        const len = objects.length;

        for (let i = 0; i < len; i++) {
            oTools.markAsModified(objects[i], false);
        }

        if (len) {
            HERE_WIKI.objects.history.saveChanges();
        }
    };

    that.getObjects = () => objects;

    that.visible = (visible) => {
        if (rotateCursor) {
            if (visible) {
                scaleRect.show();
                rotateCursor.show();
                moveCursor.show();
            } else {
                scaleRect.hide();
                rotateCursor.hide();
                moveCursor.hide();
            }
        }
    };

    this.isActive = () => scaleRect !== null;


    function setEditable(objects) {
        let l = objects.length;

        while (l--) {
            const obj = objects[l];
            // restore editable state of objects
            if (objsEditable.indexOf(obj.id) >= 0) {
                oTools._editable(obj, true);
            }
        }
    }

    this.hide = () => {
        if (scaleRect) {
            scaleRect.remove();
            rotateCursor.remove();
            moveCursor.remove();
        }

        scaleRect =
            moveCursor =
                rotateCursor = null;


        // objects = objects.items||objects;

        if (objects != null) {
            setEditable(objects);
            objects = null;
        }
    };

    this.objBBoxChanged = () => {
        const _bbox = objects.getBBox();
        const minLon = _bbox[0] -= gap;
        const minLat = _bbox[1] -= gap;
        const maxLon = _bbox[2] += gap;
        const maxLat = _bbox[3] += gap;
        const centerLon = _bbox[0] + (_bbox[2] - _bbox[0]) / 2;
        const centerLat = _bbox[1] + (_bbox[3] - _bbox[1]) / 2;

        if (scaleRect != null) {
            scaleRect.update(minLon, minLat, maxLon, maxLat);
        } else {
            scaleRect = new ScaleSelector(HERE_WIKI, minLon, minLat, maxLon, maxLat,
                overlay,
                that,
                {
                    'type': 'Line',
                    'zIndex': 0,
                    'strokeDasharray': [4, 4],
                    'strokeWidth': 2,
                    'stroke': STROKE_COLOR
                }
            );

            moveCursor = new MoveCursor(
                HERE_WIKI,
                [centerLon, centerLat],
                overlay,
                that,
                {
                    'type': 'Circle',
                    'zIndex': 0,
                    'stroke': '#FFFFFF',
                    'fill': STROKE_COLOR,
                    'strokeWidth': 3,
                    'opacity': 0.3,
                    'radius': 9
                }
            );

            rotateCursor = new RotateCursor(HERE_WIKI, [maxLon, minLat], overlay, that, [{
                type: 'Image',
                zIndex: 4,
                src: iconRotateBlack,
                width: ICON_SIZE,
                height: ICON_SIZE
            }], [{
                type: 'Image',
                zIndex: 4,
                src: iconRotateWhite,
                width: ICON_SIZE,
                height: ICON_SIZE
            }]);
        }

        rotateCursor.setPosition(maxLon, minLat);
        moveCursor.setPosition(centerLon, centerLat);
    };

    this.getGap = () => gap;

    this.getCenter = () => moveCursor.getCenter();

    this.show = (obj) => {
        let item;
        // hide turn restriction if it is active
        HERE_WIKI.listeners.trigger('_clearOverlay');

        // before showing transformer, restore editable state for selected object if exists
        if (objects != null) {
            setEditable(objects);
        }

        if (obj instanceof Array) {
            objects = obj;
        } else {
            objects = [obj];
        }
        objects.getBBox = () => getBBox(objects);

        objsEditable = [];

        for (let i = 0, prv; i < objects.length; i++) {
            item = objects[i];
            prv = oTools.private(item);

            // TODO: use item.unselect() instead.
            // currently not used because it will trigger transformer hide by default
            oTools.deHighlight(item);
            prv.isSelected = false;

            if (prv.allowEdit) {
                // save the editable state of the objects
                objsEditable.push(item.id);
                // set the objects to unselectable
                oTools._editable(item, false);
            }
        }

        that.objBBoxChanged();
    };
}


export default Transformer;
