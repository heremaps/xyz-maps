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


import {TemplateBuffer} from './TemplateBuffer';

export class TemplateBufferBucket<TmpBuffer extends TemplateBuffer> {
    buffers: TmpBuffer[];

    length: number = 0;

    constructor() {
        this.buffers = [];
    }


    push(buffer: TmpBuffer) {
        this.buffers.push(buffer);

        this.length++;
    }

    pop(): TmpBuffer {
        if (this.length) {
            this.length--;
            return this.buffers.pop();
        }
    }

    get(i: number) {
        return this.buffers[i];
    }

    set(i: number, buf: TmpBuffer) {
        this.buffers[i] = buf;
        this.length = this.buffers.length;
    }

    setIdOffset(featureId: string | number) {
        for (let buf of this.buffers) {
            buf.setIdOffset(featureId);
        }
    }

    isEmpty(): boolean {
        for (let buf of this.buffers) {
            if (buf.isEmpty()) return true;
        }
        return false;
    }

    toArray() {
        return this.buffers;
    }
}
