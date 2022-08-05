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

import {intersectLineLine} from '../../geometry';
import InternalEditor from '../../IEditor';
import {Area} from './Area';
import {FeatureProvider, Feature, GeoJSONCoordinate, GeoJSONFeature} from '@here/xyz-maps-core';
import {geotools} from '@here/xyz-maps-common';
import PolyTools, {ConnectedArea} from './PolygonTools';

type PolygonTools = typeof PolyTools;

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

let polygonTools: PolygonTools;

type PrivateData = {
    area: Area;
    [name: string]: any;
    cAreas?: ConnectedArea[];
}


const setShapePosition = (
    area: Area,
    position: GeoJSONCoordinate,
    coordIndex: number,
    holeIndex: number = 0,
    polyIndex: number = 0,
    connectedAreas?: ConnectedArea[]
): boolean => {
    const coordinates = polygonTools.getCoords(area); // deepcopy!
    const poly = coordinates[polyIndex];
    const lineString = poly[holeIndex];
    const orgPos = lineString[coordIndex];


    if (!polygonTools.willSelfIntersect(lineString, position, coordIndex)) {
        lineString[coordIndex] = position;

        if (!coordIndex) {
            lineString[lineString.length - 1] = position;
        }

        if (
            // make sure holes are not colliding with each other
            !intersectPolyPolys(lineString, poly, holeIndex) &&
            // make sure all interiors are inside exterior
            polysInPoly(poly, poly[0], 1)
        ) {
            const shapes = polygonTools.private(area, 'shapePnts');
            connectedAreas = connectedAreas || polygonTools.getConnectedAreas(area, orgPos);

            if (area.behavior('snapCoordinates')) {
                for (let i = 0; i < connectedAreas.length; i++) {
                    let cAreaData = connectedAreas[i];
                    const {coordinates, polyIndex, lineIndex, coordIndex} = cAreaData;
                    const poly = coordinates[polyIndex];
                    const lineString = poly[lineIndex];

                    if (cAreaData.area.behavior('snapCoordinates')) {
                        lineString[coordIndex][0] = position[0];
                        lineString[coordIndex][1] = position[1];

                        if (!coordIndex) {
                            lineString[lineString.length - 1] = position;
                        }

                        const valid = !polygonTools.willSelfIntersect(lineString, position, coordIndex) && polysInPoly(poly, poly[0], 1);

                        if (!valid) {
                            return false;
                        }
                    } else {
                        coordinates.splice(i, 1);
                    }
                }
            }


            // update geometry of connected areas
            for (let {area, coordinates} of connectedAreas) {
                polygonTools._setCoords(area, coordinates, false);
            }

            // set geometry of area itself
            polygonTools._setCoords(area, coordinates, false);

            for (let shp of shapes) {
                const {coordinates} = shp.geometry;
                if (coordinates[0] == orgPos[0] && coordinates[1] == orgPos[1]) {
                    shp.getProvider().setFeatureCoordinates(shp, position.slice());
                }
            }
        }
        return true;
    }
};

let UNDEF;

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

    __: PrivateData;

    properties: {
        index: number;
        hole: number;
        poly: number;
    }

    constructor(area: Area, x: number, y: number, indexData: number[], polyTools) {
        polygonTools = polyTools;

        const internalEditor: InternalEditor = area._e();
        const zLayer = internalEditor.display.getLayers().indexOf(internalEditor.getLayer(area)) + 1;
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
                    style: internalEditor.getStyle(area),
                    zLayer: !zLayer ? UNDEF : zLayer + 1
                }
            }
        };

        // TODO: cleanup provider add/attach to feature
        super(geojson, <FeatureProvider>internalEditor.objects.overlay.layer.getProvider());

        const shapePnt = this;
        const overlay = internalEditor.objects.overlay;


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

        function onMouseDown() {
            isMoved = false;
            shapePnt.__.cAreas = polygonTools.getConnectedAreas(area, shapePnt.geometry.coordinates);
        }

        function moveShape(e, dx, dy, cx, cy) {
            if (!isMoved) {// first move ?
                isMoved = true;
                polygonTools.hideShape(polygonTools.private(area, 'midShapePnts'), overlay);
                area.__.hk.hide();

                triggerEvents(e, 'dragStart');
            }

            const cfg = internalEditor._config;
            const index = shapePnt.getIndex();
            const polyIndex = shapePnt.properties.poly;
            const holeIndex = shapePnt.properties.hole;

            let position = <GeoJSONCoordinate>internalEditor.map.getGeoCoord(e.mapX, e.mapY);

            if (area.behavior('snapCoordinates')) {
                position = polygonTools.snapShape(shapePnt, position, cfg['snapTolerance']) || position;
            }

            setShapePosition(area, position, index, holeIndex, polyIndex, shapePnt.__.cAreas);
        }

        function releaseShape(e) {
            if (isMoved) {
                if (area.behavior('snapCoordinates')) {
                    const connectedAreas = shapePnt.__.cAreas;
                    for (let {area} of connectedAreas) {
                        polygonTools.markAsModified(area, false);
                    }
                }

                polygonTools.markAsModified(area);
            }

            area.__.hk.show();
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
