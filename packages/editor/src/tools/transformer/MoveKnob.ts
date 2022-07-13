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
import InternalEditor from '../../IEditor';
import Overlay from '../../features/Overlay';
import {Knob} from './Knob';
import Transformer from './Transformer';
import {getPointAtLength, getTotalLength} from '../../geometry';

class MoveKnob extends Knob {
    internalEditor;

    constructor(
        internalEditor: InternalEditor,
        position,
        overlay: Overlay,
        transformer: Transformer
    ) {
        super(internalEditor, position, overlay, transformer, {
            type: 'TRANSFORMER_TRANSLATE_KNOB'
        });

        this.internalEditor = internalEditor;

        this.__ = {
            pointerdown: () => {
                const props = this.properties;
                props.moved = false;
                props._dx = 0;
                props._dy = 0;
            },
            pressmove: (e, dx, dy) => {
                const props = this.properties;
                props.moved = true;
                transformer.pan(dx - props._dx, dy - props._dy);
                props._dx = dx;
                props._dy = dy;
            },
            pointerup: () => {
                if (this.properties.moved) {
                    transformer.markObjsAsMod();
                }
            }
        };

        this.enableHover('move');
    }

    update() {
        const rotatedBoundingBox = this.transformer.getRotatedBoundingBox();
        const topLeft = rotatedBoundingBox[0];
        const bottomRight = rotatedBoundingBox[2];
        const diagonal = [topLeft, bottomRight];
        const c = getPointAtLength(diagonal, 0.5 * getTotalLength(diagonal));
        this.setPosition(c[0], c[1]);
    }
}

export default MoveKnob;
