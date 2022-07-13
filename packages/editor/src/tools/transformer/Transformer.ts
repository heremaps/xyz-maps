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
import RotateKnob from './RotateKnob';
import ScaleKnob from './ScaleKnob';
import MoveKnob from './MoveKnob';
import ScaleBox, {createRectGeometry} from './ScaleBox';
import {GeoJSONFeature, GeoJSONCoordinate, GeoJSONCoordinate as Point} from '@here/xyz-maps-core';
import InternalEditor from '../../IEditor';
// @ts-ignore
import iconRotateBlack from '../../../assets/icons/rotate.black.gif';
// @ts-ignore
import iconRotateWhite from '../../../assets/icons/rotate.white.gif';

const ICON_SIZE = 18;
const STROKE_COLOR = '#010B1E';

export enum Corner {
    topLeft,
    topRight,
    bottomRight,
    bottomLeft
}

class Transformer {
    private iEditor: InternalEditor;
    gap: number = 0;
    // gap: number = 4e-5;
    private features: Feature[] = null;

    private scaleBox: ScaleBox = null;
    private moveKnob: MoveKnob = null;
    private rotateKnob: RotateKnob = null;
    private scaleKnob: ScaleKnob = null;

    private allowEditIds: (number | string)[] = [];
    rotation: number = 0;
    private bbox: GeoJSONFeature;

    scaleFeatures(features: Feature[] | GeoJSONFeature[], sx, sy, scaleCenter) {
        const scale = [sx, sy];
        const map = this.iEditor.map;
        const {rotation} = this;
        const rotateCenter = this.getCenter();

        scaleCenter = map.rotatePoint(scaleCenter, rotateCenter, -rotation);

        for (let feature of features) {
            const geom = {type: feature.geometry.type, coordinates: feature.geometry.coordinates};

            geom.coordinates = map.rotateGeometry(geom, rotateCenter, -rotation);
            geom.coordinates = map.scaleGeometry(geom, scale, scaleCenter);
            geom.coordinates = map.rotateGeometry(geom, rotateCenter, rotation);

            try {
                oTools._setCoords(<Feature>feature, geom.coordinates);
            } catch (e) {
                feature.geometry.coordinates = geom.coordinates;
                // feature.getProvider().setFeatureCoordinates(feature, geom.coordinates);
            }
        }
    }

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

