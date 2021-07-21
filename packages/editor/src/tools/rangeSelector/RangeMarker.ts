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

import {getPointAtLength, getSegmentIndex, getTotalLength} from '../../geometry';
import {calcRelPosOfPoiAtLink, getRelPosOfPointOnLine} from '../../map/GeoMath';
import {Feature, GeoJSONCoordinate, Style, TileLayer, webMercator} from '@here/xyz-maps-core';
import {JSUtils, geotools} from '@here/xyz-maps-common';
import {MapEvent} from '@here/xyz-maps-display';
import MultiLink from './MultiLink';
import {Range} from './Range';

const DEFAULT_SNAP_TOLERANCE = 1; // 1 meter

type MarkerStyle = Style & { _offsetX?: number, _offsetY?: number };

type DragListener = (e: MapEvent) => void;


function getPointAtLine(
    line: MultiLink,
    position: number | { longitude: number, latitude: number }
): { coordinate: [number, number], offset: number } {
    const prjCoords = line.coord().map((c) => {
        let pixel = webMercator.geoToPixel(c[0], c[1], 1);
        return [pixel.x, pixel.y];
    });
    let offset;

    if (typeof position == 'number') {
        offset = position;
    } else {
        // absolute projected position
        let wgsPixel = webMercator.geoToPixel(position.longitude, position.latitude, 1);
        offset = calcRelPosOfPoiAtLink(prjCoords, [wgsPixel.x, wgsPixel.y]).offset;
    }

    const point = getPointAtLength(prjCoords, getTotalLength(prjCoords) * offset);
    const geo = webMercator.pixelToGeo(point[0], point[1], 1);

    return {
        coordinate: [geo.longitude, geo.latitude],
        offset: offset
    };
}


class RangeMarker extends Feature {
    static initStyle(styleGroup: MarkerStyle[]): MarkerStyle[] {
        styleGroup = JSUtils.clone(styleGroup);
        for (let style of styleGroup) {
            style._offsetX = <number>(style.offsetX) || 0;
            style._offsetY = <number>(style.offsetY) || 0;
        }
        return styleGroup;
    }

    private isLocked: () => boolean;
    private dragStart: DragListener;
    private dragMove: DragListener;
    private dragEnd: DragListener;

    private range: Range;
    private snapped: RangeMarker[] = [];

    properties: {
        style: any;
        dragged: boolean;
        relPos: number;
        isFromMarker: boolean;
    }

    constructor(
        overlay: TileLayer,
        range: Range,
        relPos: number,
        styleGroup: Style[],
        isLocked: () => boolean,
        dragStart: DragListener,
        dragMove: DragListener,
        dragEnd: DragListener
    ) {
        super({
            type: 'Feature',
            properties: {
                relPos: relPos,
                dragged: false,
                style: RangeMarker.initStyle(styleGroup)
            },
            geometry: {
                type: 'Point',
                coordinates: getPointAtLine(range.getMultiLink(), relPos).coordinate
            }
        });
        this.range = range;

        this.isLocked = isLocked;
        this.dragStart = dragStart;
        this.dragMove = dragMove;
        this.dragEnd = dragEnd;

        overlay.addFeature(this, this.properties.style);

        this.updatePosition(<[number, number]>(this.geometry.coordinates), relPos);
    }

    private isSnapped(marker: RangeMarker) {
        return this.snapped.indexOf(marker) >= 0;
    }

    private snap(marker: RangeMarker): boolean {
        if (!this.isSnapped(marker)) {
            for (let {range} of this.snapped) {
                if (range == marker.range) {
                    // only allow snapping with one marker of a zone at the same time.
                    return false;
                }
            }
            this.snapped.push(marker);
            return true;
        }
    }

    private allowSide(side: 'L' | 'R' | 'B', allow: any): boolean {
        allow = allow || [];
        let allowedSides = [];

        if (typeof allow == 'boolean') {
            return allow;
        } else if (typeof allow == 'string') {
            allowedSides.push(allow);
        } else if (Array.isArray(allow)) {
            allowedSides = allow;
        }

        return allowedSides.indexOf(side) != -1;
    }

    private allowOverlap(side: 'L' | 'R' | 'B'): boolean {
        return this.allowSide(side, this.range.options.allowOverlap);
    }

    private allowSnap(side: 'L' | 'R' | 'B'): boolean {
        return this.allowSide(side, this.range.options.snap);
    }

    private overlaps(): boolean {
        for (let range of this.range.getMultiLink().getRanges()) {
            if (range != this.range) {
                if (this.range.overlaps(range)) {
                    return true;
                }
            }
        }
    }

