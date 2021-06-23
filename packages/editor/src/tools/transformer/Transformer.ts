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
import {Feature} from '../../features/feature/Feature';
import oTools from '../../features/oTools';
import RotateCursor from './RotateCursor';
import MoveCursor from './MoveCursor';
import ScaleSelector from './ScaleSelector';
import InternalEditor from '../../IEditor';
// @ts-ignore
import iconRotateBlack from '../../../assets/icons/rotate.black.gif';
// @ts-ignore
import iconRotateWhite from '../../../assets/icons/rotate.white.gif';

const ICON_SIZE = 18;
const STROKE_COLOR = '#010B1E';

class Transformer {
    private iEditor: InternalEditor;
    private gap: number = 4e-5;
    private features: Feature[] = null;

    private scaleRect: ScaleSelector = null;
    private moveCursor: MoveCursor = null;
    private rotateCursor: RotateCursor = null;

    private allowEditIds: (number | string)[] = [];

    constructor(iEditor: InternalEditor) {
        this.iEditor = iEditor;
    }

    private restoreFeaturesEditable() {
        for (let feature of this.features) {
            if (this.allowEditIds.indexOf(feature.id) >= 0) {
                oTools._editable(feature, true);
            }
        }
    }

    markObjsAsMod() {
        const {features} = this;

        for (let feature of features) {
            oTools.markAsModified(feature, false);
        }

        if (features.length) {
            this.iEditor.objects.history.saveChanges();
        }
    };

    getObjects() {
        return this.features;
    }

    visible(visible: boolean) {
        const {rotateCursor, moveCursor, scaleRect} = this;

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

    isActive() {
        return this.scaleRect !== null;
    }


    hide() {
        const {features, rotateCursor, moveCursor, scaleRect} = this;
        if (scaleRect) {
            scaleRect.remove();
            rotateCursor.remove();
            moveCursor.remove();
        }

        this.scaleRect =
            this.moveCursor =
                this.rotateCursor = null;


        if (features != null) {
            this.restoreFeaturesEditable();
            this.allowEditIds.length = 0;
            this.features = null;
        }
    };

    objBBoxChanged() {
        const that = this;
        let {rotateCursor, moveCursor, scaleRect, gap, iEditor} = that;
        const overlay = iEditor.objects.overlay;

        const _bbox = this.getBBox();
        const minLon = _bbox[0] -= gap;
        const minLat = _bbox[1] -= gap;
        const maxLon = _bbox[2] += gap;
        const maxLat = _bbox[3] += gap;
        const centerLon = _bbox[0] + (_bbox[2] - _bbox[0]) / 2;
        const centerLat = _bbox[1] + (_bbox[3] - _bbox[1]) / 2;

        if (scaleRect != null) {
            scaleRect.update(minLon, minLat, maxLon, maxLat);
        } else {
            scaleRect = new ScaleSelector(iEditor, minLon, minLat, maxLon, maxLat, overlay, that, {
                type: 'Line',
                zIndex: 0,
                zLayer: Infinity,
                strokeDasharray: [4, 4],
                strokeWidth: 2,
                stroke: STROKE_COLOR
            });

            moveCursor = new MoveCursor(iEditor, [centerLon, centerLat], overlay, that, {
                type: 'Circle',
                zIndex: 0,
                zLayer: Infinity,
                stroke: '#FFFFFF',
                fill: STROKE_COLOR,
                strokeWidth: 3,
                opacity: 0.3,
                radius: 9
            });

            rotateCursor = new RotateCursor(iEditor, [maxLon, minLat], overlay, that, [{
                type: 'Image',
                zIndex: 4,
                zLayer: Infinity,
                src: iconRotateBlack,
                width: ICON_SIZE,
                height: ICON_SIZE
            }], [{
                type: 'Image',
                zIndex: 4,
                zLayer: Infinity,
                src: iconRotateWhite,
                width: ICON_SIZE,
                height: ICON_SIZE
            }]);
        }

        rotateCursor.setPosition(maxLon, minLat);
        moveCursor.setPosition(centerLon, centerLat);

        that.moveCursor = moveCursor;
        that.rotateCursor = rotateCursor;
        that.scaleRect = scaleRect;
    };

    getGap(): number {
        return this.gap;
    }

    getCenter() {
        return this.moveCursor.getCenter();
    }

    getBBox(): number[] {
        const bbox = [Infinity, Infinity, -Infinity, -Infinity];
        for (let feature of this.features) {
            const fBbox = feature.getBBox ? feature.getBBox() : feature.bbox;

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

    show(features: Feature | Feature[]) {
        if (!Array.isArray(features)) {
            features = [features];
        }
        let {allowEditIds} = this;
        let item;
        // hide turn restriction if it is active
        this.iEditor.listeners.trigger('_clearOverlay');

        // before showing transformer, restore editable state for selected object if exists
        if (this.features != null) {
            this.restoreFeaturesEditable();
        }
        allowEditIds.length = 0;


        this.features = features;

        for (let i = 0, prv; i < features.length; i++) {
            item = features[i];
            prv = oTools.private(item);

            // TODO: use item.unselect() instead.
            // currently not used because it will trigger transformer hide by default
            oTools.deHighlight(item);
            prv.isSelected = false;

            if (prv.allowEdit) {
                // save the editable state of the objects
                allowEditIds.push(item.id);
                // set the objects to unselectable
                oTools._editable(item, false);
            }
        }

        this.objBBoxChanged();
    };
}

export default Transformer;
