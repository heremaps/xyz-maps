/*
 * Copyright (C) 2019-2024 HERE Europe B.V.
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

export const loadShader = (gl: WebGLRenderingContext, shaderSource: string, shaderType: number, onError: (error) => void = dumpError) => {
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

const loadProgram = (gl: WebGLRenderingContext, shaders: WebGLShader[], onError: (error) => void = dumpError) => {
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

export const createProgram = (gl: WebGLRenderingContext, vertexShaderSrc: string, fragmentShaderSrc: string) => {
    const vertexShader = loadShader(gl, vertexShaderSrc, gl.VERTEX_SHADER);
    const fragmentShader = loadShader(gl, fragmentShaderSrc, gl.FRAGMENT_SHADER);

    const program = loadProgram(gl, [
        vertexShader,
        fragmentShader
    ]);

    gl.detachShader(program, vertexShader);
    gl.detachShader(program, fragmentShader);
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    return program;
};

export const preprocessShaderIncludes = (source: string, includes: {
    [name: string]: string
}, onError: (error) => void = dumpError) => {
    // pattern matches:
    // 1. #include "filename.glsl"
    // 2. #include "filename.glsl/BLOCK_NAME"
    const includePattern = /#include\s+"([^"]+?)(?:\/([^"]+))?"/g;

    function extractBlock(source, blockName) {
        const beginMarker = '#begin';
        const endMarker = '#end';
        const blockPattern = new RegExp(`${beginMarker}\\s+${blockName}[\\s\\S]*?${endMarker}\\s+${blockName}`, 'g');
        const match = source.match(blockPattern);

        return match?.[0].replace(`${beginMarker} ${blockName}`, '').replace(`${endMarker} ${blockName}`, '').trim();
    }

    return source.replace(includePattern, (match, includeFile, blockName) => {
        const includeSource = includes[includeFile];
        if (includeSource) {
            if (blockName) {
                let blockSrc = extractBlock(includeSource, blockName);
                if (blockSrc == null) {
                    onError(`Block "${blockName}" not found in "${includeFile}".`);
                    return;
                }
            }
            return includeSource;
        }
        onError(`Include file "${includeFile}" not found.`);
    });
};

