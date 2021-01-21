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

import {getPointAtLength, getTotalLength, getSegmentIndex} from '../../geometry';
import {calcRelPosOfPoiAtLink, getRelPosOfPointOnLine} from '../../map/GeoMath';
import {Feature, TileLayer, projection} from '@here/xyz-maps-core';
import {JSUtils} from '@here/xyz-maps-common';
import {MapEvent} from '@here/xyz-maps-display';
import MultiLink from './MultiLink';


const {webMercator} = projection;


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

class ZoneMarker extends Feature {
    private isLocked: () => boolean;
    private dragStart: (e: MapEvent) => void;
    private dragMove: (e: MapEvent) => void;
    private dragEnd: (e: MapEvent) => void;
    private ml: MultiLink;

    properties: {
        style: any;
        dragged: boolean;
        side: string;
        relPos: number;
    }

    constructor(overlay: TileLayer, multiLink, side: string, relPos: number, styleGroup, isLocked,
        dragStart, dragMove, dragEnd
    ) {
        styleGroup = JSUtils.clone(styleGroup);

        for (let style of styleGroup) {
            style._offsetX = style.offsetX || 0;
            style._offsetY = style.offsetY || 0;
        }
        const {coordinate} = getPointAtLine(multiLink, relPos);

        super({
            properties: {
                relPos: relPos,
                side: side.toUpperCase(),
                dragged: false,
                style: styleGroup
            },
            geometry: {
                type: 'Point',
                coordinates: coordinate
            }
        });

        this.isLocked = isLocked;
        this.ml = multiLink;
        this.dragStart = dragStart;
        this.dragMove = dragMove;
        this.dragEnd = dragEnd;

        overlay.addFeature(this, this.properties.style);

        this.updatePosition(coordinate);
    }

    updatePosition(pos: [number, number]): [number, number] {
        const marker = this;
        const styleGroup = this.properties.style;
        const coords = this.ml.coord();
        const segment = <number>getSegmentIndex(coords, pos);
        const {properties} = marker;
        const {side} = properties;
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
        // if (side == 'L') alpha += 180;

        for (let style of styleGroup) {
            style.rotation = rotation;

            if (side != 'B') {
                let {_offsetX, _offsetY, lineOffset} = style;
                _offsetY += lineOffset;

                style.offsetX = nx * _offsetY + ny * _offsetX;
                style.offsetY = ny * _offsetY + -nx * _offsetX;
            }
        }
        return <[number, number]>pos.slice();
    };

    pressmove(e) {
        const marker = this;
        if (!marker.isLocked()) {
            const display = e.detail.display;
            const position = getPointAtLine(marker.ml, display.pixelToGeo(e.mapX, e.mapY));

            marker.properties.relPos = position.offset;

            const coordinate = marker.updatePosition(position.coordinate);
            marker.getProvider().setFeatureCoordinates(marker, coordinate);

            marker.dragMove(e);
            marker.properties.dragged = true;
        }
    };

    pointerdown(e) {
        this.dragStart(e);
        this.properties.dragged = false;
    };

    pointerup(e: MapEvent) {
        if (this.properties.dragged) {
            this.dragEnd(e);
        }
    };

    remove() {
        this.getProvider().removeFeature(this);
    };

    getRelPos() {
        return this.properties.relPos;
    }

    getRelPosOfSubLink(sublink) {
        const markerPos = <[number, number, number?]> this.geometry.coordinates;
        const iEditor = sublink.link._e();
        const position = iEditor.map.getPixelCoord(markerPos);
        const curSegNr = getSegmentIndex(
            this.ml.coord().map((c) => iEditor.map.getPixelCoord(c)),
            position
        );

        if (curSegNr >= sublink.from && curSegNr < sublink.to) {
            const coords = sublink.link.coord().map((c) => iEditor.map.getPixelCoord(c));
            const relPos = getRelPosOfPointOnLine(position, sublink.reversed ? coords.reverse() : coords);
            return relPos > .995 ? 1 : Math.round(relPos * 1e6) / 1e6;
        }
        return curSegNr < sublink.from ? 0 : 1;
    };
}

export default ZoneMarker;
