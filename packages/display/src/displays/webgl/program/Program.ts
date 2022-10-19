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

import {createProgram} from '../glTools';
import {GLStates, PASS} from './GLStates';
// @ts-ignore
import introVertex from '../glsl/intro_vertex.glsl';
import {ArrayGrp, GeometryBuffer, IndexData, IndexGrp} from '../buffer/GeometryBuffer';
import {BufferCache} from '../GLRender';
import {Attribute} from '../buffer/Attribute';

let UNDEF;

type UniformMap = { [name: string]: WebGLUniformLocation };
type AttributeMap = { [name: string]: Attribute };

class Program {
    prog: WebGLProgram;
    gl: WebGLRenderingContext;
    // eslint-disable-next-line camelcase
    glExtAngleInstancedArrays: ANGLE_instanced_arrays;
    name: string;
    attributeLocations: { [name: string]: { index: number, length: number } } = {};
    uniforms: UniformMap = {};

    private usage;
    private buffers: BufferCache;

    protected glStates: GLStates;
    protected uniformSetters = {};
    protected mode: number; // gl.POINTS;

    private dpr: number; // devicepixelratio

    private _pass: PASS;

    constructor(
        gl: WebGLRenderingContext,
        mode: number,
        vertexShader: string,
        fragmentShader: string,
        devicePixelRation: number,
        macros?: { [name: string]: any }
    ) {
        this.dpr = devicePixelRation;
        this.mode = mode;
        this.usage = gl.STATIC_DRAW;
        this.gl = gl;
        this.glStates = new GLStates({scissor: true, blend: false, depth: true});

        this.compile(vertexShader, fragmentShader, macros);
    }

    init(
        buffers: BufferCache,
        // eslint-disable-next-line camelcase
        glExtAngleInstancedArrays: ANGLE_instanced_arrays
    ) {
        this.setBufferCache(buffers);

        this.glExtAngleInstancedArrays = glExtAngleInstancedArrays;
    }

    private createUniformSetter(uInfo: WebGLActiveInfo, location: WebGLUniformLocation) {
        const gl = this.gl;

        switch (uInfo.type) {
        case gl.FLOAT:
            return (v) => gl.uniform1f(location, v);

        case gl.FLOAT_MAT4:
            return (v) => gl.uniformMatrix4fv(location, false, v);

        case gl.FLOAT_VEC2:
            return (v) => gl.uniform2fv(location, v);

        case gl.FLOAT_VEC3:
            return (v) => gl.uniform3fv(location, v);

        case gl.FLOAT_VEC4:
            return (v) => gl.uniform4fv(location, v);

        case gl.BOOL:
        case gl.SAMPLER_2D:
            return (v) => gl.uniform1i(location, v);
        }

        return () => console.warn('setting uniform not supported', uInfo, location);
    }

    private macros: { [name: string]: any } = {
        // '#version 300 es',s
        'M_PI': 3.1415927410125732
    };

    private buildSource(vertexShader: string, fragmentShader: string, macros?: { [name: string]: any }): [string, string] {
        const prog = this;

        macros = {...prog.macros, DEVICE_PIXEL_RATIO: prog.dpr.toFixed(1), ...macros};

        let macroSrc = '';
        for (let name in macros) {
            macroSrc += `#define ${name} ${macros[name]}\n`;
        }

        return [
            macroSrc + introVertex + vertexShader,
            macroSrc + fragmentShader
        ];
    }

