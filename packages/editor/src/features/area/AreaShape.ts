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
import PolyTools, {ConnectedArea} from './PolygonTools';
import {EDIT_RESTRICTION} from '../../API/EditorOptions';

type PolygonTools = typeof PolyTools;

type Ring = GeoJSONCoordinate[];
type Polygon = GeoJSONCoordinate[][];

function intersectLinePoly(l1: GeoJSONCoordinate, l2: GeoJSONCoordinate, poly: Ring): boolean {
    for (let p = 0, len = poly.length - 1; p < len; p++) {
        if (intersectLineLine(l1, l2, poly[p], poly[p + 1])) {
            return true;
        }
    }
    return false;
}

function intersectPolyPoly(poly1: Ring, poly2: Ring): boolean {
    for (let p = 0, len = poly1.length - 1; p < len; p++) {
        if (intersectLinePoly(poly1[p], poly1[p + 1], poly2)) {
            return true;
        }
    }
    return false;
}

function intersectPolyPolys(poly1: Ring, polys: Polygon, skip: number, coordinateIndex?: number): boolean {
    if (typeof coordinateIndex == 'number') {
        const lastIndex = poly1.length - 1;
        if (coordinateIndex < 0 || coordinateIndex > lastIndex) {
            return false;
        }

        const previousIndex = coordinateIndex == 0
            ? lastIndex - 1
            : coordinateIndex - 1;
        const nextIndex = coordinateIndex == lastIndex
            ? 1
            : coordinateIndex + 1;

        for (let p = 0, len = polys.length; p < len; p++) {
            if (p == skip) continue;
            const ring = polys[p];
            if (
                intersectLinePoly(poly1[previousIndex], poly1[coordinateIndex], ring) ||
                intersectLinePoly(poly1[coordinateIndex], poly1[nextIndex], ring)
            ) {
                return true;
            }
        }
        return false;
    }

    for (let p = 0, len = polys.length; p < len; p++) {
        if (p != skip && intersectPolyPoly(poly1, polys[p])) {
            return true;
        }
    }
    return false;
}

