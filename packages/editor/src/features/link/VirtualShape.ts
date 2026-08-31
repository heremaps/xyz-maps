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

import {Feature} from '@here/xyz-maps-core';
import GeoFence from './GeoFence';
import {Navlink} from './Navlink';
import navlinkTools from './NavlinkTools';
import {EditOperation} from '../../API/EditorOptions';
import {createShapeLinkProperties, PrivateData} from './NavlinkShape';
import {getOrSetShapeBehavior} from '../feature/shapeUtils';

let UNDEF;

type VirtualLinkShapeProperties = {
    parent: Navlink
};

class VirtualLinkShape extends Feature<'Point'> {
    id: string;
    private x: number;
    private y: number;
    private z: number;
    private moved: boolean;

    private pointerdown;
    private pointerup;
    private pressmove;
    private pointerenter;
    private pointerleave;

    /**
     * private data storage for internal api
     * @hidden
     * @internal
     */
    __: PrivateData;

    properties: VirtualLinkShapeProperties;

    constructor(line, pos, index, linkTools: typeof navlinkTools) {
        const EDITOR = line._e();
        const display = EDITOR.display;
        let geoFence;

        function onMouseMoveAddShape(ev, dx, dy, ax, ay) {// move
            const line = shapePnt.properties.parent;
            const position = shapePnt.geometry.coordinates.slice();

            if (geoFence.isPntInFence(position)) {
                if (!geoFence.isHidden()) {
                    geoFence.hide();
                }

                const shapePnts = linkTools.private(line, 'shps');

                if (!shapePnt.moved) {
                    // create "real" shape with first move
                    linkTools.addShp(line, position, index, false, true);
                    // line.addNewShape.call( that, cur_pos, index, false, true );

                    linkTools.removeShapePnts(line, true, shapePnt.id);

                    shapePnt.pointerenter =
                        shapePnt.pointerleave = UNDEF;

                    shapePnt.moved = true;

                    const shp = shapePnts[index];

                    // apply behavior that was set on the virtual shape during pointerdown
                    shp.__.b = shapePnt.behavior();
                    shp.x = shapePnt.x;
                    shp.y = shapePnt.y;
                    shp.z = shapePnt.z;

                    shp.__.pointerdown.apply(shp, arguments);
                }

                const newShape = shapePnts[index];

                newShape.__.pressmove.apply(newShape, arguments);
            } else if (geoFence.isHidden()) {
                geoFence.show();
            }
        }

        function onMouseDownAddShape() {
            const line = shapePnt.properties.parent;
            const {coordinates} = shapePnt.geometry;

            shapePnt.moved = false;

            linkTools.hideDirection(line);

            const startPixel = display.geoToPixel.apply(display, coordinates);

            geoFence = new GeoFence(EDITOR, shapePnt.x = startPixel.x, shapePnt.y = startPixel.y, shapePnt.z = coordinates[2]);
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
        }

        //* *************************************************************************
        super({
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: pos.slice()
            },
            properties: {
                'type': 'NAVLINK_VIRTUAL_SHAPE',
                ...createShapeLinkProperties(line)
            }
        }, EDITOR.objects.overlay.layer.getProvider());


        const shapePnt = this;

        shapePnt.pointerdown = onMouseDownAddShape;
        shapePnt.pressmove = onMouseMoveAddShape;
        shapePnt.pointerup = onMouseUpAddShape;


        if (EDITOR.isEditAllowed(line, EditOperation.Geometry)) {
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

    getLink(): Navlink {
        return this.properties.parent;
    }

    /**
     * Set the behavior options.
     * @experimental
     */
    behavior(options: {
        /**
         * The drag axis across which the LineShape is dragged upon user interaction.
         * Once "dragAxis" is set, "dragPlane" has no effect.
         * In case "dragAxis" and "dragPlane" are set, "dragPlane" is preferred.
         * In case "dragPlane" and "dragAxis" are both set, "dragPlane" is preferred.
         */
        dragAxis?: 'X' | 'Y' | 'Z' | [number, number, number]
        /**
         * The normal of the plane over which the LineShape is dragged upon user interaction.
         * Once "dragPlane" is set, "dragAxis" has no effect.
         */
        dragPlane?: 'XY' | 'XZ' | 'YZ' | [number, number, number]
    }): void;
    /**
     * Set the value of a specific behavior option.
     * @experimental
     */
    behavior(name: string, value: boolean | string | [number, number, number]): void;
    /**
     * Get the value of a specific behavior option.
     * @experimental
     */
    behavior(option: string): any;
    /**
     * Get the behavior options.
     * @experimental
     */
    behavior(): {
        /**
         * The drag axis across which the marker is dragged upon user interaction.
         */
        dragAxis?: [number, number, number] | 'X' | 'Y' | 'Z' | null
        /**
         * The normal of the plane over which the marker is dragged upon user interaction.
         */
        dragPlane?: [number, number, number] | 'XY' | 'XZ' | 'YZ' | null
    };

    behavior(options?: any, value?: boolean) {
        return getOrSetShapeBehavior(this, arguments);
    }
}

export default VirtualLinkShape;
