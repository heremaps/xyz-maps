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

import {JSUtils, global} from '@here/xyz-maps-common';
import Event from '../../API/Event';
import DrawingShape from './DrawingShape';
import LineString from './LineString';
import Polygon from './Polygon';
import {simplifyPath} from '../../geometry';
import InternalEditor from '../../IEditor';
import Overlay from '../../features/Overlay';
import Navlink from '../../features/link/NavLink';

const DEFAULT_SHAPE_STYLE = [{
    'type': 'Circle',
    'zIndex': 0,
    'stroke': '#FFFFFF',
    'fill': '#000000',
    'strokeWidth': 2,
    'radius': 6
}];

const DEFAULT_LINE_STYLE = [{
    'zIndex': 0,
    'type': 'Line',
    'strokeWidth': 2,
    'stroke': '#ffffff'
}];


function createShapeStyle(shapeStyle, zIndex: number) {
    const style = JSUtils.clone(shapeStyle || DEFAULT_SHAPE_STYLE);
    style.forEach((s) => s.zIndex = (s.zIndex ^ 0) + zIndex);
    return style;
}

const setupStyleGroups = (settings: Settings, feature) => {
    let styles;
    let stroke;
    let featureStyle;
    let shapeStyle;

    const mode = settings['mode'];

    if (settings['styleGroup']) {
        styles = settings['styleGroup'];
    } else {
        if (mode == 'NAVLINK' || mode == 'AREA') {
            // add dummy for being used in style classes
            feature.editState = () => ({});
            feature.class = mode;
        }
        styles = settings['layer'].getStyleGroup(feature);

        if (mode != 'AREA') {
            // in case of line/navlink -> take "inline" style only as stroke by default
            shapeStyle = JSUtils.clone(DEFAULT_SHAPE_STYLE);
            shapeStyle[0].fill = styles[0].stroke;

            featureStyle = JSUtils.clone(DEFAULT_LINE_STYLE);
            featureStyle[0].stroke = (styles[1] || styles[0]).stroke;
            return {
                feature: featureStyle,
                shape: shapeStyle
            };
        }
    }

    const isPointStyle = (s) => ['Circle', 'Image', 'Rect', 'Text'].indexOf(s.type) != -1;

    featureStyle = styles.filter((s) => !isPointStyle(s));
    shapeStyle = styles.filter(isPointStyle);

    if (!featureStyle.length) {
        featureStyle = settings['layer'].getStyleGroup(feature);
    }

    if (!settings['styleGroup'] || !shapeStyle.length) {
        shapeStyle = JSUtils.clone(DEFAULT_SHAPE_STYLE);

        const style = featureStyle[0];
        stroke = style.stroke;
        let fill;

        if (mode == 'AREA') {
            fill = style.fill;
            if (stroke) {
                shapeStyle[0].stroke = stroke;
            }
        } else {
            fill = stroke;
        }

        if (fill) {
            shapeStyle[0].fill = fill;
        }
    }
    return {
        feature: featureStyle,
        shape: shapeStyle
    };
};

let UNDEF;

type Settings = {
    mode: 'AREA' | 'NAVLINK' | 'LINE',
    styleGroup: any,
    layer: any
}

class ClickDraw {
    private display;
    private iEdit: InternalEditor;
    private feature: LineString | Polygon;
    private cursor;
    private FeatureClass;
    private shapes = [];
    private settings: Settings;


    private originLink: Navlink = null;
    private originPos: [number, number, number?] = null;
    private active: boolean;

    private mousedown: boolean;
    private shpStyle: any;

    overlay: Overlay;

    private onBoardUp() {
        this.mousedown = false;
    }