function pointInPoly(point: GeoJSONCoordinate, vs: Ring): boolean {
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

const EPSILON = 1e-12;

function isPointOnSegment(point: GeoJSONCoordinate, a: GeoJSONCoordinate, b: GeoJSONCoordinate): boolean {
    const ax = a[0];
    const ay = a[1];
    const bx = b[0];
    const by = b[1];
    const px = point[0];
    const py = point[1];

    const cross = (bx - ax) * (py - ay) - (by - ay) * (px - ax);

    if (Math.abs(cross) > EPSILON) {
        return false;
    }

    const minX = Math.min(ax, bx) - EPSILON;
    const maxX = Math.max(ax, bx) + EPSILON;
    const minY = Math.min(ay, by) - EPSILON;
    const maxY = Math.max(ay, by) + EPSILON;

    return px >= minX && px <= maxX && py >= minY && py <= maxY;
}

function isPointOnRingBoundary(point: GeoJSONCoordinate, ring: Ring): boolean {
    for (let i = 0, len = ring.length - 1; i < len; i++) {
        if (isPointOnSegment(point, ring[i], ring[i + 1])) {
            return true;
        }
    }
    return false;
}

/**
 * Validate that holes remain inside the exterior ring after moving one coordinate.
 * For drag updates we use an incremental containment check:
 * - if the exterior moved, test one representative point per hole;
 * - if a hole moved, test only the moved coordinate.
 * Points lying exactly on the exterior boundary are treated as invalid.
 * This is safe because ring intersections are validated separately.
 */
function validateHoleContainment(
    polygon: Polygon,
    movedLineStringIndex: number,
    movedCoordinateIndex: number
): boolean {
    const exterior = polygon[0];

    if (!exterior) {
        return false;
    }

    if (movedLineStringIndex == 0) {
        for (let i = 1; i < polygon.length; i++) {
            const hole = polygon[i];
            if (
                !hole?.length ||
                isPointOnRingBoundary(hole[0], exterior) ||
                !pointInPoly(hole[0], exterior)
            ) {
                return false;
            }
        }
        return true;
    }

    const movedRing = polygon[movedLineStringIndex];
    const movedPoint = movedRing?.[movedCoordinateIndex];

    return !!movedPoint &&
        !isPointOnRingBoundary(movedPoint, exterior) &&
        pointInPoly(movedPoint, exterior);
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
): {
    status: 'validationError', geometryValidation: {
        valid: boolean;
        reason?: 'selfIntersection' | 'topologyViolation' | 'connectedAreaInvalid';
        operation?: 'shapeMove' | 'shapeAdd' | 'polygonDraw';
        blocked?: boolean;
        polygonIndex?: number;
        lineStringIndex?: number;
        coordinateIndex?: number;
    }
} | { status: 'successful' } => {
    const coordinates = polygonTools.getCoords(area); // deepcopy!
    const poly = coordinates[polyIndex];
    const lineString = poly[holeIndex];
    const orgPos = lineString[coordIndex];

    lineString[coordIndex] = position;

    if (!coordIndex) {
        lineString[lineString.length - 1] = position;
    }

    const validationResult: number | true = polygonTools.validateGeometry(lineString, coordIndex);
    if (validationResult !== true) {
        return {
            status: 'validationError',
            geometryValidation: {
                valid: false,
                reason: 'selfIntersection',
                operation: 'shapeMove',
                blocked: true,
                polygonIndex: polyIndex,
                lineStringIndex: holeIndex,
                coordinateIndex: validationResult
            }
        };
    }


    if (
        // make sure holes are not colliding with each other
        intersectPolyPolys(lineString, poly, holeIndex, coordIndex) ||
        // make sure all interiors are inside exterior
        !validateHoleContainment(poly, holeIndex, coordIndex)
    ) {
        return {
            status: 'validationError',
            geometryValidation: {
                valid: false,
                reason: 'topologyViolation',
                operation: 'shapeMove',
                blocked: true,
                polygonIndex: polyIndex,
                lineStringIndex: holeIndex,
                coordinateIndex: coordIndex
            }
        };
    }

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

                const valid =
                    polygonTools.validateGeometry(lineString, coordIndex) === true &&
                    !intersectPolyPolys(lineString, poly, lineIndex, coordIndex) &&
                    validateHoleContainment(poly, lineIndex, coordIndex);

                if (!valid) {
                    return {
                        status: 'validationError',
                        geometryValidation: {
                            valid: false,
                            reason: 'connectedAreaInvalid',
                            operation: 'shapeMove',
                            blocked: true,
                            polygonIndex: polyIndex,
                            lineStringIndex: lineIndex,
                            coordinateIndex: coordIndex
                        }
                    };
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
    return {status: 'successful'};
};

let UNDEF;

/**
 * The AreaShape represents a shape-point / coordinate of a Area feature.
 * The AreaShape is only existing if the corresponding Area feature is "selected" and user based geometry editing with touch/mouse interaction is activated.
 * @see {@link Area.select}
 */
class AreaShape extends Feature<'Point'> {
    /**
     * The feature class of an AreaShape Feature is "AREA_SHAPE".
     */
    readonly class: 'AREA_SHAPE';

    __: PrivateData;

    properties: {
        index: number;
        hole: number;
        poly: number;
    };

    constructor(area: Area, x: number, y: number, indexData: number[], polyTools) {
        polygonTools = polyTools;

        const internalEditor: InternalEditor = area._e();
        const zLayer = internalEditor.display.getLayers().indexOf(internalEditor.getLayer(area)) + 1;
        const geojson: GeoJSONFeature<'Point'> = {
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

        const shapePnt: AreaShape = this;
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
            const cfg = internalEditor._config;
            if (cfg.editRestrictions(area, EDIT_RESTRICTION.GEOMETRY)) return;

            if (!isMoved) {// first move ?
                isMoved = true;
                polygonTools.hideShape(polygonTools.private(area, 'midShapePnts'), overlay);
                area.__.hk?.hide();

                triggerEvents(e, 'dragStart');
            }

            const index = shapePnt.getIndex();
            const polyIndex = shapePnt.properties.poly;
            const holeIndex = shapePnt.properties.hole;

            let position = <GeoJSONCoordinate>internalEditor.map.getGeoCoord(e.mapX, e.mapY);

            if (area.behavior('snapCoordinates')) {
                position = polygonTools.snapShape(shapePnt, position, cfg['snapTolerance']) || position;
            }


            let modifyResult = setShapePosition(area, position, index, holeIndex, polyIndex, shapePnt.__.cAreas);

            if (modifyResult.status === 'validationError') {
                e.detail.geometryValidation = modifyResult.geometryValidation;
                area._e().listeners.trigger(e, area, 'geometryValidation');
            }
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

                area.__.hk?.show();
                polygonTools.addVShapes(area);
            }
            triggerEvents(e, isMoved ? 'dragStop' : UNDEF);
        }

        this.__ = {
            area,
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
