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

import {Knob} from './Knob';
import InternalEditor from '../../IEditor';
import {GeoJSONCoordinate, Style} from '@here/xyz-maps-core';
import Overlay from '../../features/Overlay';
import Transformer, {Corner} from './Transformer';
import {getClosestPntOnLine, getDistance} from '../../geometry';

class ScaleKnob extends Knob {
    constructor(
        internalEditor: InternalEditor,
        position: GeoJSONCoordinate,
        overlay: Overlay,
        transformer: Transformer,
        style: Style[],
        hoverStyle: Style[]
    ) {
        super(internalEditor, position, overlay, transformer, style);

        let scaled: boolean;
        let prevScale: number;
        let items;
        let scaleCenter;
        let initialPosition;
        let initialSize;

        this.__ = {
            pressmove: (e, dx, dy) => {
                const coordinate = internalEditor.map.getGeoCoord(e.mapX, e.mapY);
                let position = getClosestPntOnLine(initialPosition, scaleCenter, coordinate);


                // const rotate = (x: number, y: number, originX: number, originY: number, angle: number): Point => {
                //     let sin = Math.sin(angle);
                //     let cos = Math.cos(angle);
                //     let dx = x - originX;
                //     let dy = y - originY;
                //     return [
                //         cos * dx - sin * dy + originX,
                //         sin * dx + cos * dy + originY
                //     ];
                // };
                // let c = transformer.getCenter();
                // position = rotate(position[0], position[1], c[0], c[1], transformer.rotation);


                const size = getDistance(position, scaleCenter);
                const scale = size / initialSize;
                const dScale = scale / prevScale;

                if (!scaled) {
                    transformer.visible(!(scaled = true));
                }

                transformer.scale(dScale, dScale);

                prevScale = scale;
            },
            pointerdown: (e) => {// start
                scaled = false;

                scaleCenter = transformer.getCenter();
                // let b = transformer.getBBox();
                // scaleCenter=[b[0],b[1]];

                scaleCenter[2] = 0;

                initialPosition = this.geometry.coordinates.slice(0, 2);
                initialPosition[2] = 0;

                initialSize = getDistance(initialPosition, scaleCenter);

                items = transformer.getFeatures();

                prevScale = 1;
            },
            pointerup: () => {
                if (scaled) {
                    // rotate is not possible if only one point address or POI is in transformer
                    if (items.length > 1 || items[0].geometry.type != 'Point') {
                        transformer.markObjsAsMod();
                        // transformer.objBBoxChanged();
                    }
                }

                items = null;
                scaleCenter = null;

                transformer.visible(true);
            }
        };

        this.enableHover('nwse-resize', hoverStyle);
    }

    update() {
        // const topLeft = this.transformer.getRotatedBoundingBox()[0];
        const position = this.transformer.getCorner(Corner.topLeft, -15, -15);
        this.setPosition(position[0], position[1]);
    }
}

export default ScaleKnob;
