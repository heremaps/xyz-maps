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

import ZoneMarker from './ZoneMarker';
import {getSubpath, getTotalLength} from '../../geometry';
import MultiLink from './MultiLink';
import {Zone} from '../../API/EZoneSelector';
import {features} from '@here/xyz-maps-core/';
import Overlay from '../../features/Overlay';

let UNDEF;
const DEFAULT_STROKE = '#fff';
const DEFAULT_FILL = {
    L: '#ff4040',
    R: '#4cdd4c',
    B: '#35b2ee'
};

const createDefaultMarkerStyle = (stroke: string, fill: string, opacity: number, side: string) => {
    let offsetY = side == 'R' ? 8 : side == 'L' ? -8 : 0;
    return [{
        zIndex: 110,
        type: 'Rect',
        fill: fill,
        width: 2,
        height: 20,
        alignment: 'map',
        offsetY: offsetY
    }, {
        zIndex: 111,
        type: 'Circle',
        fill: stroke,
        radius: 7,
        alignment: 'map',
        stroke: fill,
        strokeWidth: 1,
        offsetY: 2.5 * offsetY
    }, {
        zIndex: 110,
        type: 'Circle',
        stroke: fill,
        radius: 5,
        alignment: 'map'
    }];
};

const createDefaultLineStyle = (stroke: string, opacity: number = 0.75, side: string) => [{
    'zIndex': 4,
    'type': 'Line',
    'strokeWidth': 9,
    'opacity': opacity,
    'stroke': stroke
    // 'offset': side == 'R' ? 32 : side == 'L' ? -32 : 0,
    // strokeLinejoin: 'bevel',
    // strokeLinecap: 'butt'
}];

export class MultiZone {
    private _zone: Zone;
    private line: features.Feature;
    private markers: ZoneMarker[];
    private overlay: Overlay;
    private ml: MultiLink;

    private style;

    constructor(multiLink: MultiLink, overlay, _zone: Zone) {
        this._zone = _zone;

        const style = JSON.parse(JSON.stringify(_zone.style || {}));

        this.ml = multiLink;

        const onDragged = () => {
            if (_zone['onChange']) {
                _zone['onChange'](<any> this);
            }
        };

        let side = _zone.side;
        let {opacity, fill, stroke} = style;


        if (fill && !stroke) {
            stroke = fill;
            fill = false;
        }
        if (!fill) {
            fill = stroke;
            stroke = DEFAULT_STROKE;
        }

        fill = fill || DEFAULT_FILL[side];

        let lineStyle = _zone.lineStyle || createDefaultLineStyle(fill, opacity, side);

        this.line = overlay.addPath(multiLink.coord(), this.style = lineStyle);

        let lineOffset = 0;
        for (let style of lineStyle) {
            lineOffset = style.offset || lineOffset;
        }

        let markerStyle = _zone.markerStyle || createDefaultMarkerStyle(fill, stroke, opacity, side);

        for (let style of markerStyle) {
            if (style.lineOffset == UNDEF) {
                style.lineOffset = lineOffset;
            }
        }

        this.markers = ['from', 'to'].map((pos) => new ZoneMarker(
            overlay,
            multiLink,
            side,
            _zone[pos],
            markerStyle,
            () => this.locked(),
            () => this.draw(),
            onDragged
        ));

        this.overlay = overlay;
    }

    remove() {
        this.overlay.remove(this.line);
        this.markers[0].remove();
        this.markers[1].remove();
    }

    locked(): boolean {
        return !!this._zone.locked;
    }

    draw() {
        let posM1 = this.markers[0].getRelPos();
        let posM2 = this.markers[1].getRelPos();

        if (posM1 > posM2) {
            // flip
            const lb = posM1;
            posM1 = posM2;
            posM2 = lb;
        }

        for (let style of this.style) {
            style.from = posM1;
            style.to = posM2;
        }

        this.overlay.layer.setStyleGroup(this.line, this.style);
    }
}