    protected compile(vertexShader: string, fragmentShader: string, macros?: { [name: string]: any }) {
        const {gl} = this;

        const [vertexSrc, fragSrc] = this.buildSource(vertexShader, fragmentShader, macros || {});

        const glProg = createProgram(gl, vertexSrc, fragSrc);

        this.prog = glProg;

        // setup attributes
        let activeAttributes = gl.getProgramParameter(glProg, gl.ACTIVE_ATTRIBUTES);
        for (let a = 0; a < activeAttributes; ++a) {
            const aInfo = gl.getActiveAttrib(glProg, a);
            const {name, type} = aInfo;
            const index = gl.getAttribLocation(glProg, name);
            const length = type == gl.FLOAT_MAT2 ? 2 : type == gl.FLOAT_MAT3 ? 3 : type == gl.FLOAT_MAT4 ? 4 : 1;
            this.attributeLocations[name] = {index, length};
        }

        // setup uniforms
        let activeUniforms = gl.getProgramParameter(glProg, gl.ACTIVE_UNIFORMS);

        for (let u = 0; u < activeUniforms; u++) {
            const uInfo = gl.getActiveUniform(glProg, u);
            const name = uInfo.name;
            const location = gl.getUniformLocation(glProg, name);

            this.uniforms[name] = location;

            // gl.getUniformLocation(program, uniformInfo.name);
            this.uniformSetters[uInfo.name] = this.createUniformSetter(uInfo, location);
        }
    }

    private setBufferCache(buffers: BufferCache) {
        this.buffers = buffers;
    }

    getUniformLocation(name: string): WebGLUniformLocation {
        return this.uniforms[name];
    }

    setUniform(name: string, data: any) {
        let uset;
        if (uset = this.uniformSetters[name]) {
            uset(data);
        }
    }

    initUniforms(uniforms: UniformMap) {
        for (var name in uniforms) {
            let setter = this.uniformSetters[name];
            if (setter) {
                setter(uniforms[name]);
            } else {
                // console.warn('no uniform setter defined', name);
            }
        }
    }

    initAttributes(attributes: AttributeMap) {
        const {gl, buffers, attributeLocations} = this;

        for (let name in attributes) {
            let attr = attributes[name];
            let {index, length} = attributeLocations[name];


            let instanced = attr.instanced;

            if (index == UNDEF) {
                console.warn(this.name, ': attribute', name, 'not found');
            }
            gl.bindBuffer(gl.ARRAY_BUFFER, buffers.get(attr));

            const bytesPerElement = attr.bytesPerElement;
            const stride = attr.stride ^ 0 + attr.size * bytesPerElement;
            const offset = attr.offset ^ 0;
            const size = attr.size / length;

            for (let i = 0; i < length; ++i) {
                const location = index + i;
                gl.enableVertexAttribArray(location);
                gl.vertexAttribPointer(
                    location, // location
                    size, // size (num values to pull from buffer per iteration)
                    attr.type, // type of data in buffer
                    attr.normalized, // normalize
                    stride, // stride, num bytes to advance to get to next set of values
                    offset + i * size * bytesPerElement
                );

                // Turns on the vertex attributes in the GPU program.
                if (instanced) {
                    this.glExtAngleInstancedArrays?.vertexAttribDivisorANGLE(location, 1);
                } else {
                    gl.enableVertexAttribArray(location);
                }
            }
        }
    }

    private initIndex(index: IndexData) {
        const {buffers, gl} = this;
        let indexBuffer = buffers.get(index);
        let ready = true;

        if (!indexBuffer) {
            indexBuffer = gl.createBuffer();
            buffers.set(index, indexBuffer);
            ready = false;
        }

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);

