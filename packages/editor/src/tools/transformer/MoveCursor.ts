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
import {Cursor} from './Cursor';
import Transformer from './Transformer';
import {Style} from '@here/xyz-maps-core';

class MoveCursor extends Cursor {
    constructor(
        internalEditor: InternalEditor,
        position,
        overlay: Overlay,
        transformer: Transformer,
        style: Style | Style[]
    ) {
        super(internalEditor, position, overlay, transformer, style);

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
                for (let item of transformer.getObjects()) {
                    internalEditor.map.pixelMove(item, dx - props._dx, dy - props._dy);
                }
                props._dx = dx;
                props._dy = dy;
                transformer.objBBoxChanged();
            },
            pointerup: () => {
                if (this.properties.moved) {
                    transformer.markObjsAsMod();
                }
            }
        };
    }
}

export default MoveCursor;
