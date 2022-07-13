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

import oTools from '../../features/oTools';
import {geotools} from '@here/xyz-maps-common';
import {Knob} from './Knob';
import InternalEditor from '../../IEditor';
import {GeoJSONCoordinate, Style} from '@here/xyz-maps-core';
import Overlay from '../../features/Overlay';
import Transformer, {Corner} from './Transformer';

class RotateKnob extends Knob {
    constructor(
        internalEditor: InternalEditor,
        position: GeoJSONCoordinate,
        overlay: Overlay,
        transformer: Transformer
    ) {
        super(internalEditor, position, overlay, transformer, {type: 'TRANSFORMER_ROTATE_KNOB'});

        let rotated;
        let items;
        let rotCenter;
        let initialBearing = null;
        let prevBearing;


        prevBearing = 0;

        this.__ = {
            pressmove: (e, dx, dy) => {
                // if (!rotated) {
                // transformer.visible(!(rotated = true));
                // }
                rotated = true;

                const deltaBearing = geotools.calcBearing(
                    rotCenter,
                    internalEditor.map.getGeoCoord(e.mapX, e.mapY)
                ) - initialBearing;

                transformer.setRotation(deltaBearing);

                for (let item of items) {
                    oTools._setCoords(
                        item,
                        internalEditor.map.rotateGeometry(
                            item.geometry,
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

                if (initialBearing == null) {
                    initialBearing = geotools.calcBearing(
                        rotCenter,
                        internalEditor.map.getGeoCoord(e.mapX, e.mapY)
                    );
                }

                items = transformer.getFeatures();
            },
            pointerup: () => {
                if (rotated) {
                    // rotate is not possible if only one point address or POI is in transformer
                    if (items.length > 1 || items[0].geometry.type != 'Point') {
                        transformer.markObjsAsMod();
                        // transformer.objBBoxChanged();
                    }
                }

                items = null;
                rotCenter = null;

                // transformer.visible(true);
            }
        };

        this.enableHover('move');
    }

    update() {
        const position = this.transformer.getCorner(Corner.bottomRight, 15, 15);
        this.setPosition(position[0], position[1]);
    }
}

export default RotateKnob;
