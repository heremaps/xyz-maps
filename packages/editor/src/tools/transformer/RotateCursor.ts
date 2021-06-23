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
import {geotools} from '@here/xyz-maps-common';
import {Cursor} from './Cursor';
import InternalEditor from '../../IEditor';
import {GeoJSONCoordinate, Style} from '@here/xyz-maps-core';
import Overlay from '../../features/Overlay';
import Transformer from './Transformer';

class RotateCursor extends Cursor {
    constructor(
        internalEditor: InternalEditor,
        position: GeoJSONCoordinate,
        overlay: Overlay,
        transformer: Transformer,
        style: Style[],
        hoverStyle: Style[]
    ) {
        super(internalEditor, position, overlay, transformer, style);

        let rotated;
        let items;
        let rotCenter;
        let initialBearing;
        let prevBearing;
        let obj;


        const onPointerEnterLeave = (e) => {
            const isMouseOver = e.type == 'pointerenter';

            document.body.style.cursor = isMouseOver ? 'move' : 'default';

            internalEditor.setStyle(this, isMouseOver ? hoverStyle : style);
        };

        this.__ = {
            pressmove: (e, dx, dy) => {
                if (!rotated) {
                    transformer.visible(!(rotated = true));
                }

                const deltaBearing = geotools.calcBearing(
                    rotCenter,
                    internalEditor.map.getGeoCoord(e.mapX, e.mapY)
                ) - initialBearing;

                for (let i = 0; i < items.length; i++) {
                    obj = items[i];

                    oTools._setCoords(
                        obj,
                        internalEditor.map.rotateGeometry(
                            obj.geometry,
                            rotCenter,
                            deltaBearing - prevBearing
                        )
                    );
                }

                prevBearing = deltaBearing;
            },
            pointerdown: (e) => {// start
                rotated = false;

                rotCenter = transformer.getCenter();

                initialBearing = geotools.calcBearing(
                    rotCenter,
                    internalEditor.map.getGeoCoord(e.mapX, e.mapY)
                );

                items = transformer.getObjects();

                prevBearing = 0;
            },
            pointerup: () => {
                if (rotated) {
                    // rotate is not possible if only one point address or POI is in transformer
                    if (items.length > 1 || items[0].geometry.type != 'Point') {
                        transformer.markObjsAsMod();
                        transformer.objBBoxChanged();
                    }
                }

                items = null;
                rotCenter = null;

                transformer.visible(true);
            },
            pointerenter: onPointerEnterLeave,
            pointerleave: onPointerEnterLeave
        };
    }
}

export default RotateCursor;
