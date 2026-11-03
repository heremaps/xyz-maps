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
import {describe, expect, it, vi} from 'vitest';
import Program from '../../../display/src/displays/webgl/program/Program';
import TextProgram from '../../../display/src/displays/webgl/program/Text';
import {GraphicsDevice} from '../../../display/src/displays/webgl/device/GraphicsDevice';

function deviceFixture(gl: WebGLRenderingContext): GraphicsDevice {
    return Object.assign(Object.create(GraphicsDevice.prototype), {gl});
}

function fixture() {
    const gl = {
        FLOAT: 5126, INT: 5124, BOOL: 35670, SAMPLER_2D: 35678,
        FLOAT_VEC2: 35664, FLOAT_VEC3: 35665, FLOAT_VEC4: 35666,
        FLOAT_MAT3: 35675, FLOAT_MAT4: 35676,
        uniform1f: vi.fn(), uniform1i: vi.fn(), uniform1iv: vi.fn(),
        uniform2fv: vi.fn(), uniform3fv: vi.fn(), uniform4fv: vi.fn(),
        uniformMatrix3fv: vi.fn(), uniformMatrix4fv: vi.fn()
    };
    const program = Object.create(Program.prototype);
    program.gl = gl;
    program.device = deviceFixture(gl as unknown as WebGLRenderingContext);
    program.texUnitCount = 0;
    const setter = (type: number, size = 1, location = {}) =>
        program.createUniformSetter({type, size, name: 'test'}, location);
    return {gl, program, setter};
}

