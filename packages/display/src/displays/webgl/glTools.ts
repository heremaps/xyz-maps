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

let error = window.console.error;

const loadShader = (gl, shaderSource, shaderType, optErrorCallback?) => {
    let errFn = optErrorCallback || error;
    let shader = gl.createShader(shaderType);
    gl.shaderSource(shader, shaderSource);
    gl.compileShader(shader);
    let compiled = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (!compiled) {
        // Something went wrong during compilation; get the error
        let lastError = gl.getShaderInfoLog(shader);
        // errFn("*** Error compiling shader '" + shader + "':" + lastError);
        console.log('*** Error compiling shader \'' + shader + '\':' + lastError);
        gl.deleteShader(shader);
        return null;
    }
    return shader;
};

const loadProgram = (gl, shaders, optAttribs?, optLocations?, optErrorCallback?) => {
    let errFn = optErrorCallback || error;
    let program = gl.createProgram();
    for (var ii = 0; ii < shaders.length; ++ii) {
        gl.attachShader(program, shaders[ii]);
    }
    if (optAttribs) {
        for (var ii = 0; ii < optAttribs.length; ++ii) {
            gl.bindAttribLocation(
                program,
                optLocations ? optLocations[ii] : ii,
                optAttribs[ii]);
        }
    }
    gl.linkProgram(program);
    let linked = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (!linked) {
        let lastError = gl.getProgramInfoLog(program);
        errFn('Error in program linking:' + lastError);
        gl.deleteProgram(program);
        return null;
    }
    return program;
};

const createProgram = (
    gl: WebGLRenderingContext,
    vertexShader: string,
    fragmentShader: string
) => {
    return loadProgram(gl, [
        loadShader(gl, vertexShader, gl.VERTEX_SHADER),
        loadShader(gl, fragmentShader, gl.FRAGMENT_SHADER)
    ]);
};

const switchPrograms = (gl, currentProgram, newProgram) => {
    // Gets the number of attributes in the current and new programs
    // var currentAttributes = gl.getProgramParameter(currentProgram, gl.ACTIVE_ATTRIBUTES);
    // var newAttributes     = gl.getProgramParameter(newProgram, gl.ACTIVE_ATTRIBUTES);

    let currentAttributes = currentProgram ? currentProgram.attribute_count : 0;
    let newAttributes = newProgram.attribute_count;
    // Fortunately, in OpenGL, attribute index values are always assigned in the
    // range [0, ..., NUMBER_OF_VERTEX_ATTRIBUTES - 1], so we can use that to
    // enable or disable attributes
    if (newAttributes > currentAttributes) {
        // We need to enable the missing attributes
        for (var i = currentAttributes; i < newAttributes; i++) {
            gl.enableVertexAttribArray(i);
        }
    } else if (newAttributes < currentAttributes) {
        // We need to disable the extra attributes
        for (var i = newAttributes; i < currentAttributes; i++) {
            gl.disableVertexAttribArray(i);
        }
    }

    // With all the attributes now enabled/disabled as they need to be, let's switch!
    gl.useProgram(newProgram);
};


export {loadProgram, loadShader, createProgram, switchPrograms};
