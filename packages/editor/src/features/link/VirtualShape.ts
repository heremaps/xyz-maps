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

import {features} from '@here/xyz-maps-core';
import {JSUtils} from '@here/xyz-maps-common';
import GeoFence from './GeoFence';
import Navlink from './NavLink';

let UNDEF;

type VirtualLinkShapeProperties = {
    parent: Navlink
};

class VirtualLinkShape extends features.Feature {
    id: string;
    private x: number;
    private y: number;
    private moved: boolean;

    private pointerdown;
    private pointerup;
    private pressmove;
    private pointerenter;
    private pointerleave;

    properties: VirtualLinkShapeProperties;

    constructor(line, pos, index, linkTools) {
        const EDITOR = line._e();
        const display = EDITOR.display;
        let geoFence;


        function onMouseMoveAddShape(ev, dx, dy, ax, ay) {// move
            const line = shapePnt.properties.parent;
            const curPos = EDITOR.map.getGeoCoord(
                shapePnt.x + dx,
                shapePnt.y + dy
            );

            if (geoFence.isPntInFence(curPos)) {
                if (!geoFence.isHidden()) {
                    geoFence.hide();
                }

                const shapePnts = linkTools.private(line, 'shps');

                if (!shapePnt.moved) {
                    // create "real" shape with first move
                    linkTools.addShp(line, curPos, index, false, true);
                    // line.addNewShape.call( that, cur_pos, index, false, true );

                    linkTools.removeShapePnts(line, true, shapePnt.id);

                    shapePnt.pointerenter =
                        shapePnt.pointerleave = UNDEF;

                    shapePnt.moved = true;

                    const shp = shapePnts[index];

                    shp.x = shapePnt.x;
                    shp.y = shapePnt.y;

                    shp.__.pointerdown.call(shp);
                }

                const newShape = shapePnts[index];

                newShape.__.pressmove.apply(newShape, arguments);
            } else if (geoFence.isHidden()) {
                geoFence.show();
            }
        }

        function onMouseDownAddShape() {
            const line = shapePnt.properties.parent;

            shapePnt.moved = false;

            linkTools.hideDirection(line);

            const startPixel = display.geoToPixel.apply(display, this.geometry.coordinates);

            geoFence = new GeoFence(EDITOR, shapePnt.x = startPixel.x, shapePnt.y = startPixel.y);
        }

        function onMouseUpAddShape(ev) {
            const line = shapePnt.properties.parent;
            const linePrv = linkTools.private(line);

            if (shapePnt.moved) {
                const newShape = linePrv.shps[index];

                newShape.__.pointerup.call(newShape, ev);

                this.getProvider().removeFeature(this);
            } else if (linePrv.isSelected) {
                linkTools.showDirection(line);
            }
        };

        //* *************************************************************************
        super({
            type: 'Feature',
            geometry: {
                type: 'Point',

                coordinates: pos.slice()
            },
            properties: {
                'type': 'NAVLINK_VIRTUAL_SHAPE',
                'NAVLINK': {
                    'properties': JSUtils.extend(true, {}, line.properties),
                    'style': EDITOR.getStyle(line)
                },
                'parent': line
            }
        }, EDITOR.objects.overlay.layer.getProvider());


        const shapePnt = this;

        shapePnt.pointerdown = onMouseDownAddShape;
        shapePnt.pressmove = onMouseMoveAddShape;
        shapePnt.pointerup = onMouseUpAddShape;


        if (!EDITOR._config.editRestrictions(line, 1)) {
            shapePnt.pointerenter =
                shapePnt.pointerleave = function onHover(ev) {
                    const hovered = ev.type == 'pointerenter';

                    document.body.style.cursor = hovered
                        ? 'move'
                        : 'default';

                    this.properties['@ns:com:here:editor']['hovered'] = hovered;

                    EDITOR.setStyle(this);
                };
        }
    }
}

export default VirtualLinkShape;
