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

import {intersectLineLine} from '../../geometry';
import InternalEditor from '../../IEditor';
import {Area} from './Area';
import {FeatureProvider, Feature, GeoJSONFeature} from '@here/xyz-maps-core';

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

let polygonTools;

type PrivateData = {
    area: Area;
    [name: string]: any;
}

/**
 * The AreaShape represents a shape-point / coordinate of a Area feature.
 * The AreaShape is only existing if the corresponding Area feature is "selected" and user based geometry editing with touch/mouse interaction is activated.
 * @see {@link Area.select}
 */
class AreaShape extends Feature {
    /**
     * The feature class of an AreaShape Feature is "AREA_SHAPE".
     */
    readonly class: 'AREA_SHAPE';

    private __: PrivateData;

    properties: {
        index: number;
        hole: number;
        poly: number;
    }

    constructor(area: Area, x: number, y: number, indexData: number[], polyTools) {
        polygonTools = polyTools;

        const internalEditor: InternalEditor = area._e();
        const geojson: GeoJSONFeature = {
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: [x, y]
            },
            properties: {
                type: 'AREA_SHAPE',
                poly: indexData[0],
                index: indexData[1],
                hole: indexData[2],
                AREA: {
                    style: internalEditor.getStyle(area)
                }
            }
        };

        // TODO: cleanup provider add/attach to feature
        super(geojson, <FeatureProvider>internalEditor.objects.overlay.layer.getProvider());

        const shapePnt = this;

        const overlay = internalEditor.objects.overlay;
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

            internalEditor.setStyle(this);
        }

        function triggerEvents(ev, type) {
            internalEditor.listeners.trigger(ev, shapePnt, type);
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
            const coordinates = polygonTools.getCoords(area); // deepcopy!
            const poly = coordinates[polyIndex];
            const lineString = poly[holeIndex];
            const orgPos = lineString[index]; // .slice();//shapePnt.geometry.coordinates.slice();
            const shpPos = internalEditor.map.translateGeo(
                lineString[index],
                dx - previousDx,
                dy - previousDy
            );

            if (!polygonTools.willSelfIntersect(lineString, shpPos, index)) {
                lineString[index] = shpPos;

                if (!index) {
                    lineString[lineString.length - 1] = shpPos;
                }

                if (
                    // make sure holes are not colliding with each other
                    !intersectPolyPolys(lineString, poly, holeIndex) &&
                    // make sure all interiors are inside exterior
                    polysInPoly(poly, poly[0], 1)
                ) {
                    const shapes = polygonTools.private(area, 'shapePnts');
                    let allValid = true;

                    const connectedAreas = polygonTools.getConnectedAreas(area, orgPos);

                    if (area.behavior('snapCoordinates')) {
                        for (let i = 0; i < connectedAreas.length; i++) {
                            let cAreaData = connectedAreas[i];
                            const {coordinates, polygonIndex, lineStringIndex, coordinateIndex} = cAreaData;
                            const poly = coordinates[polygonIndex];
                            const lineString = poly[lineStringIndex];

                            if (cAreaData.area.behavior('snapCoordinates')) {
                                lineString[coordinateIndex][0] = shpPos[0];
                                lineString[coordinateIndex][1] = shpPos[1];

                                if (!coordinateIndex) {
                                    lineString[lineString.length - 1] = shpPos;
                                }

                                const valid = !polygonTools.willSelfIntersect(lineString, shpPos, coordinateIndex) &&
                                    polysInPoly(poly, poly[0], 1);

                                if (!valid) {
                                    allValid = false;
                                    break;
                                }
                            }
                        }
                    }

                    if (allValid) {
                        // update geometry of connected areas
                        for (let {area, coordinates} of connectedAreas) {
                            polygonTools._setCoords(area, coordinates, false);
                        }

                        // set geometry of area itself
                        polygonTools._setCoords(area, coordinates, false);

                        for (let shp of shapes) {
                            const {coordinates} = shp.geometry;
                            if (coordinates[0] == orgPos[0] && coordinates[1] == orgPos[1]) {
                                shp.getProvider().setFeatureCoordinates(shp, shpPos.slice());
                            }
                        }

                        previousDx = dx;
                        previousDy = dy;
                    }
                }
            }
        }

        function releaseShape(e) {
            if (isMoved) {
                polygonTools.markAsModified(area);
            }

            polygonTools.addVShapes(area);

            triggerEvents(e, isMoved ? 'dragStop' : UNDEF);
        }

        this.__ = {
            area: area,
            pointerdown: onMouseDown,
            pressmove: moveShape,
            pointerup: releaseShape,
            pointerenter: hoverShapePnt,
            pointerleave: hoverShapePnt
        };

        return shapePnt;
    }

    /**
     * Get the Area feature to which the ShapeShape belongs.
     *
     * @returns the Area feature
     */
    getArea(): Area {
        return this.__.area;
    }

    /**
     * Removes the shape point from the polygon geometry of the Area feature.
     */
    remove() {
        return polygonTools.deleteShape(this.getArea(), this);
    };

    /**
     * Get the index of the shape point in the coordinates array of the polygon of respective Area feature.
     *
     * @returns The index of the shape point.
     */
    getIndex() {
        return this.properties.index;
    };

    removeGeometry() {
        const area = this.getArea();
        const polyIndex = this.properties.poly;
        const holeIndex = this.properties.hole;
        const coordinates = area.coord(); // deepcopy!
        const poly = coordinates[polyIndex];
        poly.splice(holeIndex, 1);

        polygonTools._setCoords(area, coordinates, false);

        // refresh
        polygonTools.deHighlight(area);
        polygonTools._select(area);

        polygonTools.markAsModified(area);
    };
}

(<any>AreaShape).prototype.class = 'AREA_SHAPE';

export {AreaShape};
