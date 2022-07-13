/*
 * Copyright (C) 2019-2022 HERE Europe B.V.
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
import {Feature, FeatureProvider, GeoJSONFeature} from '@here/xyz-maps-core';
import {Area} from './Area';

let UNDEF;

export class VirtualAreaShape extends Feature {
    private __: { [name: string]: any };

    constructor(area: Area, x: number, y: number, indexData: number[], polygonTools) {
        const internalEditor: InternalEditor = area._e();
        const zLayer = internalEditor.display.getLayers().indexOf(internalEditor.getLayer(area)) + 1;
        const overlay = internalEditor.objects.overlay;

        const geojson: GeoJSONFeature = {
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: [x, y]
            },
            properties: {
                type: 'AREA_VIRTUAL_SHAPE',
                poly: indexData[0],
                index: indexData[1],
                hole: indexData[2],
                AREA: {
                    style: internalEditor.getStyle(area),
                    zLayer: !zLayer ? UNDEF : zLayer + 1
                }
            }
        };

        super(geojson, <FeatureProvider>overlay.layer.getProvider());

        const shapePnt = this;

        let isMoved;

        function hoverShapePnt(e) {
            let cursor;
            const editStates = this.properties['@ns:com:here:editor'];


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


        function onMouseDown() {
            isMoved = false;
        }

        function moveAddShape(e, dx, dy, ax, ay) { // move
            const props = shapePnt.properties;
            const index = props.index + 1;
            const polyIdx = props.poly;
            const pos = shapePnt.geometry.coordinates;

            if (!isMoved) {// first move ?
                isMoved = true;

                const shapes = polygonTools.private(area, 'midShapePnts');
                for (let i = 0, shp, coord, p; i < shapes.length; i++) {
                    shp = shapes[i];
                    coord = shp.geometry.coordinates;

                    if (coord[0] == pos[0] && coord[1] == pos[1]) {
                        p = shp.properties;
                        polygonTools.addShp(area, pos.slice(), p.poly, p.hole, p.index + 1);
                    }
                }

                isMoved = polygonTools.getShp(area, polyIdx, props.hole, index);
            }
            isMoved.__.pressmove.apply(isMoved, arguments);
        }

        function releaseAddShape(e) { // stop
            if (isMoved) {
                const {poly, hole, index} = shapePnt.properties;
                const shp = polygonTools.getShp(area, poly, hole, index + 1);

                shp.__.pointerup.call(shp, e);
            }
        }

        shapePnt.__ = {

            pointerdown: onMouseDown,

            pressmove: moveAddShape,

            pointerup: releaseAddShape,

            pointerenter: hoverShapePnt,

            pointerleave: hoverShapePnt

        };
    }
}
