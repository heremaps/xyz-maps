/*
 * Copyright (C) 2026 HERE Europe B.V.
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
import {describe, expect, it, vi} from 'vitest';
import {VAOManager} from '../../../display/src/displays/webgl/device/VAOManager';
import {GLExtensions} from '../../../display/src/displays/webgl/device/GLExtensions';
import Program from '../../../display/src/displays/webgl/program/Program';
import {GLRender} from '../../../display/src/displays/webgl/GLRender';

describe.each(['webgl2', 'webgl'] as const)('native VAO cache (%s)', (kind) => {
    it('forgets cached bindings when the native context is restored', async () => {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext(kind) as WebGL2RenderingContext;
        const manager = new VAOManager(gl, new GLExtensions(gl, []));
        manager.bindVAO(manager.createVAO());
        const lose = gl.getExtension('WEBGL_lose_context');
        expect(lose).toBeTruthy();
        const restored = new Promise<void>((resolve) => {
            canvas.addEventListener('webglcontextrestored', () => resolve(), {once: true});
        });
        canvas.addEventListener('webglcontextlost', (event) => {
            event.preventDefault();
            setTimeout(() => lose.restoreContext(), 50);
        }, {once: true});
        lose.loseContext();
        await restored;
        const vao = manager.createVAO();
        manager.bindVAO(vao);
        manager.bindVAO(vao);
        const ext = kind === 'webgl' ? gl.getExtension('OES_vertex_array_object') : null;
        expect(gl.getParameter(ext ? ext.VERTEX_ARRAY_BINDING_OES : gl.VERTEX_ARRAY_BINDING)).toBe(vao);
        manager.deleteVAO(vao);
        expect(gl.getError()).toBe(gl.NO_ERROR);
    });

    it('agrees with native binding after switching, deletion and external invalidation', () => {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext(kind) as WebGL2RenderingContext;
        expect(gl).toBeTruthy();
        const extensions = new GLExtensions(gl, []);
        const manager = new VAOManager(gl, extensions);
        expect(manager.isVAOSupported).toBe(true);
        const ext = kind === 'webgl' ? gl.getExtension('OES_vertex_array_object') : null;
        const binding = kind === 'webgl2' ? gl.VERTEX_ARRAY_BINDING : ext.VERTEX_ARRAY_BINDING_OES;
        const a = manager.createVAO();
        const b = manager.createVAO();
        manager.bindVAO(a);
        manager.bindVAO(a);
        expect(gl.getParameter(binding)).toBe(a);
        manager.deleteVAO(b);
        expect(gl.getParameter(binding)).toBe(a);
        manager.deleteVAO(a);
        manager.bindVAO(null);
        expect(gl.getParameter(binding)).toBe(null);
        const external = manager.createVAO();
        if (ext) ext.bindVertexArrayOES(external);
        else gl.bindVertexArray(external);
        manager.invalidateState();
        manager.bindVAO(null);
        expect(gl.getParameter(binding)).toBe(null);
        manager.deleteVAO(external);
        expect(gl.getError()).toBe(gl.NO_ERROR);
    });
});

it('still updates constant attributes on repeated bindings', () => {
    const gl = document.createElement('canvas').getContext('webgl2');
    const manager = new VAOManager(gl, new GLExtensions(gl, []));
    const program = Object.assign(Object.create(Program.prototype), {
        gl, device: {vaoManager: manager},
        attributeLocations: {constant: {index: 0, length: 1}}
    });
    const attributes = {constant: {value: [1, 2, 3, 4]}};
    const buffer = {groups: [{}], getAttributes: () => attributes};
    program.initBufferAttributes(buffer, 0);
    attributes.constant.value = [4, 3, 2, 1];
    program.initBufferAttributes(buffer, 0);
    expect(Array.from(gl.getVertexAttrib(0, gl.CURRENT_VERTEX_ATTRIB))).toEqual([4, 3, 2, 1]);
    expect(gl.getError()).toBe(gl.NO_ERROR);
    manager.deleteVAO(buffer.groups[0]['vao']);
});

it('invalidates before unbinding VAOs modified by custom layers', () => {
    const gl = document.createElement('canvas').getContext('webgl2');
    const manager = new VAOManager(gl, new GLExtensions(gl, []));
    manager.bindVAO(null);
    const external = manager.createVAO();
    const device = {
        vaoManager: manager, setDepthRange: vi.fn(), setScissorTest: vi.fn(), setStencilTest: vi.fn(),
        unbindVertexArray: () => manager.bindVAO(null),
        invalidateState: () => manager.invalidateState(), resetStateToDefaults: vi.fn()
    };
    const render = Object.assign(Object.create(GLRender.prototype), {
        gl, device, worldMatrix: [], getDepthForZIndex: () => 0,
        screenRenderTarget: {bind: vi.fn()}
    });
    render.drawCustom({renderOptions: {mode: '3d'}, render: () => gl.bindVertexArray(external)}, 0);
    expect(gl.getParameter(gl.VERTEX_ARRAY_BINDING)).toBe(null);
    manager.deleteVAO(external);
});
