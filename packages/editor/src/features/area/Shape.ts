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

import {intersectLineLine} from '../../geometry';
import InternalEditor from '../../IEditor';
import Area from './Area';

function intersectLinePoly(l1, l2, poly) {
    for (let p = 0, len = poly.length - 1; p < len; p++) {
        if (intersectLineLine(l1, l2, poly[p], poly[p + 1])) {
            return 1;
        }
    }
}

function intersectPolyPoly(poly1, poly2) {
    for (let p = 0, len = poly1.length - 1; p < len; p++) {
        if (intersectLinePoly(poly1[p], poly1[p + 1], poly2)) {
            return 1;
        }
    }
}

function intersectPolyPolys(poly1, polys, skip) {
    for (let p = 0, len = polys.length; p < len; p++) {
        if (p != skip && intersectPolyPoly(poly1, polys[p])) {
            return 1;
        }
    }
}

function pointInPoly(point, vs) {
    // ray-casting algorithm based on
    // http://www.ecse.rpi.edu/Homepages/wrf/Research/Short_Notes/pnpoly.html

    const x = point[0];
    const y = point[1];
    let inside = false;
    for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
        const xi = vs[i][0];
        const yi = vs[i][1];
        const xj = vs[j][0];
        const yj = vs[j][1];
        const intersect = ((yi > y) != (yj > y))
            && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }

    return inside;
}

function polysInPoly(polys, poly, start) {
    for (let p = start ^ 0, len = polys.length; p < len; p++) {
        for (let i = 0; i < polys[p].length; i++) {
            if (!pointInPoly(polys[p][i], poly)) {
                return 0;
            }
        }
    }
    return 1;
}

function AreaShape(HERE_WIKI: InternalEditor, area: Area, x: number, y: number, pIndex, polygonTools): void {
    // TODO: merge public and internal code and remove circle dep!
    // avoid curcual dependencies..

    const overlay = HERE_WIKI.objects.overlay;
    let UNDEF;

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

    function triggerEvents(ev, type) {
        HERE_WIKI.listeners.trigger(ev, shapePnt, type);
    }

    let isMoved = false;
    let previousDx = 0;
    let previousDy = 0;


    function onMouseDown() {
        isMoved = false;
        previousDx = 0;
        previousDy = 0;
    }


    function moveShape(e, dx, dy, cx, cy) {
        if (!isMoved) {// first move ?
            isMoved = true;

            polygonTools.hideShape(polygonTools.private(area, 'midShapePnts'), overlay);

            triggerEvents(e, 'dragStart');
        }

        const index = shapePnt.getIndex();
        const polyIndex = shapePnt.properties.poly;
        const holeIndex = shapePnt.properties.hole;
        // const coordinates = area.coord(); // deepcopy!
        const coordinates = polygonTools.getCoords(area); // deepcopy!
        const poly = coordinates[polyIndex];
        const interior = poly[holeIndex];
        const orgPos = interior[index]; // .slice();//shapePnt.geometry.coordinates.slice();
        const shpPos = HERE_WIKI.map.translateGeo(
            interior[index],
            dx - previousDx,
            dy - previousDy
        );

        // panShp( dx, dy );
        // var shpPos      = shapePnt.geometry.coordinates;


        if (!polygonTools.willSelfIntersect(interior, shpPos, index)) {
            interior[index] = shpPos;

            if (!index) {
                interior[interior.length - 1] = shpPos;
            }

            // console.log(index, shpPos, !intersectPolyPolys(interior, poly, holeIndex), polysInPoly(poly, poly[0], 1));

            if (!intersectPolyPolys(interior, poly, holeIndex) && polysInPoly(poly, poly[0], 1)) {
                const shapes = polygonTools.private(area, 'shapePnts');

                // console.log('op', orgPos);
                // debugger;
                polygonTools.forEachAt(area, orgPos, (area, poly, ring, index, coordinates) => {
                    coordinates[poly][ring][index][0] = shpPos[0];
                    coordinates[poly][ring][index][1] = shpPos[1];


                    polygonTools._setCoords(area, coordinates, false);


                    for (let i = 0, shp, coord; i < shapes.length; i++) {
                        shp = shapes[i];
                        coord = shp.geometry.coordinates;

                        if (coord[0] == orgPos[0] && coord[1] == orgPos[1]) {
                            shp.getProvider().setFeatureCoordinates(shp, shpPos.slice());
                        }
                    }
                });

                previousDx = dx;
                previousDy = dy;
            }
            // else{
            // console.log('%cX!!!','background-color:red;color:white');
            // overlay.setFeatureCoordinates( shapePnt, orgPos );
            // }


            // interior[index][0] = shpPos[0];
            // interior[index][1] = shpPos[1];
            //
            // // interior[interior.length-1] = interior[0];
            //
            // if(
            //     !intersectPolyPolys( interior, poly, holeIndex )
            //     && polysInPoly( poly, poly[0], 1 )
            // ){
            //     polygonTools._setCoords( area, coordinates );
            // }
        }
    };

    function releaseShape(e) {
        if (isMoved) {
            polygonTools.markAsModified(area);
        }

        // polygonTools._select( area );
        polygonTools.addVShapes(area);

        triggerEvents(e, isMoved ? 'dragStop' : UNDEF);
    };

    /**
     *  The interface represents area shape point.
     *  @class
     *  @public
     *  @expose
     *
     *  @name here.xyz.maps.editor.features.Area.Shape
     */
    const shapePnt = overlay.addPoint([x, y], {

        type: 'AREA_SHAPE',

        poly: pIndex[0],

        index: pIndex[1],

        hole: pIndex[2],

        AREA: {
            style: HERE_WIKI.getStyle(area)
        }
    });

    shapePnt.__ = {

        pointerdown: onMouseDown,

        pressmove: moveShape,

        pointerup: releaseShape,

        pointerenter: hoverShapePnt,

        pointerleave: hoverShapePnt

    };


    /**
     *
     *  Feature class of this feature, the value is "AREA_SHAPE".
     *
     *  @readonly
     *  @public
     *  @expose
     *
     *  @type {String}
     *  @name here.xyz.maps.editor.features.Area.Shape#class
     */
    shapePnt.class = 'AREA_SHAPE';


    /**
     *  Get the Area feature to which it belongs.
     *
     *  @public
     *  @expose
     *
     *  @function
     *  @name here.xyz.maps.editor.features.Area.Shape#getArea
     *  @return {here.xyz.maps.editor.features.Area}
     */
    shapePnt.getArea = () => area;


    /**
     *  Remove the shape.
     *
     *  @public
     *  @expose
     *
     *  @function
     *  @name here.xyz.maps.editor.features.Area.Shape#remove
     */
    shapePnt.remove = function() {
        return polygonTools.deleteShape(area, this);
    };


    /**
     *  Get index of shape point on this Object.
     *
     *  @public
     *  @expose
     *
     *  @function
     *  @name here.xyz.maps.editor.features.Area.Shape#getIndex
     */
    shapePnt.getIndex = function() {
        return this.properties.index;
    };


    shapePnt.removeGeometry = () => {
        // var index       = shapePnt.getIndex();

        const polyIndex = shapePnt.properties.poly;
        const holeIndex = shapePnt.properties.hole;
        const coordinates = area.coord(); // deepcopy!
        const poly = coordinates[polyIndex];

        // var interior    = poly[holeIndex];


        poly.splice(holeIndex, 1);

        polygonTools._setCoords(area, coordinates, false);

        // refresh
        polygonTools.deHighlight(area);
        polygonTools._select(area);

        polygonTools.markAsModified(area);
    };


    return shapePnt;
}


export default AreaShape;