    updatePosition(pos: [number, number], relPos: number): [number, number] {
        const marker = this;
        const styleGroup = marker.properties.style;
        const coords = marker.range.getMultiLink().coord();
        const segment = <number>getSegmentIndex(coords, pos);
        const side = marker.range.getSide();
        const p0 = coords[segment];
        const p1 = coords[segment + 1];
        const dx = p1[0] - p0[0];
        const dy = p1[1] - p0[1];
        const rotation = -Math.atan2(dy, dx) * 180 / Math.PI;
        const len = Math.sqrt(dx * dx + dy * dy);
        let nx = dy;
        let ny = dx;

        if (len) {
            nx /= len;
            ny /= len;
        }

        for (let style of styleGroup) {
            style.rotation = rotation;

            if (side != 'B') {
                let {_offsetX, _offsetY, lineOffset} = style;
                _offsetY += lineOffset;

                style.offsetX = nx * _offsetY + ny * _offsetX;
                style.offsetY = ny * _offsetY + -nx * _offsetX;
            }
        }

        marker.getProvider().setFeatureCoordinates(marker, pos);
        marker.properties.relPos = relPos;


        for (let snappedMarker of this.snapped) {
            snappedMarker.updatePosition([pos[0], pos[1]], relPos);
            snappedMarker.range.update();
        }

        return <[number, number]>pos.slice();
    };

    private updateSnapped(coordinate?: GeoJSONCoordinate): boolean {
        const marker = this;
        const multiLink = marker.range.getMultiLink();
        const rangeOptions = marker.range.options;
        const snapTolerance = rangeOptions.snapTolerance || DEFAULT_SNAP_TOLERANCE;

        coordinate = coordinate || marker.geometry.coordinates;

        for (let range of multiLink.getRanges()) {
            if (range != marker.range) {
                const [marker1, marker2] = range.markers;
                const side = range.getSide();
                const d1 = geotools.distance(coordinate, marker1.geometry.coordinates);
                const d2 = geotools.distance(coordinate, marker2.geometry.coordinates);
                const dMin = Math.min(d1, d2);
                const closestMarker = d1 < d2 ? marker1 : marker2;

                const _relPos = closestMarker.properties.relPos;

                if (marker.allowSnap(side)) {
                    const isInSnapDistance = dMin < snapTolerance;
                    if (isInSnapDistance || this.isSnapped(closestMarker)) {
                        closestMarker.properties.relPos = marker.properties.relPos;
                    }

                    if (!this.isSnapped(marker1) && !this.isSnapped(marker2)) {
                        if (isInSnapDistance) {
                            this.snap(closestMarker);
                        }
                    }
                }

                const forbiddenOverlap = !marker.allowOverlap(side) && marker.overlaps();

                closestMarker.properties.relPos = _relPos;

                if (forbiddenOverlap) {
                    return true;
                }
            }
        }

        return false;
    }

    pressmove(e) {
        const marker = this;
        if (!marker.isLocked()) {
            const display = e.detail.display;
            const multiLink = marker.range.getMultiLink();
            const position = getPointAtLine(multiLink, display.pixelToGeo(e.mapX, e.mapY));
            const {offset, coordinate} = position;
            const prevRelPos = marker.properties.relPos;

            // set relative position for overlap checking
            marker.properties.relPos = offset;

            if (this.updateSnapped(coordinate)) {
                marker.properties.relPos = prevRelPos;
                return;
            }

            marker.updatePosition(coordinate, offset);

            marker.dragMove(e);
            marker.properties.dragged = true;
        }
    }

    pointerdown(e) {
        this.dragStart(e);
        this.properties.dragged = false;
        this.properties.isFromMarker = this.range.getFromMarker() == this;
        this.updateSnapped();
    }

    pointerup(e: MapEvent) {
        if (this.properties.dragged) {
            this.dragEnd(e);
        }
        this.snapped.length = 0;
    }

    remove() {
        this.getProvider().removeFeature(this);
    }

    getRelPos() {
        return this.properties.relPos;
    }

    getRelPosOfSubLink(sublink) {
        const markerPos = <[number, number, number?]> this.geometry.coordinates;
        const iEditor = sublink.link._e();
        const position = iEditor.map.getPixelCoord(markerPos);
        const curSegNr = getSegmentIndex(
            this.range.getMultiLink().coord().map((c) => iEditor.map.getPixelCoord(c)),
            position
        );

        if (curSegNr >= sublink.from && curSegNr < sublink.to) {
            const coords = sublink.link.coord().map((c) => iEditor.map.getPixelCoord(c));
            const relPos = getRelPosOfPointOnLine(position, sublink.reversed ? coords.reverse() : coords);
            return relPos > .995 ? 1 : Math.round(relPos * 1e6) / 1e6;
        }
        return curSegNr < sublink.from ? 0 : 1;
    }
}

export default RangeMarker;
