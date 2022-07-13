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

const dumpError = window.console.error;

const loadShader = (gl: WebGLRenderingContext, shaderSource: string, shaderType: number, onError?: (error) => void) => {
    onError = onError || dumpError;
    const shader = gl.createShader(shaderType);
    gl.shaderSource(shader, shaderSource);
    gl.compileShader(shader);
    let compiled = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (!compiled) {
        let lastError = gl.getShaderInfoLog(shader);
        onError('compileShader ' + lastError);
        gl.deleteShader(shader);
        return null;
    }
    return shader;
};

const loadProgram = (gl: WebGLRenderingContext, shaders: WebGLShader[], onError?: (error) => void) => {
    onError = onError || dumpError;
    const program = gl.createProgram();
    for (let shader of shaders) {
        gl.attachShader(program, shader);
    }
    gl.linkProgram(program);
    const linked = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (!linked) {
        const lastError = gl.getProgramInfoLog(program);
        onError('linkProgram ' + lastError);
        gl.deleteProgram(program);
        return null;
    }
    return program;
};

const createProgram = (gl: WebGLRenderingContext, vertexShader: string, fragmentShader: string) => {
    return loadProgram(gl, [
        loadShader(gl, vertexShader, gl.VERTEX_SHADER),
        loadShader(gl, fragmentShader, gl.FRAGMENT_SHADER)
    ]);
};

export {loadProgram, loadShader, createProgram};
