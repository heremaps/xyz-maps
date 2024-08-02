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

import {createProgram, preprocessShaderIncludes} from '../glTools';
import {GLStates, PASS} from './GLStates';
// @ts-ignore
import introVertex from '../glsl/intro_vertex.glsl';

import {ArrayGrp, DynamicUniform, GeometryBuffer, IndexData, IndexGrp, Uniform} from '../buffer/GeometryBuffer';
import {BufferCache} from '../GLRender';
import {Attribute} from '../buffer/Attribute';
import {ConstantAttribute} from '../buffer/templates/TemplateBuffer';

const GLSL_INCLUDES = {
};

let UNDEF;

type UniformLocations = {
    [name: string]: WebGLUniformLocation
};

export type UniformMap = {
    [name: string]: Uniform | DynamicUniform
};

type AttributeMap = {
    [name: string]: Attribute | ConstantAttribute
};

export type ColorMask = {
    r: boolean;
    g: boolean;
    b: boolean;
    a: boolean
};

class Program {
    protected vertexShaderSrc: string;
    protected fragmentShaderSrc: string;
    protected framebuffer: WebGLFramebuffer;
    private colorMask: ColorMask;

    static getMacros(buffer: GeometryBuffer): {
        [name: string]: string | number | boolean
    } {
        return null;
    }

    static getProgramId(buffer: GeometryBuffer, macros?: {
        [name: string]: string | number | boolean
    }) {
        return buffer.type;
    }

    prog: WebGLProgram;
    gl: WebGLRenderingContext;
    // eslint-disable-next-line camelcase
    glExtAngleInstancedArrays: ANGLE_instanced_arrays;
    name: string;
    attributeLocations: {
        [name: string]: {
            index: number,
            length: number
        }
    } = {};
    attributeDivisors: number[] = [];
    uniforms: UniformLocations = {};

    private usage;
    private buffers: BufferCache;

    protected glStates: GLStates;
    private uniformSetters = {};
    protected mode: number; // gl.POINTS;

    private dpr: number; // devicepixelratio

    protected _pass: PASS;

    private textureUnits: number = 0;

    private macros: {
        [name: string]: string | number | boolean
    } = {
        // '#version 300 es',s
            'M_PI': 3.1415927410125732
        };

