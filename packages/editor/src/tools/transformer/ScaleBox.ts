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

import {Feature, GeoJSONCoordinate, Style} from '@here/xyz-maps-core';
import Overlay from '../../features/Overlay';
import InternalEditor from '../../IEditor';
import Transformer, {Corner} from './Transformer';
import {getClosestPntOnLine, rotate} from '../../geometry';

export const createRectGeometry = (minLon: number, minLat: number, maxLon: number, maxLat: number) => {
    return [
        [[minLon, maxLat], [maxLon, maxLat]],
        [[maxLon, maxLat], [maxLon, minLat]],
        [[maxLon, minLat], [minLon, minLat]],
        [[minLon, minLat], [minLon, maxLat]]
    ];
};

class ScaleBox {
    private features: Feature[];
    private overlay: Overlay;
    private iEdit: InternalEditor;
    private transformer: Transformer;
    private buffer: number;

    private flipped: boolean;

    constructor(
        transformer: Transformer,
        buffer: number,
        internalEditor: InternalEditor,
        overlay: Overlay
    ) {
        const scaleBox = this;
        const {map} = internalEditor;
        let skip = false;
        let scaled;
        this.transformer = transformer;

        this.buffer = buffer;

        const selectors: Feature<'Polygon'|'LineString'>[] = [
            overlay.addRect(0, 0, 0, 0, {
                type: 'TRANSFORMER_SCALE_BOX'
            })
        ];

        const style = internalEditor.getStyle(selectors[0]);

        for (let i = 0; i < 4; i++) {
            selectors.push(overlay.addPath([[0, 0], [0, 0]], [{
                zIndex: <number>style[0].zIndex + 1,
                zLayer: style[0].zLayer || 0,
                type: 'Line',
                strokeWidth: 6
            }], {
                index: i,
                vertical: i % 2
            }));
        }


        let initialDirection;
        let flipped = false;

        function dragMove(e, dx, dy) {// move //h -> dy
            if (skip) return;

            const {index, vertical} = this.properties;

            let i: Corner = index == Corner.topLeft ? Corner.bottomLeft : index - 1;
            let line = selectors[i + 1].geometry.coordinates as GeoJSONCoordinate[];
            // const [line0, line1] = transformer.getRotatedBoundingBox(true)[i];

            if (flipped) {
                line = line.reverse();
                if (vertical) {
                    i = i == Corner.bottomRight ? Corner.bottomLeft : Corner.bottomRight;
                } else {
                    i = i == Corner.bottomLeft ? Corner.topRight : Corner.bottomRight;
                }
            }

            const [line0, line1] = line;
            const center = transformer.getCenter();
            const rotation = transformer.rotation;
            let centerpx = map.getPixelCoord(center);
            let line0px = map.getPixelCoord(line0);
            let line1px = map.getPixelCoord(line1);
            let position = getClosestPntOnLine(line0px, line1px, [e.mapX, e.mapY, 0]);

            line0px = rotate(line0px, rotation, centerpx);
            line1px = rotate(line1px, rotation, centerpx);
            position = rotate(position, rotation, centerpx);

            let sx = 1;
            let sy = 1;
            let delta;

            if (vertical) {
                const _dx = line1px[0] - line0px[0];
                delta = position[0] - line0px[0];
                sx = delta / _dx;
            } else {
                const _dy = line1px[1] - line0px[1];
                delta = position[1] - line0px[1];
                sy = delta / _dy;
            }


            if (initialDirection != delta > 0) {
                initialDirection = !initialDirection;
                flipped = !flipped;
            }

            if (Math.abs(delta) > scaleBox.buffer + 6) {
                transformer.scale(sx, sy, transformer.getCorner(i));
                scaled = true;
            }
        }

        let scaleCenter;

        function dragStart() {
            const items = transformer.getFeatures();
            // scale is not possible if it's just a single location (POI/ADDRESS/MARKER)
            skip = items.length == 1 && items[0].geometry.type == 'Point';

            scaled = false;
            scaleCenter = null;

            const {index, vertical} = this.properties;
            const i: Corner = index == Corner.topLeft ? Corner.bottomLeft : index - 1;
            const [line0, line1] = selectors[i + 1].geometry.coordinates as GeoJSONCoordinate[];
            //  [line0, line1] = transformer.getRotatedBoundingBox(true)[i];

            let line0px = map.getPixelCoord(line0);
            let line1px = map.getPixelCoord(line1);

            const center = transformer.getCenter();
            const rotation = transformer.rotation;
            let centerpx = map.getPixelCoord(center);
            line0px = rotate(line0px, rotation, centerpx);
            line1px = rotate(line1px, rotation, centerpx);

            if (vertical) {
                initialDirection = (line1px[0] - line0px[0]) > 0;
            } else {
                initialDirection = (line1px[1] - line0px[1]) > 0;
            }


            flipped = false;
        }

        function dragStop() {
            if (scaled) {
                transformer.markObjsAsMod();
            }
        }

        function mouseOver() {
            document.body.style.cursor = 'move';
        }

        function mouseOut() {
            document.body.style.cursor = 'default';
        }

        for (let i = 1; i < selectors.length; i++) {
            const item = <any>selectors[i];
            item.pointerdown = dragStart;
            item.pressmove = dragMove;
            item.pointerup = dragStop;
            item.pointerenter = mouseOver;
            item.pointerleave = mouseOut;
        }

        this.overlay = overlay;
        this.features = selectors;
        this.iEdit = internalEditor;


        this.update();
    }

