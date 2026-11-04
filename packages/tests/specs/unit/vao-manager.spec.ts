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
import {afterEach, describe, expect, it, vi} from 'vitest';

vi.mock('../../../display/src/displays/webgl/glTools', () => ({
    isWebGL2: (gl: {webgl2?: boolean}) => !!gl.webgl2
}));
import {VAOManager} from '../../../display/src/displays/webgl/device/VAOManager';
import type {GLExtensions} from '../../../display/src/displays/webgl/device/GLExtensions';

afterEach(() => vi.restoreAllMocks());

function setup(webgl2: boolean, supported = true) {
    const canvas = new EventTarget();
    const bind = vi.fn();
    const remove = vi.fn();
    const create = vi.fn(() => ({}));
    const gl = {
        canvas, webgl2, createVertexArray: create, bindVertexArray: bind, deleteVertexArray: remove,
        getExtension: vi.fn(() => extension)
    };
    const extension = {createVertexArrayOES: create, bindVertexArrayOES: bind, deleteVertexArrayOES: remove};
    const extensions = {getExtension: vi.fn(() => supported ? extension : null)};
    const manager = new VAOManager(gl as unknown as WebGL2RenderingContext, extensions as unknown as GLExtensions);
    return {manager, bind, remove, create, canvas, gl, extensions};
}

describe.each([true, false])('VAO binding cache (WebGL2: %s)', (webgl2) => {
    it('binds unknown/default, first, different and default arrays, skipping only repeats', () => {
        const {manager, bind} = setup(webgl2);
        const a = manager.createVAO();
        const b = manager.createVAO();
        for (const vao of [null, null, a, a, b, b, null, null, a]) manager.bindVAO(vao);
        expect(bind.mock.calls).toEqual([[null], [a], [b], [null], [a]]);
    });

    it('preserves active binding on inactive/null deletion and tracks active deletion as default', () => {
        const {manager, bind, remove} = setup(webgl2);
        const a = manager.createVAO();
        const b = manager.createVAO();
        manager.bindVAO(a);
        manager.deleteVAO(b);
        manager.deleteVAO(null);
        manager.bindVAO(a);
        expect(bind).toHaveBeenCalledTimes(1);
        manager.deleteVAO(a);
        manager.bindVAO(null);
        expect(bind).toHaveBeenCalledTimes(1);
        expect(remove.mock.calls).toEqual([[b], [null], [a]]);
    });

    it('forgets bindings on external-state invalidation and context restoration', () => {
        const {manager, bind, canvas} = setup(webgl2);
        manager.bindVAO(null);
        manager.invalidateState();
        manager.bindVAO(null);
        canvas.dispatchEvent(new Event('webglcontextrestored'));
        manager.bindVAO(null);
        expect(bind.mock.calls).toEqual([[null], [null], [null]]);
    });

    it('keeps state per manager/context', () => {
        const first = setup(webgl2);
        const second = setup(webgl2);
        const a = first.manager.createVAO();
        first.manager.bindVAO(a);
        second.manager.bindVAO(null);
        first.manager.bindVAO(a);
        expect(first.bind).toHaveBeenCalledTimes(1);
        expect(second.bind).toHaveBeenCalledTimes(1);
    });

    it('does not infer a known binding from deleting an inactive array', () => {
        const {manager, bind} = setup(webgl2);
        manager.deleteVAO(manager.createVAO());
        manager.bindVAO(null);
        expect(bind.mock.calls).toEqual([[null]]);
    });
});

it('refreshes native OES methods rather than retaining the pre-loss extension', () => {
    const {manager, gl, canvas, bind} = setup(false);
    const restored = {createVertexArrayOES: vi.fn(() => ({})), bindVertexArrayOES: vi.fn(), deleteVertexArrayOES: vi.fn()};
    gl.getExtension.mockReturnValue(restored);
    canvas.dispatchEvent(new Event('webglcontextrestored'));
    const vao = manager.createVAO();
    manager.bindVAO(vao);
    manager.deleteVAO(vao);
    expect(restored.createVertexArrayOES).toHaveBeenCalledOnce();
    expect(restored.bindVertexArrayOES).toHaveBeenCalledWith(vao);
    expect(restored.deleteVertexArrayOES).toHaveBeenCalledWith(vao);
    expect(bind).not.toHaveBeenCalled();
});

it('keeps the unsupported WebGL1 path inert', () => {
    const {manager, bind, remove, create} = setup(false, false);
    expect(manager.isVAOSupported).toBe(false);
    expect(manager.createVAO()).toBe(null);
    manager.bindVAO(null);
    manager.deleteVAO(null);
    expect(bind).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
});
