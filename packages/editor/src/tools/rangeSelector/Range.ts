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

import RangeMarker from './RangeMarker';
import MultiLink from './MultiLink';
import {Feature} from '@here/xyz-maps-core';
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

const createDefaultMarkerStyle = (overlay: Overlay, stroke: string, fill: string, side: string) => {
    let offset = side == 'R' ? 1 : side == 'L' ? -1 : 0;
    const styleGroup = overlay.layer.getStyle().styleGroups['RANGESELECTOR_RANGE_MARKER'];
    return [
        {...styleGroup[0], fill, offsetY: offset * (styleGroup[0].offsetY as number)}, // line to handle
        {...styleGroup[1], fill: stroke, stroke: fill, offsetY: offset * (styleGroup[1].offsetY as number)}, // handle
        {...styleGroup[2], stroke: fill} // point on range
    ];
};

const createDefaultLineStyle = (overlay: Overlay, stroke: string, opacity: number) => {
    const styleGroup = overlay.layer.getStyle().styleGroups['RANGESELECTOR_RANGE_LINE'];
    const custom = [];
    for (let style of styleGroup) {
        custom.push({...style, opacity: opacity ?? style.opacity, stroke});
    }
    return custom;
};

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

        let lineStyle = options.lineStyle || createDefaultLineStyle(overlay, fill, opacity);

        let lineOffset = 0;
        for (let style of lineStyle) {
            style.zLayer = multiLink.zLayer;
            lineOffset = style.offset || lineOffset;
        }

        this.line = overlay.addPath(multiLink.coord(), this.style = lineStyle);

        let markerStyle = options.markerStyle || createDefaultMarkerStyle(overlay, fill, stroke, side);
        for (let style of markerStyle) {
            if (style.lineOffset == UNDEF) {
                style.lineOffset = lineOffset;
                style.zLayer = multiLink.zLayer;
            }
        }

        this.markers = ['from', 'to'].map((pos) => new RangeMarker(
            multiLink.iEdit,
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

    getSide(): 'L' | 'R' | 'B' {
        return <'L' | 'R' | 'B'> this.options.side.toUpperCase();
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

    allowOverlap(side: 'L' | 'R' | 'B'): boolean {
        return this.allowSide(side, this.options.allowOverlap);
    }

    allowSnap(side: 'L' | 'R' | 'B'): boolean {
        return this.allowSide(side, this.options.snap);
    }

    getMarkers(): RangeMarker[] {
        return this.markers.sort((m1, m2) => m1.getRelPos() - m2.getRelPos());
    }

    getFromMarker(): RangeMarker {
        const {markers} = this;
        const p1 = markers[0].getRelPos();
        const p2 = markers[1].getRelPos();

        return markers[Number(p1 > p2)];
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

    overlaps(range2: [number, number] | Range, range1?: [number, number] | Range): boolean {
        range1 = Array.isArray(range1) ? range1 : this.getOffsets();
        range2 = Array.isArray(range2) ? range2 : range2.getOffsets();
        const [from, to] = range1.sort((f, t) => f - t);
        const [from2, to2] = range2.sort((f, t) => f - t);

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
