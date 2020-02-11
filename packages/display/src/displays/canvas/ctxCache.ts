/*
 * Copyright (C) 2019-2020 HERE Europe B.V.
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

let MAX = 128;
let freed = [];

type GlobalCtxCache = {
    length: number;
    max: number;
    clear: () => void;
    create: (size: number) => CanvasRenderingContext2D;
    get: (size: number) => CanvasRenderingContext2D;
    release: (ctx: CanvasRenderingContext2D) => void;
}

const globalCtxCache: GlobalCtxCache = {

    length: 0,

    max: MAX,

    clear: function() {
        this.length = 0;
    },

    create: function(size: number) {
        let canvas = document.createElement('canvas');

        canvas.width =
            canvas.height = size;

        this.length++;

        return canvas.getContext('2d');
    },

    get: function(size: number) {
        if (freed.length) {
            this.length++;

            return freed.shift();
        }

        return this.create(size);
    },


    release: function(ctx: CanvasRenderingContext2D) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);

        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        ctx.lineWidth = 1;

        ctx.globalAlpha = 1;

        freed.push(ctx);

        this.length--;
    }
};

export default globalCtxCache;
