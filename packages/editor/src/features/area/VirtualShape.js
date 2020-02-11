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

// TODO: merge public and internal code and remove circle dep!

function AreaShape(HERE_WIKI, area, x, y, pIndex, polygonTools) {
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

        HERE_WIKI.setStyle(this);
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

            // polygonTools.addShp(
            //     area,
            //     shapePnt.geometry.coordinates,
            //     polyIdx,
            //     props.hole,
            //     index
            // );


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
    };

    const overlay = HERE_WIKI.objects.overlay;

    function releaseAddShape(e) { // stop
        if (isMoved) {
            const props = shapePnt.properties;
            const shp = polygonTools.getShp(area, props.poly, props.hole, props.index + 1);

            shp.__.pointerup.call(shp, e);
        }
    };

    const shapePnt = overlay.addPoint([x, y], {

        type: 'AREA_VIRTUAL_SHAPE',

        poly: pIndex[0],

        index: pIndex[1],

        hole: pIndex[2],

        AREA: {
            style: HERE_WIKI.getStyle(area)
        }
    });

    shapePnt.__ = {

        pointerdown: onMouseDown,

        pressmove: moveAddShape,

        pointerup: releaseAddShape,

        pointerenter: hoverShapePnt,

        pointerleave: hoverShapePnt

    };

    // if the shape point is the last, take the last and first points
    shapePnt.isNode = false;

    return shapePnt;
}
export default AreaShape;