    setScale(sx: number, sy: number, scaleCenter) {
        this.transformer.scaleFeatures(this.features, sx, sy, scaleCenter);
    }

    // getRotatedBoundingBox() {
    //     let points = this.features[0].geometry.coordinates[0].slice(1);
    //     // const buffer = -this.buffer;
    //     // points = points.map((p) => this.iEdit.map.getPixelCoord(p));
    //     // // // north
    //     // points[0] = [points[0][0] + buffer, points[0][1] + buffer];
    //     // // // east
    //     // points[1] = [points[1][0] - buffer, points[1][1] + buffer];
    //     // // // south
    //     // points[2] = [points[2][0] - buffer, points[2][1] - buffer];
    //     // // // west
    //     // points[3] = [points[3][0] + buffer, points[3][1] - buffer];
    //     // points = points.map((p) => this.iEdit.map.getGeoCoord(p));
    //
    //     return points;
    // }

    setRotation(rotation: number, center: number[]) {
        for (let feature of this.features) {
            feature.getProvider().setFeatureCoordinates(feature,
                this.iEdit.map.rotateGeometry(
                    feature.geometry,
                    center,
                    rotation
                )
            );
        }
    }

    update() {
        let {buffer, transformer, features, overlay} = this;
        const provider = overlay.getProvider();

        const offsetTopLeft = transformer.getCorner(Corner.topLeft, -buffer, -buffer);
        const offsetTopRight = transformer.getCorner(Corner.topRight, buffer, -buffer);
        const offsetBottomRight = transformer.getCorner(Corner.bottomRight, buffer, buffer);
        const offsetBottomLeft = transformer.getCorner(Corner.bottomLeft, -buffer, buffer);

        provider.setFeatureCoordinates(features[0], [[offsetTopLeft, offsetTopRight, offsetBottomRight, offsetBottomLeft, offsetTopLeft]]);
        // top line
        provider.setFeatureCoordinates(features[1], [offsetTopLeft, offsetTopRight]);
        // right line
        provider.setFeatureCoordinates(features[2], [offsetTopRight, offsetBottomRight]);
        // bottom line
        provider.setFeatureCoordinates(features[3], [offsetBottomRight, offsetBottomLeft]);
        // left line
        provider.setFeatureCoordinates(features[4], [offsetBottomLeft, offsetTopLeft]);
    };

    hide() {
        const {overlay, features} = this;
        overlay.hideFeature(features);
    };

    show() {
        const {overlay, features} = this;
        overlay.showFeature(features);
    };

    remove() {
        const {overlay, features} = this;
        overlay.remove(features);
    };

    pan(dx: number, dy: number) {
        for (let item of this.features) {
            this.iEdit.map.pixelMove(item, dx, dy);
        }
    }
}

export default ScaleBox;
