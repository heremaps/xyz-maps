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
import {rotate} from '../../geometry';

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

    constructor(
        transformer: Transformer,
        buffer: number,
        internalEditor: InternalEditor,
        overlay: Overlay
    ) {
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


        let initialSize: number;
        let initialPosition: number;
        let previousScale: number;
        let scaleCenter: GeoJSONCoordinate;
        let rotationCenter: number[];
        let rotation: number;

        function dragMove(e) {
            if (skip) return;

            const {vertical} = this.properties;
            const position = rotate([e.mapX, e.mapY, 0], rotation, rotationCenter);
            const scale = 1 + (position[vertical ? 0 : 1] - initialPosition) / initialSize;

            // Keep the geometry invertible while crossing the fixed opposite edge.
            if (Math.abs(initialSize * scale) < 6 || scale === previousScale) return;

            const deltaScale = scale / previousScale;
            transformer.scale(vertical ? deltaScale : 1, vertical ? 1 : deltaScale, scaleCenter);
            previousScale = scale;
            scaled = true;
        }

        function dragStart(e) {
            const items = transformer.getFeatures();
            // scale is not possible if it's just a single location (POI/ADDRESS/MARKER)
            skip = items.length == 1 && items[0].geometry.type == 'Point';

            scaled = false;
            previousScale = 1;

            const {index, vertical} = this.properties;
            const i: Corner = index == Corner.topLeft ? Corner.bottomLeft : index - 1;
            // Use the unbuffered drag-start geometry, not the changing selection frame.
            const [line0, line1] = transformer.getRotatedBoundingBox(true)[i] as GeoJSONCoordinate[];

            let line0px = map.getPixelCoord(line0);
            let line1px = map.getPixelCoord(line1);

            const center = transformer.getCenter();
            rotation = transformer.rotation;
            rotationCenter = map.getPixelCoord(center);
            line0px = rotate(line0px, rotation, rotationCenter);
            line1px = rotate(line1px, rotation, rotationCenter);

            const axis = vertical ? 0 : 1;
            initialSize = line1px[axis] - line0px[axis];
            initialPosition = rotate([e.mapX, e.mapY, 0], rotation, rotationCenter)[axis];
            scaleCenter = transformer.getCorner(i).slice();
            skip = skip || initialSize === 0;
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