    setRotation(rotation: number) {
        const deltaRotation = rotation - this.rotation;
        const center = this.getCenter();

        const {geometry} = this.bbox;
        geometry.coordinates = this.iEditor.map.rotateGeometry(geometry, center, deltaRotation);

        this.scaleBox.setRotation(deltaRotation, center);
        this.scaleKnob.update();
        this.rotateKnob.update();
        this.rotation = rotation;
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

    getFeatures() {
        return this.features;
    }

    visible(visible: boolean) {
        const {rotateKnob, scaleKnob, moveKnob, scaleBox} = this;

        if (rotateKnob) {
            if (visible) {
                scaleBox.show();
                rotateKnob.show();
                scaleKnob.show();
                moveKnob.show();
            } else {
                scaleBox.hide();
                rotateKnob.hide();
                scaleKnob.hide();
                moveKnob.hide();
            }
        }
    };

    isActive() {
        return this.scaleBox !== null;
    }


    hide() {
        const {features, rotateKnob, scaleKnob, moveKnob, scaleBox} = this;
        if (scaleBox) {
            scaleBox.remove();
            rotateKnob.remove();
            scaleKnob.remove();
            moveKnob.remove();
        }

        this.scaleBox =
            this.moveKnob =
                this.rotateKnob = null;

        this.rotation = 0;

        if (features != null) {
            this.restoreFeaturesEditable();
            this.allowEditIds.length = 0;
            this.features = null;
        }
    };

    private update() {
        this.scaleBox.update();
        this.scaleKnob.update();
        this.rotateKnob.update();
        this.moveKnob.update();
    }

    private offsetCorner(point, ox: number, oy: number) {
        const map = this.iEditor.map;
        const center = this.getCenter();
        const rotation = this.rotation;
        // remove rotation
        point = map.rotateGeometry({type: 'Point', coordinates: point}, center, -rotation);
        // project to pixel
        point = map.getPixelCoord(point);
        // apply pixel offset
        point = [point[0] - ox, point[1] - oy];
        // project back to geo
        point = map.getGeoCoord(point);
        // reapply rotation
        return map.rotateGeometry({type: 'Point', coordinates: point}, center, rotation);
    }

    scale(sx: number, sy: number, center = this.getCenter()) {
        this.scaleFeatures(this.getFeatures(), sx, sy, center);
        this.scaleFeatures([this.bbox], sx, sy, center);
        this.update();
    }

    getCorner(vertex: Corner, offsetX: number = 0, offsetY: number = 0) {
        // v0 --l0-- v1
        // |         |
        // l3        l1
        // |         |
        // v3 --l2-- v2
        let p = this.bbox.geometry.coordinates[vertex][0];

        if (offsetX || offsetY) {
            p = this.offsetCorner(p, -offsetX, -offsetY);
        }
        return p;
    }

    getRotatedBoundingBox(lines?: boolean) {
        if (lines) {
            return this.bbox.geometry.coordinates.slice();
        }
        return this.bbox.geometry.coordinates.map((l) => l[0]);
    }

    pan(dx: number, dy: number) {
        const map = this.iEditor.map;

        for (let item of this.getFeatures()) {
            map.pixelMove(item, dx, dy);
        }

        const {geometry} = this.bbox;
        geometry.coordinates = map.translateGeo(<GeoJSONCoordinate[]>geometry.coordinates, dx, dy);
        // map.pixelMove(this.bbox, dx, dy);
        this.update();
    }

    getCenter() {
        return this.moveKnob.getCenter();
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

        this.initUI();
    };

    private initUI() {
        const that = this;
        let {gap, iEditor} = that;
        const overlay = iEditor.objects.overlay;

        if (this.scaleBox) return;

        const _bbox = this.getBBox();
        const minLon = _bbox[0] -= gap;
        const minLat = _bbox[1] -= gap;
        const maxLon = _bbox[2] += gap;
        const maxLat = _bbox[3] += gap;
        const centerLon = _bbox[0] + (_bbox[2] - _bbox[0]) / 2;
        const centerLat = _bbox[1] + (_bbox[3] - _bbox[1]) / 2;
        const zLayer = 1e3;
        const geom = createRectGeometry(minLon, minLat, maxLon, maxLat);

        this.bbox = {
            type: 'Feature',
            geometry: {
                type: 'MultiLineString',
                coordinates: geom
            }
        };

        const moveCursor = new MoveKnob(iEditor, [centerLon, centerLat], overlay, that, {
            type: 'Circle',
            zIndex: 0,
            zLayer,
            stroke: '#FFFFFF',
            fill: STROKE_COLOR,
            strokeWidth: 3,
            opacity: 0.3,
            radius: 9
        });
        moveCursor.setPosition(centerLon, centerLat);
        that.moveKnob = moveCursor;

        const scaleBox = new ScaleBox(that, 15, iEditor,
            overlay, [{
                type: 'Line',
                zIndex: 0,
                zLayer,
                strokeDasharray: [4, 4],
                strokeWidth: 2,
                stroke: STROKE_COLOR
            }]);


        const rotateCursor = new RotateKnob(iEditor, [maxLon, minLat], overlay, that, [{
            type: 'Image',
            zIndex: 4,
            zLayer,
            src: iconRotateBlack,
            width: ICON_SIZE,
            height: ICON_SIZE
        }], [{
            type: 'Image',
            zIndex: 4,
            zLayer,
            src: iconRotateWhite,
            width: ICON_SIZE,
            height: ICON_SIZE
        }]);

        const scaleCursor = new ScaleKnob(iEditor, [minLon, maxLat], overlay, that, [{
            type: 'Circle',
            zIndex: 4,
            zLayer,
            fill: 'black',
            radius: ICON_SIZE / 2
        }, {
            zIndex: 5,
            zLayer,
            type: 'Text',
            fill: 'white',
            font: '20px Arial',
            text: '\u2921'
        }], [{
            type: 'Circle',
            zIndex: 4,
            zLayer,
            fill: 'white',
            radius: ICON_SIZE / 2
        }, {
            zIndex: 5,
            zLayer,
            type: 'Text',
            fill: 'black',
            font: '20px Arial',
            text: '\u2921'
        }]);

        rotateCursor.update();
        scaleCursor.update();

        that.rotateKnob = rotateCursor;
        that.scaleKnob = scaleCursor;
        that.scaleBox = scaleBox;
    };
}

export default Transformer;
