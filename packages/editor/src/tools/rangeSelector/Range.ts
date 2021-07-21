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

import RangeMarker from './RangeMarker';
import MultiLink from './MultiLink';
import {Feature} from '@here/xyz-maps-core/';
import Overlay from '../../features/Overlay';
import {MapEvent} from '@here/xyz-maps-display';
import {Range as RangeOptions} from '../../API/ERangeSelector';


let UNDEF;
const DEFAULT_STROKE = '#fff';

enum DEFAULT_FILL {
    L = '#ff4040',
    R = '#4cdd4c',
    B = '#35b2ee'
}

export enum OVERLAP {
    NONE = 0,
    PARTIAL = 1,
    FULL = 2
}

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

export interface InternalRangeOptions extends RangeOptions {
    _dragStart?: (e: MapEvent, range: Range) => void;
    _dragMove?: (e: MapEvent, range: Range) => void;
    _dragStop?: (e: MapEvent, range: Range) => void;
}

export class Range {
    id?: string | number;
    options: InternalRangeOptions;
    private line: Feature;
    markers: RangeMarker[];
    private overlay: Overlay;
    private ml: MultiLink;

    private style;

    segments;

    private updateSegments() {
        this.segments = this.ml.getZoneSegments(this);
    }


    constructor(multiLink: MultiLink, overlay, options: RangeOptions) {
        this.options = {
            _dragStart: (z, e) => {
            }, _dragMove: (z, e) => {
            }, _dragStop: (z, e) => {
            }, ...options
        };

        const {id} = options;

        if (id != UNDEF) {
            this.id = id;
        }
        const style = JSON.parse(JSON.stringify(options.style || {}));

        this.ml = multiLink;

        let side = this.getSide();
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

        let lineStyle = options.lineStyle || createDefaultLineStyle(fill, opacity, side);

        this.line = overlay.addPath(multiLink.coord(), this.style = lineStyle);

        let lineOffset = 0;
        for (let style of lineStyle) {
            lineOffset = style.offset || lineOffset;
        }

        let markerStyle = options.markerStyle || createDefaultMarkerStyle(fill, stroke, opacity, side);

        for (let style of markerStyle) {
            if (style.lineOffset == UNDEF) {
                style.lineOffset = lineOffset;
            }
        }

        this.markers = ['from', 'to'].map((pos) => new RangeMarker(
            overlay,
            this,
            options[pos],
            markerStyle,
            () => this.locked(),
            (e: MapEvent) => {
                this.options._dragStart(e, this);
            },
            (e: MapEvent) => {
                this.update();
                this.updateSegments();
                this.options._dragMove(e, this);
            },
            (e: MapEvent) => {
                this.options._dragStop(e, this);
            }
        ));

        this.overlay = overlay;
        this.updateSegments();
    }

    getSide(): string | 'L' | 'R' | 'B' {
        return this.options.side.toUpperCase();
    }

    getOffsets(): [number, number] {
        let p1 = this.markers[0].getRelPos();
        let p2 = this.markers[1].getRelPos();

        if (p1 > p2) {
            // flip
            const lb = p1;
            p1 = p2;
            p2 = lb;
        }

        return [p1, p2];
    }

    getFromMarker(): RangeMarker {
        const {markers} = this;
        const p1 = markers[0].getRelPos();
        const p2 = markers[1].getRelPos();

        return markers[Number(p1 < p2)];
    }

    getMultiLink(): MultiLink {
        return this.ml;
    }

    remove() {
        this.overlay.remove(this.line);
        this.markers[0].remove();
        this.markers[1].remove();
    }

    locked(): boolean {
        return !!this.options.locked;
    }

    overlaps(range: Range | [number, number]) {
        const [from, to] = this.getOffsets();
        const [from2, to2] = Array.isArray(range) ? range : range.getOffsets();
        return Math.max(0, Math.min(to, to2) - Math.max(from, from2)) > 0;
    }

    update() {
        const [from, to] = this.getOffsets();

        for (let style of this.style) {
            style.from = from;
            style.to = to;
        }
        this.overlay.layer.setStyleGroup(this.line, this.style);
        this.updateSegments();
    }
}