    private updateCursor(ev) {
        const {iEdit, feature, shapes, display, cursor, mousedown, overlay} = this;

        if (!mousedown) {
            const geoMouse = iEdit.map.getGeoCoord(iEdit.map.getEventsMapXY(ev));
            const geo = shapes.map((f) => f.geometry.coordinates);
            geo.push(geoMouse);

            if (feature.isValid(geo)) {
                feature.update(shapes.length, geoMouse);
                overlay.setFeatureCoordinates(cursor, geoMouse);
            }
        } else {
            const pos = iEdit.map.getEventsMapXY(ev);

            const {prevPos} = cursor.properties;

            if (!display.lockViewport().pan) {
                display.pan(pos[0] - prevPos[0], pos[1] - prevPos[1], 0, 0);
            }

            prevPos[0] = pos[0];
            prevPos[1] = pos[1];
        }
    }

    private init() {
        const board = this;
        const {iEdit, display, overlay, updateCursor} = board;
        const bounds = display.getViewBounds();
        const topLeft = [bounds.minLon, bounds.maxLat];


        this.feature = new this.FeatureClass(overlay, topLeft);

        const cursor = overlay.addCircle(topLeft, createShapeStyle(DEFAULT_SHAPE_STYLE, 1));

        cursor.pointerdown = (ev, x, y) => {
            const {properties} = cursor;
            properties.prevPos = iEdit.map.getEventsMapXY(ev);
            board.mousedown = true;
            properties.panned = false;
        };
        cursor.pressmove = (ev, dx, dy, ax, ay) => {
            updateCursor(ev);
            cursor.properties.panned = true;
        };
        cursor.pointerup = (ev) => {
            if (!cursor.properties.panned) {
                board.addShape(iEdit.map.getGeoCoord(ev.mapX, ev.mapY), UNDEF, ev);
            }

            board.onBoardUp();
        };

        this.cursor = cursor;

        global.addEventListener('mousemove', this.updateCursor);
        global.addEventListener('mouseup', this.onBoardUp);
    };

    constructor(overlay: Overlay, HERE_WIKI: InternalEditor, display) {
        const clickDraw = this;

        clickDraw.overlay = overlay;
        clickDraw.iEdit = HERE_WIKI;
        clickDraw.display = display;

        clickDraw.onBoardUp = clickDraw.onBoardUp.bind(clickDraw);
        clickDraw.updateCursor = clickDraw.updateCursor.bind(clickDraw);
    }

    addShape(pos, link?: Navlink, ev?: MouseEvent) {
        const {iEdit, settings, shapes, feature} = this;

        let oCoords;

        if (link) {
            this.originLink = link;
            oCoords = link.geometry.coordinates;

            if (typeof pos === 'number') {
                pos = [oCoords[pos][0], oCoords[pos][1], oCoords[pos][2]];
            } else {
                let crossing = iEdit.map.calcCrossingAt(
                    oCoords,
                    pos,
                    iEdit._config['minShapeDistance']
                );

                // if shape point is start or end of the original link, don't split the link
                if (crossing.existingShape && (crossing.index == 0 || crossing.index == oCoords.length - 1)
                ) {
                    this.originLink = null;
                }

                pos = crossing.point;
            }

            this.originPos = pos;
        }

        const shp = this.overlay.addFeature(
            new DrawingShape(this, iEdit, shapes.length, pos, settings['mode']),
            createShapeStyle(this.shpStyle, 9)
        );

        feature.update(shapes.length, pos);

        shapes.push(shp);

        if (settings['onShapeAdd']) {
            settings['onShapeAdd'](new Event('onShapeAdd', pos[0], pos[1], ev, ev && ev.button, shp, {
                index: shp.properties.index
            }));
        }
    };

    removeShape(index?: number) {
        const {shapes, iEdit, overlay, feature, settings} = this;

        if (index == UNDEF) {
            index = shapes.length - 1;
        }

        let shape = shapes[index];
        let pos = iEdit.map.getGeoCoord(shape.geometry.coordinates);

        overlay.remove(shape);

        shapes.splice(index, 1);

        feature.removeAt(index);

        for (let i = index; i < shapes.length; i++) {
            shapes[i].properties.index--;
        }

        feature.update();

        if (settings['onShapeRemove']) {
            settings['onShapeRemove'](new Event('onShapeRemove', pos[0], pos[1], UNDEF, UNDEF, UNDEF, {
                index: index
            }));
        }
    };