    constructor(
        gl: WebGLRenderingContext,
        // mode: number,
        // vertexShader: string,
        // fragmentShader: string,
        devicePixelRation: number,
        macros?: {
            [name: string]: string | number | boolean
        },
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


    initBuffers(attributes: {
        [name: string]: Attribute | ConstantAttribute
    }) {
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
        case gl.INT:
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

    private buildSource(vertexShader: string, fragmentShader: string, macros?: {
        [name: string]: any
    }): [string, string] {
        const prog = this;

        macros = {...prog.macros, DEVICE_PIXEL_RATIO: prog.dpr.toFixed(1), ...macros};

        let macroSrc = '';
        for (let name in macros) {
            macroSrc += `#define ${name} ${macros[name]}\n`;
        }

        return [
            preprocessShaderIncludes(macroSrc + introVertex + vertexShader, GLSL_INCLUDES),
            preprocessShaderIncludes(macroSrc + fragmentShader, GLSL_INCLUDES)
        ];
    }

    protected compile(vertexShader: string, fragmentShader: string, macros?: {
        [name: string]: any
    }) {
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


    /**
     * @internal
     * @hidden
     *
     * Determines if the buffer is visible based on the compiled uniform data.
     *
     * @param uniforms - The compiled uniform data for the buffer.
     *
     * @returns true if the buffer is visible otherwise false.
     */
    isBufferVisible(uniforms: UniformMap): boolean {
        // TODO: move logic into GeometryBuffer
        return true;
    }

    initPass(pass: PASS, buffer: GeometryBuffer) {
        const passed = Boolean(pass & buffer.pass);
        if (passed) {
            this.bindFramebuffer(null);
        }
        return passed;
    }

    private dbgGLState(geoBuffer) {
        const {gl} = this;
        const glEnums = (this as any).__dbgGlEnums ||= ((glEnums) => {
            for (let func of [
                'NEVER', 'LESS', 'LEQUAL', 'GREATER', 'GEQUAL', 'EQUAL', 'NOTEQUAL', 'ALWAYS',
                'KEEP', 'ZERO', 'REPLACE', 'INCR', 'INCR_WRAP', 'DECR', 'DECR_WRAP', 'INVERT'
            ]) glEnums[gl[func]] = func;
            return glEnums;
        })({});

        console.table([{
            // 'p': geoBuffer.p,
            'TYPE (ID)': `${this.name} ${geoBuffer.id || null}`,
            'PASS': this._pass,
            'SCISSOR_TEST': gl.getParameter(gl.SCISSOR_TEST) ? `${gl.getParameter(gl.SCISSOR_BOX)}` : false,
            'STENCIL_TEST': gl.getParameter(gl.STENCIL_TEST) ? `${glEnums[gl.getParameter(gl.STENCIL_FUNC)]} ${gl.getParameter(gl.STENCIL_REF)}` : false,
            'STENCIL': `${glEnums[gl.getParameter(gl.STENCIL_FAIL)]}-${glEnums[gl.getParameter(gl.STENCIL_PASS_DEPTH_FAIL)]}-${glEnums[gl.getParameter(gl.STENCIL_PASS_DEPTH_PASS)]}`,
            'BLEND': gl.getParameter(gl.BLEND),
            'BLEND_SRC RGB A': `${gl.getParameter(gl.BLEND_SRC_RGB)} ${gl.getParameter(gl.BLEND_SRC_ALPHA)}`,
            'BLEND_DST RGB A': `${gl.getParameter(gl.BLEND_DST_RGB)} ${gl.getParameter(gl.BLEND_DST_ALPHA)}`,
            'COLOR_WRITEMASK': `[${gl.getParameter(gl.COLOR_WRITEMASK).map((a) => Number(a))}]`,
            'DEPTH_TEST': gl.getParameter(gl.DEPTH_TEST) ? `${glEnums[gl.getParameter(gl.DEPTH_FUNC)]}` : false,
            'DEPTH_WRITEMASK': gl.getParameter(gl.DEPTH_WRITEMASK),
            // 'DEPTH_RANGE Near': gl.getParameter(gl.DEPTH_RANGE)[0],
            // 'DEPTH_RANGE Far': gl.getParameter(gl.DEPTH_RANGE)[1]
            'FB': gl.getParameter(gl.FRAMEBUFFER_BINDING)
        }]);
    }

    draw(geoBuffer: GeometryBuffer) {
        const {gl} = this;
        const {groups, instances} = geoBuffer;

        // if (this.name == 'Line' || this.name == 'Image') {
        //     this.dbgGLState(geoBuffer);
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

    private toggleCapability(glCapability: GLenum, enable: boolean) {
        if (enable) this.gl.enable(glCapability);
        else this.gl.disable(glCapability);
    };

    protected blendFunc(
        sFactor: number = this.gl.ONE,
        dFactor: number = this.gl.ONE_MINUS_SRC_ALPHA
    ) {
        this.gl.blendFunc(sFactor, dFactor);
    }

    initGeometryBuffer(geoBuffer: GeometryBuffer, pass: PASS, zIndex?: number) {
        const prog = this;
        const {gl, glStates} = prog;

        this._pass = pass;

        // overwrite with custom gl-states
        const blend = geoBuffer.blend ?? glStates.blend;
        const depth = geoBuffer.depth ?? glStates.depth;
        const stencil = geoBuffer.clip ?? glStates.scissor;
        const {scissorBox} = geoBuffer;
        const scissor = !!scissorBox;

        if (scissorBox) {
            gl.scissor(scissorBox[0], scissorBox[1], scissorBox[2], scissorBox[3]);
        }

        prog.toggleCapability(gl.SCISSOR_TEST, scissor);
        prog.toggleCapability(gl.BLEND, blend);
        prog.toggleCapability(gl.DEPTH_TEST, depth);
        prog.toggleCapability(gl.STENCIL_TEST, stencil);

        this.blendFunc();

        const cullFace = geoBuffer.cullFace();

        if (cullFace) {
            gl.cullFace(cullFace);
            gl.enable(gl.CULL_FACE);
        } else {
            gl.disable(gl.CULL_FACE);
        }


        if (geoBuffer.depthMask != null) {
            gl.depthMask(geoBuffer.depthMask);
        }

        const colorMask = geoBuffer.colorMask || this.colorMask;
        if (colorMask != null) {
            gl.colorMask(colorMask.r, colorMask.g, colorMask.b, colorMask.a);
        }

        gl.disable(gl.POLYGON_OFFSET_FILL);
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

    setColorMask(colorMask: ColorMask) {
        this.colorMask = colorMask;
    }
}

export default Program;
