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
import {ConstantAttribute} from '../buffer/templates/TemplateBuffer';

let UNDEF;

type UniformMap = { [name: string]: WebGLUniformLocation };
type AttributeMap = { [name: string]: Attribute | ConstantAttribute };

type ColorMask = { r: boolean; g: boolean; b: boolean; a: boolean };

const DEFAULT_COLOR_MASK: ColorMask = {
    r: true, g: true, b: true, a: false
};

const NO_COLOR_MASK: ColorMask = {
    r: false, g: false, b: false, a: false
};

class Program {
    protected vertexShaderSrc: string;
    protected fragmentShaderSrc: string;
    protected framebuffer: WebGLFramebuffer;

    static getMacros(buffer: GeometryBuffer): { [name: string]: string | number | boolean } {
        return null;
    }

    static getProgramId(buffer: GeometryBuffer, macros?: { [name: string]: string | number | boolean }) {
        return buffer.type;
    }

    prog: WebGLProgram;
    gl: WebGLRenderingContext;
    // eslint-disable-next-line camelcase
    glExtAngleInstancedArrays: ANGLE_instanced_arrays;
    name: string;
    attributeLocations: { [name: string]: { index: number, length: number } } = {};
    attributeDivisors: number[] = [];
    uniforms: UniformMap = {};

    private usage;
    private buffers: BufferCache;

    protected glStates: GLStates;
    protected uniformSetters = {};
    protected mode: number; // gl.POINTS;

    private dpr: number; // devicepixelratio

    protected _pass: PASS;

    private textureUnits: number = 0;

    private macros: { [name: string]: string | number | boolean } = {
    // '#version 300 es',s
        'M_PI': 3.1415927410125732
    };

    constructor(
        gl: WebGLRenderingContext,
        // mode: number,
        // vertexShader: string,
        // fragmentShader: string,
        devicePixelRation: number,
        macros?: { [name: string]: string | number | boolean },
        mode?: number
    ) {
        this.dpr = devicePixelRation;
        this.usage = gl.STATIC_DRAW;
        if (macros) {
            this.macros = {...this.macros, ...macros};
        }
        this.mode = mode || gl.TRIANGLES;
        this.gl = gl;
        this.framebuffer = null;
        this.glStates = new GLStates({scissor: true, blend: false, depth: true});
    }

    init(
        buffers: BufferCache,
        // eslint-disable-next-line camelcase
        glExtAngleInstancedArrays: ANGLE_instanced_arrays
    ) {
        this.compile(this.vertexShaderSrc, this.fragmentShaderSrc, this.macros);

        this.setBufferCache(buffers);

        this.glExtAngleInstancedArrays = glExtAngleInstancedArrays;
    }


    initBuffers(attributes: { [name: string]: Attribute | ConstantAttribute }) {
        const gl = this.gl;

        for (let name in attributes) {
            let attr = <Attribute>attributes[name];

            // attribute is using constant value -> no need to init/fill attribute buffers
            if ((<ConstantAttribute><unknown>attr).value) continue;

            let buf = this.buffers.get(attr);

            if (!buf) {
                buf = gl.createBuffer();
                this.buffers.set(attr, buf);
            }
            if (attr.dirty) {
                attr.dirty = false;
                gl.bindBuffer(gl.ARRAY_BUFFER, buf);
                gl.bufferData(gl.ARRAY_BUFFER, attr.data, gl.STATIC_DRAW);
                // delete attr.data;
            }
        }
    }


    private createUniformSetter(uInfo: WebGLActiveInfo, location: WebGLUniformLocation) {
        const {gl} = this;
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
            return (v) => gl.uniform1i(location, v);
        case gl.SAMPLER_2D:
            const tu = this.textureUnits++;
            return (v) => {
                gl.uniform1i(location, tu);
                gl.activeTexture(gl.TEXTURE0 + tu);
                gl.bindTexture(gl.TEXTURE_2D, v?.texture);
            };
        }

