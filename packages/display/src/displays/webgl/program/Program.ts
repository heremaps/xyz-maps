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
    name: string;
    attributes: { [name: string]: number } = {};
    uniforms: UniformMap = {};

    private usage;
    private buffers: BufferCache;

    protected glStates: GLStates;
    protected uniformSetters = {};
    protected mode: number; // gl.POINTS;

    private dpr: number; // devicepixelratio

    private _pass: PASS;

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
            let aInfo = gl.getActiveAttrib(glProg, a);
            const name = aInfo.name;
            this.attributes[name] = gl.getAttribLocation(glProg, name);
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

    setBufferCache(buffers: BufferCache) {
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
        const gl = this.gl;
        let attr;
        let position;


        for (let name in attributes) {
            attr = attributes[name];
            position = this.attributes[name];

            if (position == UNDEF) {
                console.warn(this.name, ': attribute', name, 'not found');
            }

            gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.get(attr));

            // gl.bindBuffer(gl.ARRAY_BUFFER, buffers[name]);
            // gl.vertexAttribPointer(position, attr.size, attr.type, attr.normalized, 0, 0);

            gl.vertexAttribPointer(position, attr.size, attr.type, attr.normalized, attr.stride, attr.offset);

            // Turns on the vertex attributes in the GPU program.
            gl.enableVertexAttribArray(position); // active buffer!
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
                this.initIndex((<IndexGrp>grp).index);
                gl.drawElements(mode, (<IndexGrp>grp).index.length, (<IndexGrp>grp).index.type, 0);
            } else {
                gl.drawArrays(mode, (<ArrayGrp>grp).arrays.first, (<ArrayGrp>grp).arrays.count);
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

    init(geoBuffer: GeometryBuffer, pass: PASS, stencil: boolean, zIndex?: number) {
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
    //     // this.init(options);
    // }
}

export default Program;
