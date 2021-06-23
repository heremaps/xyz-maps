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

import oTools from '../../features/oTools';
import {Feature, Style} from '@here/xyz-maps-core';
import Overlay from '../../features/Overlay';
import InternalEditor from '../../IEditor';
import Transformer from './Transformer';

const createRectGeometry = (minLon: number, minLat: number, maxLon: number, maxLat: number) => {
    return [
        [[minLon, maxLat], [maxLon, maxLat]],
        [[maxLon, maxLat], [maxLon, minLat]],
        [[maxLon, minLat], [minLon, minLat]],
        [[minLon, minLat], [minLon, maxLat]]
    ];
};

class ScaleSelector {
    private features: Feature[];
    private overlay: Overlay;

    constructor(
        internalEditor: InternalEditor,
        minLon: number,
        minLat: number,
        maxLon: number,
        maxLat: number,
        overlay: Overlay,
        transformer: Transformer,
        style: Style | Style[]
    ) {
        let orgBBox;
        let orgBBoxWidth;
        let orgBBoxHeight;
        let scaled;
        let items;
        const selectors = [
            overlay.addRect(minLon, minLat, maxLon, maxLat, style)
        ];
        const path = createRectGeometry(minLon, minLat, maxLon, maxLat);

        for (let i = 0; i < path.length; i++) {
            const isVertical = i % 2;
            selectors.push(overlay.addPath(path[i], [{
                zIndex: 0,
                zLayer: Infinity,
                type: 'Line',
                opacity: .02,
                strokeWidth: 4
            }], {
                orientation: isVertical ? 'V' : 'H',
                index: i,
                cursor: (isVertical ? 'ew' : 'ns') + '-resize'
            }));
        }

        function dragMove(e, dx, dy) {// move //h -> dy
            const index = this.properties.index;
            const orientation = this.properties.orientation;
            let fx = null;
            let fy = null;
            const allObjects = items;
            const centerScale = [];
            const currentPos = internalEditor.map.getGeoCoord(e.mapX, e.mapY);
            const gap = transformer.getGap();


            // scale is not possible if it's just a single location (POI/ADDRESS/MARKER)
            if (allObjects.length != 1 || allObjects[0].geometry.type != 'Point') {
                scaled = true;

                if (orientation == 'V' && orgBBoxWidth > 0) {
                    centerScale[1] = orgBBox[3];
                    fy = 1;

                    centerScale[0] = orgBBox[0] + (index == 1 ? 0 : orgBBoxWidth);
                    currentPos[0] += index == 1 ? -gap : gap;

                    fx = (orgBBoxWidth + currentPos[0] - (orgBBox[0] + orgBBoxWidth)) / orgBBoxWidth;
                    fx = index == 3 ? (1 - fx) : fx;
                } else if (orgBBoxHeight > 0) {
                    centerScale[0] = orgBBox[0];
                    fx = 1;

                    centerScale[1] = orgBBox[3] - (index == 2 ? 0 : orgBBoxHeight);
                    currentPos[1] += index == 2 ? gap : -gap;

                    fy = (orgBBoxHeight + (orgBBox[1] - currentPos[1])) / orgBBoxHeight;
                    fy = index == 0 ? (1 - fy) : fy;
                }

                if (fx && fy) {
                    for (let i = 0; i < allObjects.length; i++) {
                        const obj = allObjects[i];
                        const scaledGeo = internalEditor.map.scaleGeometry(
                            obj.geometry,
                            [fx / this.properties.fx, fy / this.properties.fy],
                            centerScale
                        );
                        oTools._setCoords(obj, scaledGeo);
                    }

                    transformer.objBBoxChanged();

                    this.properties.fx = fx;
                    this.properties.fy = fy;
                }
            }
        }

        function dragStart() {
            items = transformer.getObjects();
            scaled = false;
            orgBBox = transformer.getBBox();
            orgBBoxWidth = orgBBox[2] - orgBBox[0];
            orgBBoxHeight = orgBBox[3] - orgBBox[1];

            this.properties.fx = 1;
            this.properties.fy = 1;
        }

        function dragStop() {
            if (scaled) {
                transformer.markObjsAsMod();
            }
        }

        function mouseOver() {
            document.body.style.cursor = this.properties.cursor;
        }

        function mouseOut() {
            document.body.style.cursor = 'default';
        }

        for (let item of <any[]>selectors) {
            item.pointerdown = dragStart;
            item.pressmove = dragMove;
            item.pointerup = dragStop;
            item.pointerenter = mouseOver;
            item.pointerleave = mouseOut;
        }

        this.overlay = overlay;
        this.features = selectors;
    }

    update(minLon, minLat, maxLon, maxLat) {
        const {overlay, features} = this;
        const path = createRectGeometry(minLon, minLat, maxLon, maxLat);

        overlay.modifyRect(features[0], minLon, minLat, maxLon, maxLat);

        for (let i = 1; i < features.length; i++) {
            overlay.setFeatureCoordinates(features[i], path[i - 1]);
        }
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
}

export default ScaleSelector;