    getFeature() {
        return this.feature;
    };

    getLength() {
        return this.shapes.length;
    };

    setAttributes(attributes) {
        const {feature, iEdit, cursor, settings, shapes} = this;

        if (attributes) {
            JSUtils.extend(feature.properties, attributes);

            const styles = setupStyleGroups(settings, feature.geojson);

            this.shpStyle = styles.shape;

            // prevent generic AREA/NAVLINK pointereventlisteners being triggered.
            // TODO: refactor and handle in generic feature class listener
            feature.geojson.class = UNDEF;

            iEdit.setStyle(feature.geojson, styles.feature);

            shapes.concat(cursor).forEach((shp) => {
                iEdit.setStyle(shp, createShapeStyle(styles.shape, iEdit.getStyle(shp)[0].zIndex));
            });
        }
    };

    createGeom() {
        const {feature, shapes, settings} = this;
        let coordinates = shapes.map((s) => s.geometry.coordinates);

        if (settings.mode != 'AREA') {
            coordinates = simplifyPath(coordinates, settings['generalization'] || 1 * 0.00001);
        }

        if (coordinates = feature.createGeo(coordinates)) {
            return {
                type: feature.type,
                coordinates: coordinates
            };
        }
    };

    create(attributes) {
        const {iEdit, FeatureClass, shapes, feature, originLink, originPos, settings} = this;

        this.setAttributes(attributes);

        if (FeatureClass == LineString) {
            // handleOriginLink();
            const refNode = shapes[0].geometry.coordinates;

            if (originLink && originPos[0] == refNode[0] && originPos[1] == refNode[1]) {
                iEdit.objects.splitLinkAt({
                    link: iEdit.objects.get(originLink),
                    point: refNode
                });
            }
        }

        let coordinates = shapes.map((s) => s.geometry.coordinates);

        if (feature.isValid(coordinates)) {
            const geometry = this.createGeom();
            let created;
            if (geometry) {
                created = iEdit.objects.create({
                    type: 'Feature',
                    geometry: geometry,
                    properties: feature.properties
                },
                settings['layer'].getProvider(),
                UNDEF,
                UNDEF
                );
                iEdit.objects.history.saveChanges();
                this.hide();
            }

            return created;
        }
    };

    isActive() {
        return this.active;
    };

    show(settings: Settings) {
        if (!this.active) {
            const overlayLayer = this.overlay.layer;
            const {iEdit, display} = this;

            // prevent auto re-arranging of overlay directly on top of linklayer if possible.
            iEdit.objects.listenDisplay(false);
            // place overlay on top of all other layers for drawing.
            display.removeLayer(overlayLayer);
            display.addLayer(overlayLayer);
            iEdit.objects.listenDisplay(true);

            this.settings = settings;

            if (settings.mode == 'AREA') {
                this.FeatureClass = Polygon;
            } else {
                this.FeatureClass = LineString;
            }

            this.originLink = null;
            this.originPos = null;
            this.active = true;

            this.init();

            this.setAttributes(settings['attributes']);
        }
    };

    hide() {
        const board = this;
        const {display, overlay, shapes, feature} = board;

        if (board.active) {
            board.active = false;

            const overlayLayer = overlay.layer;
            // make sure overlay will be re-arranged automatically.
            display.removeLayer(overlayLayer);
            display.addLayer(overlayLayer);

            overlay.remove(feature.geojson);
            board.feature = null;

            shapes.forEach((shape) => overlay.remove(shape));
            shapes.length = 0;

            overlay.remove(board.cursor);
            board.cursor = null;

            global.removeEventListener('mousemove', board.updateCursor);
            global.removeEventListener('mouseup', board.onBoardUp);
        }
    }
}

export default ClickDraw;