        if (!ready) {
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, index.data, gl.STATIC_DRAW);
        } else {
            // delete index.data;
        }
    }

    pass(pass: PASS) {
        // draw in opaque pass only by default.
        return pass == PASS.OPAQUE;
    }

    draw(geoBuffer: GeometryBuffer) {
        const {gl} = this;
        const {texture, groups} = geoBuffer;
        const isDepthOnlyPass = this._pass == PASS.ALPHA && geoBuffer.alpha == PASS.POST_ALPHA;

        // console.log(
        //     this.name,
        //     'DEPTH_TEST', gl.getParameter(gl.DEPTH_TEST),
        //     'SCISSOR_TEST', gl.getParameter(gl.SCISSOR_TEST),
        //     'STENCIL_TEST', gl.getParameter(gl.STENCIL_TEST),
        //     'BLEND', gl.getParameter(gl.BLEND)
        // );

        if (isDepthOnlyPass) {
            // disable color mask for depth/stencil only pass
            gl.colorMask(false, false, false, false);
        }

        if (texture) {
            gl.activeTexture(gl.TEXTURE0);
            texture.bind();
        }

        for (let grp of groups) {
            let mode = grp.mode || this.mode;

            if (grp.uniforms) {
                this.initUniforms(grp.uniforms);
            }


            if ((<IndexGrp>grp).index) {
                const index = (<IndexGrp>grp).index;
                const count = index.length;
                const type = index.type;

                this.initIndex(index);

                if (geoBuffer.instances) {
                    this.glExtAngleInstancedArrays?.drawElementsInstancedANGLE(mode, count, type, 0, geoBuffer.instances);
                } else {
                    gl.drawElements(mode, count, type, 0);
                }
            } else {
                const first = (<ArrayGrp>grp).arrays.first;
                const count = (<ArrayGrp>grp).arrays.count;

                if (geoBuffer.instances) {
                    this.glExtAngleInstancedArrays?.drawArraysInstancedANGLE(mode, first, count, geoBuffer.instances);
                } else {
                    gl.drawArrays(mode, first, count);
                }
            }
        }

        if (isDepthOnlyPass) {
            // re-enable color mask
            gl.colorMask(true, true, true, false);
        }
    };

    private setStates(scissor: boolean, blend: boolean, depth: boolean, stencil: boolean) {
        const gl = this.gl;
        // apply default gl-states
        if (scissor) {
            gl.enable(gl.SCISSOR_TEST);
        } else {
            gl.disable(gl.SCISSOR_TEST);
        }

        if (stencil) {
            gl.enable(gl.STENCIL_TEST);
        } else {
            gl.disable(gl.STENCIL_TEST);
        }

        if (blend) {
            gl.enable(gl.BLEND);
        } else {
            gl.disable(gl.BLEND);
        }

        if (depth) {
            gl.enable(gl.DEPTH_TEST);
        } else {
            gl.disable(gl.DEPTH_TEST);
        }
    }

    initGeometryBuffer(geoBuffer: GeometryBuffer, pass: PASS, stencil: boolean, zIndex?: number) {
        const prog = this;
        const {gl} = prog;
        const opaquePass = pass == PASS.OPAQUE;
        let {blend, scissor, depth} = this.glStates;

        this._pass = pass;

        // overwrite with custom gl-states
        if (geoBuffer.scissor != UNDEF) {
            scissor = geoBuffer.scissor;
        }
        if (geoBuffer.blend != UNDEF) {
            blend = geoBuffer.blend;
        }
        if (geoBuffer.depth != UNDEF) {
            depth = geoBuffer.depth;
        }
        prog.setStates(scissor, blend, depth, stencil && !opaquePass && blend && scissor);

        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        const cullFace = geoBuffer.cullFace();

        if (cullFace) {
            gl.cullFace(cullFace);
            gl.enable(gl.CULL_FACE);
        } else {
            gl.disable(gl.CULL_FACE);
        }


        // get rid of zfighting for alpha pass.
        // alpha pass is drawn ordered zindex -> no need to write to depthbuffer (performance)
        gl.depthMask(geoBuffer.isFlat() ? opaquePass : true);

        // gl.depthMask(false);
        // gl.depthMask(opaquePass || !options.flat);

        gl.disable(gl.POLYGON_OFFSET_FILL);

        if (pass == PASS.POST_ALPHA) {
            // use additional pass with stencil buffer to avoid "overlapping alpha" of unclipped geometry
            gl.enable(gl.STENCIL_TEST);
            gl.stencilFunc(gl.GREATER, 1, 0xff);
            gl.stencilOp(gl.KEEP, gl.KEEP, gl.REPLACE);
            // gl.stencilFunc(gl.EQUAL, 0, 0xff);
            // gl.stencilOp(gl.KEEP, gl.KEEP, gl.INCR);
        }
    }

    // use() {
    //     const gl = this.gl;
    //     gl.useProgram(this.prog);
    //     // this.initGeometryBuffer(options);
    // }
    disableAttributes() {
        const {attributeLocations, gl} = this;
        for (let name in attributeLocations) {
            let {index, length} = attributeLocations[name];
            while (length--) {
                gl.disableVertexAttribArray(index + length);
            }
        }
    }
}

export default Program;
