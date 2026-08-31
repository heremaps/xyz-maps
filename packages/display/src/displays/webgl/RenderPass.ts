/*
 * Copyright (C) 2019-2026 HERE Europe B.V.
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

import {ClearMask, GraphicsDevice} from './device/GraphicsDevice';
import {IRenderTarget} from './RenderTarget';
import {RenderState} from './RenderState';

export enum PASS {
    NONE = 0,
    /**
     * fully opaque geometry
     */
    OPAQUE = 1 << 0,
    /**
     * alpha depth / stencil pre-pass (1st pass of dual alpha (depth + color))
     * not needed for simple alpha blending
     */
    ALPHA_DEPTH = 1 << 1,
    /**
     * alpha color pass (simple alpha or 2nd pass of dual alpha (depth + color))
     */
    ALPHA_COLOR = 1 << 2
}

export interface RenderPassDescriptor {
    renderTarget: IRenderTarget;

    viewport?: {
        x: number;
        y: number;
        width: number;
        height: number;
    };

    clear?: {
        color?: [number, number, number, number];
        depth?: number;
        stencil?: number;
    };

    state?: RenderState;
}


export class RenderPass {
    constructor(
        public readonly type: PASS,
        private readonly desc: RenderPassDescriptor
    ) {
        desc.state ||= {};
    }

    begin(device: GraphicsDevice) {
        const vp = this.desc.viewport;
        const clear = this.desc.clear;
        // draws bind their actual target in Program.preparePass(); only bind the pass target when needed.
        if (vp || clear) {
            this.desc.renderTarget.bind(device);
        }

        if (vp) {
            device.setViewport(vp.x, vp.y, vp.width, vp.height);
        }

        if (clear) {
            let mask = 0;
            const clearColor = clear.color;
            if (clearColor) {
                device.setClearColor(clearColor[0], clearColor[1], clearColor[2], clearColor[3]);
                mask |= ClearMask.COLOR;
            }
            if (clear.depth !== undefined) {
                device.setClearDepth(clear.depth);
                mask |= ClearMask.DEPTH;
            }
            if (clear.stencil !== undefined) {
                device.setClearStencil(clear.stencil);
                mask |= ClearMask.STENCIL;
            }
            if (mask) device.clear(mask);
        }


        this.reassertPassState(device);
    }

    reassertPassState(device: GraphicsDevice, passState: RenderState = this.desc.state) {
        device.applyRenderState(passState);
    }


    reassertStencilState(device: GraphicsDevice) {
        device.applyStencilState(this.desc.state.stencil);
    }

    end(_device: GraphicsDevice) {
    }
}
