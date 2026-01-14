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
export class VAOManager {
    isVAOSupported: boolean;

    constructor(gl: WebGLRenderingContext | WebGL2RenderingContext) {
        const isWebGL2 = gl instanceof WebGL2RenderingContext;
        // const ext = null;
        const ext = isWebGL2 ? null : gl.getExtension('OES_vertex_array_object');

        this.isVAOSupported = isWebGL2 || !!ext;

        if (isWebGL2) {
            this.createVAO = () => (gl as WebGL2RenderingContext).createVertexArray();
            this.bindVAO = (vao) => (gl as WebGL2RenderingContext).bindVertexArray(vao as WebGLVertexArrayObject);
            this.deleteVAO = (vao) => (gl as WebGL2RenderingContext).deleteVertexArray(vao as WebGLVertexArrayObject);
        } else if (ext) {
            this.createVAO = () => ext.createVertexArrayOES();
            this.bindVAO = (vao) => ext.bindVertexArrayOES(vao as WebGLVertexArrayObjectOES);
            this.deleteVAO = (vao) => ext.deleteVertexArrayOES(vao as WebGLVertexArrayObjectOES);
        }
    }

    createVAO(): WebGLVertexArrayObject | WebGLVertexArrayObjectOES | null {
        return null;
    };

    bindVAO(vao: WebGLVertexArrayObject | WebGLVertexArrayObjectOES | null) {
    };

    deleteVAO(vao: WebGLVertexArrayObject | WebGLVertexArrayObjectOES | null) {
    };
}