        return () => console.warn('setting uniform not supported', uInfo, location);
    }

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
        for (let name in uniforms) {
            const setter = this.uniformSetters[name];
            if (setter) {
                const uniform = uniforms[name];
                setter(uniform);
            } else {
                // console.warn('no uniform setter defined', name);
            }
        }
    }

    private setConstantAttributeValue(location: number, value: number[]) {
        const {gl} = this;
        gl.disableVertexAttribArray(location);
        switch (value.length) {
        case 4:
            gl.vertexAttrib4fv(location, value);
            break;
        case 3:
            gl.vertexAttrib3fv(location, value);
            break;
        case 2:
            gl.vertexAttrib2fv(location, value);
            break;
        case 1:
            gl.vertexAttrib1fv(location, value);
        }
    }

    initAttributes(attributes: AttributeMap) {
        const {gl, buffers, attributeLocations, attributeDivisors} = this;

        for (let name in attributes) {
            let attribute = attributes[name];

            if (!attributeLocations[name]) continue;

            let {index, length} = attributeLocations[name];

            const {value} = attribute as ConstantAttribute;

            if (value != undefined) {
                for (let i = 0; i < length; ++i) {
                    const location = index + i;
                    // Attribute is using constant value
                    this.setConstantAttributeValue(location, value);
                }
                continue;
            }

            let attr = attribute as Attribute;
            let instanced = attr.instanced;

            if (index == UNDEF) {
                console.warn(this.name, ': attribute', name, 'not found');
            }

            gl.bindBuffer(gl.ARRAY_BUFFER, buffers.get(attr));


            const bytesPerElement = attr.bytesPerElement;
            const attributeDivisor = Number(instanced) | 0;
            // console.log('bytesPerElement',bytesPerElement);

            const stride = attr.stride ^ 0 + attr.size * bytesPerElement;
            const offset = attr.offset ^ 0;
            const size = attr.size / length;


            for (let i = 0; i < length; ++i) {
                const location = index + i;
                // Turns on the vertex attributes in the GPU program.
                gl.enableVertexAttribArray(location);
                gl.vertexAttribPointer(
                    location, // location
                    size, // size (num values to pull from buffer per iteration)
                    attr.type, // type of data in buffer
                    attr.normalized, // normalize
                    stride, // stride, num bytes to advance to get to next set of values
                    offset + i * size * bytesPerElement
                );
                // this.glExtAngleInstancedArrays?.vertexAttribDivisorANGLE(location, Number(instanced));
                attributeDivisors[location] = attributeDivisor;
                if (instanced) {
                    this.glExtAngleInstancedArrays?.vertexAttribDivisorANGLE(location, 1);
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

    initPass(pass: PASS, buffer: GeometryBuffer) {
        const passed = Boolean(pass & buffer.pass);
        if (passed) {
            this.bindFramebuffer(null);
        }
        return passed;
    }

    draw(geoBuffer: GeometryBuffer) {
        const {gl} = this;
        const {groups, instances} = geoBuffer;

        // // if (this.name == 'Extrude' || this.name == 'Image') {
        // if (this.name == 'Line'||(this.name == 'Extrude'||this.name == 'Image') {
        //     const stencilFunc = {};
        //     for (let func of ['NEVER', 'LESS', 'LEQUAL', 'GREATER', 'GEQUAL', 'EQUAL', 'NOTEQUAL', 'ALWAYS']) {
        //         stencilFunc[gl[func]] = func;
        //     }
        //     console.log(
        //         this._pass,
        //         this.name,
        //         'DEPTH_TEST', gl.getParameter(gl.DEPTH_TEST),
        //         'SCISSOR_TEST', gl.getParameter(gl.SCISSOR_TEST),
        //         'STENCIL_TEST', gl.getParameter(gl.STENCIL_TEST) ? `${stencilFunc[gl.getParameter(gl.STENCIL_FUNC)]} ${gl.getParameter(gl.STENCIL_REF)}` : false,
        //         'BLEND', gl.getParameter(gl.BLEND)
        //     );
        // }

        for (let grp of groups) {
            let mode = grp.mode != UNDEF ? grp.mode : this.mode;

            if (grp.uniforms) {
                this.initUniforms(grp.uniforms);
            }

            if ((<IndexGrp>grp).index) {
                const index = (<IndexGrp>grp).index;
                const count = index.length;
                const type = index.type;

                this.initIndex(index);

                if (instances) {
                    this.glExtAngleInstancedArrays?.drawElementsInstancedANGLE(mode, count, type, 0, instances);
                } else {
                    gl.drawElements(mode, count, type, 0);
                }
            } else {
                const first = (<ArrayGrp>grp).arrays.first;
                const count = (<ArrayGrp>grp).arrays.count;

                if (instances) {
                    this.glExtAngleInstancedArrays?.drawArraysInstancedANGLE(mode, first, count, instances);
                } else {
                    gl.drawArrays(mode, first, count);
                }
            }
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

    protected blendFunc(
        sFactor: number = this.gl.SRC_ALPHA,
        dFactor: number = this.gl.ONE_MINUS_SRC_ALPHA
    ) {
        this.gl.blendFunc(sFactor, dFactor);
    }

    initGeometryBuffer(geoBuffer: GeometryBuffer, pass: PASS, useStencil: boolean|number = true, zIndex?: number) {
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

        prog.setStates(scissor, blend, depth, useStencil && scissor);

        this.blendFunc();

        const cullFace = geoBuffer.cullFace();

        if (cullFace) {
            gl.cullFace(cullFace);
            gl.enable(gl.CULL_FACE);
        } else {
            gl.disable(gl.CULL_FACE);
        }

        const isDepthPrePass = pass == PASS.ALPHA && geoBuffer.pass & PASS.POST_ALPHA;
        const colorMask = isDepthPrePass
            ? NO_COLOR_MASK
            : geoBuffer.colorMask || DEFAULT_COLOR_MASK;

        gl.colorMask(colorMask.r, colorMask.g, colorMask.b, colorMask.a);

        // get rid of zfighting for alpha pass.
        // alpha pass is drawn ordered zindex -> no need to write to depthbuffer (performance)
        gl.depthMask(geoBuffer.isFlat() ? opaquePass : true);

        // gl.depthMask(false);
        // gl.depthMask(opaquePass || !options.flat);

        gl.disable(gl.POLYGON_OFFSET_FILL);

        if (useStencil && pass == PASS.POST_ALPHA) {
            gl.enable(gl.STENCIL_TEST);

            if (typeof useStencil == 'number') {
                gl.stencilFunc(gl.EQUAL, useStencil as number, 0xff);
                gl.stencilOp(gl.KEEP, gl.KEEP, gl.ZERO);
            } else {
                // flat geometry and tile stencil is being used.
                // use additional pass with stencil buffer to avoid "overlapping alpha" of unclipped geometry
                gl.stencilFunc(gl.GREATER, 1, 0xff);
                gl.stencilOp(gl.KEEP, gl.KEEP, gl.REPLACE);
                // gl.stencilFunc(gl.EQUAL, 0, 0xff);
                // gl.stencilOp(gl.KEEP, gl.KEEP, gl.INCR);
            }
        }
    }

    disableAttributes() {
        const {attributeLocations, attributeDivisors, gl} = this;
        for (let name in attributeLocations) {
            let {index, length} = attributeLocations[name];

            while (length--) {
                let i = index + length;
                if (attributeDivisors[i]) {
                    this.glExtAngleInstancedArrays?.vertexAttribDivisorANGLE(i, 0);
                    attributeDivisors[i] = 0;
                }
                gl.disableVertexAttribArray(i);
            }
        }
    }

    delete() {
        this.gl.deleteProgram(this.prog);
    }

    bindFramebuffer(
        fb: WebGLFramebuffer | null = this.framebuffer,
        width: number = this.gl.canvas.width,
        height: number = this.gl.canvas.height
    ) {
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, fb);
        this.gl.viewport(0, 0, width, height);
    }

    setResolution(resolution: readonly number[]) {

    }
}

export default Program;
