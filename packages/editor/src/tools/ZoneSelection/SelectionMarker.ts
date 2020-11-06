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

import {getPointAtLength, getTotalLength, getSegmentIndex} from '../../geometry';
import {calcRelPosOfPoiAtLink, getRelPosOfPointOnLine} from '../../map/GeoMath';
import {geotools} from '@here/xyz-maps-common';
import {features} from '@here/xyz-maps-core';
import {TileLayer} from '@here/xyz-maps-core/src/layers/TileLayer';

function getPointAtLink(line, relPos) {
    const coords = line.coord();
    return getPointAtLength(coords, getTotalLength(coords) * relPos);
}

class Marker extends features.Feature {
    private isLocked: () => boolean;
    private onDrag: () => void;
    private onDragEnd: () => void;
    private ml: any;

    properties: {
        style: any;
        dragged: boolean;
        side: string;
        relPos: number;
    }

    constructor(overlay: TileLayer, multiLink, side: string, relPos: number, color: string, isLocked, onDrag, onDragEnd) {
        super({
            properties: {
                relPos: relPos,
                side: side.toUpperCase(),
                dragged: false,
                style: [{
                    zIndex: 110,
                    type: 'Rect',
                    fill: color,
                    width: 10,
                    height: 30
                }]
            },
            geometry: {
                type: 'Point',
                coordinates: getPointAtLink(multiLink, relPos)
            }
        });

        this.isLocked = isLocked;
        this.ml = multiLink;
        this.onDrag = onDrag;
        this.onDragEnd = onDragEnd;

        overlay.addFeature(this, this.properties.style);

        this.updatePosition(this.geometry.coordinates);
    }

    updatePosition(pos) {
        const marker = this;
        const styleGroup = this.properties.style;
        const coords = this.ml.coord();
        const style = styleGroup[0];
        const segment = <number>getSegmentIndex(coords, pos);
        const {properties} = marker;
        const {side} = properties;
        let alpha = -geotools.calcBearing(coords[segment], coords[segment + 1]);

        if (side == 'L') {
            alpha += 180;
        }
        style.rotation = alpha;

        if (side != 'B') {
            alpha = Math.PI / 2 + alpha * Math.PI / 180.0;

            style.offsetX = style.height / 2 * Math.cos(alpha);
            style.offsetY = style.height / 2 * Math.sin(alpha);
        }

        return pos.slice();
    };

    pressmove(e) {
        const marker = this;
        if (!marker.isLocked()) {
            const line = marker.ml.coord();
            const display = e.detail.display;
            const geoPos = display.pixelToGeo(e.mapX, e.mapY);
            const relPosAtLink = calcRelPosOfPoiAtLink(line, [geoPos.longitude, geoPos.latitude]);
            const p = getPointAtLink(marker.ml, relPosAtLink.offset);

            marker.properties.relPos = relPosAtLink.offset;

            marker.getProvider().setFeatureCoordinates(marker, marker.updatePosition(p));

            marker.onDrag();

            marker.properties.dragged = true;
        }
    };

    pointerdown() {
        this.properties.dragged = false;
    };

    pointerup() {
        if (this.properties.dragged) {
            this.onDragEnd();
        }
    };

    remove() {
        this.getProvider().removeFeature(this);
    };

    getRelPos() {
        return this.properties.relPos;
    }

    getRelPosOfSubLink(link) {
        const markerPos = <[number, number, number?]> this.geometry.coordinates;
        const curSegNr = getSegmentIndex(this.ml.coord(), markerPos);

        if (curSegNr >= link.from && curSegNr < link.to) {
            const coords = link.link.coord();
            const relPos = getRelPosOfPointOnLine(
                markerPos,
                link.reversed ? coords.reverse() : coords
            );
            return relPos > .995 ? 1 : relPos;
        }
        return curSegNr < link.from ? 0 : 1;
    };
}

export default Marker;
