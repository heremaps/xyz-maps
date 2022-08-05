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

import InternalEditor from '../../IEditor';
import {Area} from './Area';
import {FeatureProvider, Feature, GeoJSONCoordinate, GeoJSONFeature} from '@here/xyz-maps-core';
import {geometry} from '@here/xyz-maps-common';
import PolyTools from './PolygonTools';
import Overlay from '../Overlay';
import {Coordinate} from '../line/LineTools';
import {dragFeatureCoordinate} from '../oTools';

type PolygonTools = typeof PolyTools;

const centroid = geometry.centroid;


let polygonTools: PolygonTools;

type PrivateData = {
    area: Area;
    overlay: Overlay,
    iEditor: InternalEditor,
    pointerdown?: any,
    pressmove?: any,
    pointerup?: any,
    pointerenter?: any,
    pointerleave?: any
}

let UNDEF;


const getAreaCenter = (area: Area): number[] => {
    const {geometry} = area;
    return centroid(<GeoJSONCoordinate[][]>(
        geometry.type == 'Polygon'
            ? geometry.coordinates
            : geometry.coordinates[0]
    ));
};


class HeightKnob extends Feature {
    __: PrivateData;

    properties: {}

    constructor(area: Area, altitude: number, polyTools) {
        polygonTools = polyTools;

        const internalEditor: InternalEditor = area._e();

        const zLayer = internalEditor.display.getLayers().indexOf(internalEditor.getLayer(area)) + 1;

        const [lon, lat] = getAreaCenter(area);

        const geojson: GeoJSONFeature = {
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: [lon, lat, altitude]
            },
            properties: {
                type: 'AREA_HEIGHT_KNOB',
                offsetZ: 0,
                AREA: {
                    style: internalEditor.getStyle(area),
                    zLayer: !zLayer ? UNDEF : zLayer + 1
                }
            }
        };

        // TODO: cleanup provider add/attach to feature
        super(geojson, <FeatureProvider>internalEditor.objects.overlay.layer.getProvider());

        function hoverShapePnt(e) {
            let cursor;
            const editStates = this.properties['@ns:com:here:editor'];
            //
            if (e.type == 'pointerleave') {
                delete editStates['hovered'];
                cursor = 'default';
            } else {
                editStates['hovered'] = true;
                cursor = 'move';
            }

            document.body.style.cursor = cursor;
            internalEditor.setStyle(this);
        }

        //
        // function triggerEvents(ev, type) {
        //     internalEditor.listeners.trigger(ev, shapePnt, type);
        // }
        //
        // let isMoved = false;
        //
        function onMouseDown() {
            this.properties.isMoved = false;
            this.properties.offsetZ = this.__.iEditor.getStyleProperty(this, 'offsetZ') || 0;
        }

        function moveShape(e, dx, dy, cx, cy) {
            const {area, iEditor} = this.__;
            let {offsetZ} = this.properties;
            let coord = iEditor.map.translateZ(this.geometry.coordinates, offsetZ);

            coord = <Coordinate>dragFeatureCoordinate(e.mapX, e.mapY, this, coord, iEditor, {axis: [0, 0, 1]});

            let [, , altitude] = iEditor.map.translateZ(coord, -offsetZ);

            altitude = Math.max(0, altitude);

            this.update(altitude);

            area.getProvider().writeFeatureHeight(area, altitude);

            polygonTools._setCoords(area, area.geometry.coordinates);

            this.properties.isMoved = true;

            // if (!isMoved) {
            //     triggerEvents(e, 'dragStart');
            // }
        }

        function releaseShape(e) {
            if (this.properties.isMoved) {
                polygonTools.markAsModified(this.__.area);
                // triggerEvents(e, isMoved ? 'dragStop' : UNDEF);
            }
        }


        this.__ = {
            area: area,
            iEditor: internalEditor,
            overlay: internalEditor.objects.overlay,
            pointerdown: onMouseDown,
            pressmove: moveShape,
            pointerup: releaseShape,
            pointerenter: hoverShapePnt,
            pointerleave: hoverShapePnt
        };
    };

    update(altitude: number) {
        const center = getAreaCenter(this.__.area);

        center[2] = altitude;

        this.__.overlay.setFeatureCoordinates(this, center);
    }

    remove() {
        this.__.overlay.remove(this);
    }

    hide() {
        this.__.overlay.hideFeature(this);
    }

    show() {
        this.update(this.geometry.coordinates[2]);
        this.__.overlay.showFeature(this);
    }
}

export {HeightKnob};