describe('Numeric uniform setter cache', () => {
    it('uploads first scalar, skips repeats and uploads changes with Float32 semantics', () => {
        const {gl, setter} = fixture();
        const set = setter(gl.FLOAT);
        set(0);
        set(0);
        set(1);
        set(1 + Number.EPSILON);
        set(-0);
        set(NaN);
        set(NaN);
        set(Infinity);
        set(Infinity);
        expect(gl.uniform1f.mock.calls.map((call) => call[1])).toEqual([0, 1, -0, NaN, Infinity]);
    });

    it.each(['INT', 'BOOL'] as const)('caches %s after integer conversion', (type) => {
        const {gl, setter} = fixture();
        const set = setter(gl[type]);
        set(0);
        set(false);
        set(1);
        set(true);
        set(2);
        set(2);
        expect(gl.uniform1i).toHaveBeenCalledTimes(3);
    });

    it.each([
        ['FLOAT_VEC2', 'uniform2fv', 2],
        ['FLOAT_VEC3', 'uniform3fv', 3],
        ['FLOAT_VEC4', 'uniform4fv', 4],
        ['FLOAT_MAT3', 'uniformMatrix3fv', 9],
        ['FLOAT_MAT4', 'uniformMatrix4fv', 16]
    ] as const)('snapshots mutable %s arrays, including typed views and length changes', (type, method, size) => {
        const {gl, setter} = fixture();
        const set = setter(gl[type]);
        const value = Array(size).fill(1);
        set(value);
        set(value);
        set(new Float32Array(value));
        value[size - 1] = 2;
        set(value);
        set(value);
        const backing = new Float32Array(size + 2).fill(2);
        const view = backing.subarray(1, size + 1);
        set(view);
        backing[size] = 3;
        set(view);
        set(view);
        set([...view, 4]);
        expect(gl[method]).toHaveBeenCalledTimes(5);
        if (type.includes('MAT')) expect(gl[method].mock.calls[0][1]).toBe(false);
    });

    it('compares rounded array numbers, NaN and signed zero', () => {
        const {gl, setter} = fixture();
        const set = setter(gl.FLOAT_VEC2);
        set([1, NaN]);
        set([1 + Number.EPSILON, NaN]);
        set(new Float64Array([1 + Number.EPSILON, NaN]));
        set([0, NaN]);
        set([-0, NaN]);
        set(new Float32Array([-0, NaN]));
        expect(gl.uniform2fv).toHaveBeenCalledTimes(3);
    });

    it('does not share snapshots between locations, setters or program instances', () => {
        const first = fixture();
        const second = fixture();
        const a = first.setter(first.gl.FLOAT_VEC2);
        const b = first.setter(first.gl.FLOAT_VEC2);
        a([0, 0]);
        b([0, 0]);
        first.setter(first.gl.FLOAT_VEC2)([0, 0]);
        second.setter(second.gl.FLOAT_VEC2)([0, 0]);
        a([0, 0]);
        expect(first.gl.uniform2fv).toHaveBeenCalledTimes(3);
        expect(second.gl.uniform2fv).toHaveBeenCalledTimes(1);
    });

    it.each(['webgl', 'webgl2'] as const)('resets locations and caches when recompiling with %s', (context) => {
        const gl = document.createElement('canvas').getContext(context) as
            WebGLRenderingContext | WebGL2RenderingContext;
        expect(gl).toBeTruthy();
        const program = Object.create(Program.prototype);
        program.gl = gl;
        program.device = deviceFixture(gl);
        program.uniforms = {};
        program.uniformSetters = {};
        program.attributeLocations = {};
        program.buildSource = (vertex: string, fragment: string) => [vertex, fragment];
        program.getUniformBlocksFromShader = () => [];
        const vertex = 'attribute vec4 position; void main() { gl_Position = position; }';
        const fragment = 'precision highp float; uniform vec2 value; void main() { gl_FragColor = vec4(value, 0., 1.); }';
        const upload = vi.spyOn(gl, 'uniform2fv');
        const compile = () => {
            program.compile(vertex, fragment);
            gl.useProgram(program.prog);
        };
        try {
            compile();
            program.initUniform('value', [1, 2]);
            program.initUniform('value', [1, 2]);
            expect(upload).toHaveBeenCalledTimes(1);
            expect(Array.from(gl.getUniform(program.prog, program.uniforms.value))).toEqual([1, 2]);
            program.uniformSetters.stale = () => {};
            program.uniforms.stale = program.uniforms.value;
            program.delete();
            compile();
            expect(program.initUniform('stale', 1)).toBeUndefined();
            expect(program.uniforms.stale).toBeUndefined();
            program.initUniform('value', [1, 2]);
            expect(upload).toHaveBeenCalledTimes(2);
            expect(Array.from(gl.getUniform(program.prog, program.uniforms.value))).toEqual([1, 2]);
            expect(gl.getError()).toBe(gl.NO_ERROR);
        } finally {
            upload.mockRestore();
            program.delete();
        }
    });

    it.each([1, 2])('preserves every sampler upload and texture bind for size %i', (size) => {
        const {gl, setter} = fixture();
        const set = setter(gl.SAMPLER_2D, size);
        const texture = {bind: vi.fn()};
        const value = size === 1 ? texture : [texture, texture];
        set(value);
        set(value);
        expect(texture.bind).toHaveBeenCalledTimes(2 * size);
        expect(size === 1 ? gl.uniform1i : gl.uniform1iv).toHaveBeenCalledTimes(2);
    });

    it('keeps direct text stroke/fill draws synchronized with the numeric setter', () => {
        const {gl, setter} = fixture();
        const text = Object.create(TextProgram.prototype);
        text.gl = gl;
        text.uniformSetters = {u_strokeOnly: setter(gl.BOOL)};
        const draw = vi.spyOn(Program.prototype, 'draw').mockImplementation(() => {});
        try {
            text.initUniform('u_strokeOnly', 1);
            text.draw({});
            text.initUniform('u_strokeOnly', 1);
            expect(gl.uniform1i.mock.calls.map((call) => call[1])).toEqual([1, 0, 1]);
            expect(draw).toHaveBeenCalledTimes(2);
        } finally {
            draw.mockRestore();
        }
    });
});
