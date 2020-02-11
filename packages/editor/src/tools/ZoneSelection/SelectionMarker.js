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

import {getPointAtLength, getTotalLength, getSegmentIndex, getAngle} from '../../geometry';
import {calcRelPosOfPoiAtLink, getRelPosOfPointOnLine} from '../../map/GeoMath';
import {geotools} from '@here/xyz-maps-common';

function SelectionMarker(HERE_WIKI, overlay, multiLink, side, relPos, color, isLocked, onMoveCB, onDraggedCB) {
    side = side.toUpperCase();

    function getPointAtLink(relPos) {
        const coords = multiLink.coord();
        const pnt = getPointAtLength(
            coords,
            getTotalLength(coords) * relPos
        );

        return pnt;
    }

    const coord = getPointAtLink(relPos);
    const marker = overlay.addPoint(coord.slice(), [{
        'zIndex': 11,
        'type': 'Rect',
        'fill': color,
        'width': 10,
        'height': 30
    }]);
    let dragged = false;

    marker.side = side;

    this.getRelPosOfSubLink = (link) => {
        const props = marker.properties;
        const markerPos = [props.x, props.y];
        const curSegNr = getSegmentIndex(multiLink.coord(), markerPos);

        if (curSegNr >= link.from && curSegNr < link.to) {
            const coords = link.link.coord();
            const relPos = getRelPosOfPointOnLine(
                markerPos,
                link.reversed ? coords.reverse() : coords
            );
            return relPos > 0.995 ? 1 : relPos;
        }

        return curSegNr < link.from ? 0 : 1;
    };

    //* ***********************************************************

    function setPosition(marker, pos) {
        const coords = multiLink.coord();
        const segment = getSegmentIndex(coords, pos);
        let angle = getAngle(coords[segment], coords[segment + 1]);
        const props = marker.properties;
        const x = pos[0];
        const y = pos[1];

        if (marker.side === 'L') {
            angle = geotools.calcBearing(coords[segment], coords[segment + 1]);
        } else {
            angle = geotools.calcBearing(coords[segment + 1], coords[segment]);
        }

        const style = HERE_WIKI.getStyle(marker);

        style[0]['rotation'] = -angle;

        HERE_WIKI.setStyle(marker, style);

        overlay.setFeatureCoordinates(marker, pos.slice());

        props.x = x;
        props.y = y;
    };

    setPosition(marker, coord);
    //* ***********************************************************


    marker.pressmove = (e, dx, dy, ax, ay) => {
        if (!isLocked()) {
            const coords = multiLink.coord();
            const relPosAtLink = calcRelPosOfPoiAtLink(coords,
                HERE_WIKI.map.getGeoCoord(e.mapX, e.mapY)
            );
            const p = getPointAtLink(relPosAtLink.offset);

            relPos = relPosAtLink.offset;

            setPosition(marker, p);

            onMoveCB();

            dragged = true;
        }
    };

    marker.pointerdown = () => {
        dragged = false;
    };

    marker.pointerup = () => {
        if (dragged) {
            onDraggedCB();
        }
    };

    this.remove = () => {
        overlay.remove(marker);
    };

    this.getRelPos = () => relPos;
}

export default SelectionMarker;
