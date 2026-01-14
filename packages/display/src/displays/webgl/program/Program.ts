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

import {createProgram, positionGLSLVersion, preprocessShaderIncludes} from '../glTools';
import {GLStates, PASS} from './GLStates';
import {createWebGLInstancing, WebGLInstancing} from '../GLInstancing';
import {GLExtensions} from '../GLExtensions';
import {VAOManager} from '../VAOManager';

// @ts-ignore
import introVertex from '../glsl/intro_vertex.glsl';
// @ts-ignore
import lightGLSL from '../glsl/light.glsl';
// @ts-ignore
import utilsGLSL from '../glsl/utils.glsl';
import {
    ArrayDrawCmd,
    DynamicUniform,
    GeometryBuffer,
    IndexData,
    ElementsDrawCmd,
    Uniform
} from '../buffer/GeometryBuffer';
import {BufferCache, ViewUniforms} from '../GLRender';
import {Attribute} from '../buffer/Attribute';
import {ConstantAttribute} from '../buffer/templates/TemplateBuffer';
import {Texture} from '../Texture';
import {HeightMapTileCache} from '../HeightMapTileCache';
import {UniformBlockInstance, UniformBlockLayout, UniformFieldLayout, std140Types} from '../UniformBlock';

const GLSL_INCLUDES = {
    'light.glsl': lightGLSL,
    'utils.glsl': utilsGLSL
};

let UNDEF;

type UniformLocations = {
    [name: string]: WebGLUniformLocation
};


export type CompiledUniformMap = {
    [name: string]: Uniform;
}

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

export type ProgramMacros = { [name: string]: string | number | boolean };

class Program {
    protected vertexShaderSrc: string;
    protected fragmentShaderSrc: string;
    protected framebuffer: WebGLFramebuffer;
    private colorMask: ColorMask;
    private glInstancing: WebGLInstancing;
    private vaoManager: VAOManager;
    activeAttributes: number;
    private uniformBufferObjects: any[];

    // static _noMacros = {};
    static getMacros(buffer: GeometryBuffer): {
        [name: string]: string | number | boolean
    } {
        if (buffer.heightMapRef) {
            return {USE_HEIGHTMAP: 128};
        }
        return null;
    }

    static getProgramId(buffer: GeometryBuffer, macros?: {
        [name: string]: string | number | boolean
    }) {
        return buffer.type;
    }

    prog: WebGLProgram;
    gl: WebGLRenderingContext | WebGL2RenderingContext;
    name: string;
    attributeLocations: {
        [name: string]: {
            index: number,
            length: number
        }
    } = {};
    attributeDivisors: number[] = [];
    uniforms: UniformLocations = {};

    private usage: GLenum;
    private buffers: BufferCache;

    protected glStates: GLStates;
    private uniformSetters = {};
    protected mode: number; // gl.POINTS;

    private dpr: number; // devicepixelratio

    protected _pass: PASS;

    private texUnitCount: number;

    private terrainPreviewMaxTiles = 8;

    private macros: {
        [name: string]: string | number | boolean
    } = {
            'M_PI': 3.1415927410125732
        };

    // Parsed from shader source (WebGL2 only); empty in WebGL1
    uniformBlocks?: UniformBlockLayout[];

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
        glExt: GLExtensions,
        vaoManager: VAOManager,
        ubos?
    ) {
        this.compile(this.vertexShaderSrc, this.fragmentShaderSrc, this.macros);

        this.setBufferCache(buffers);

        this.glInstancing = createWebGLInstancing(this.gl, glExt);
        this.vaoManager = vaoManager;

        this.initializeUBOs(ubos);
    }


    // Parses the shader source to extract uniform block information (name and size)
    private getUniformBlocksFromShader(shaderSource: string): UniformBlockLayout[] {
        if (this.gl instanceof WebGLRenderingContext) return [];
        const blockRegex = /layout\s*\(\s*std140\s*\)\s+uniform\s+(\w+)\s*\{([\s\S]*?)\};/gm;
        const uniformRegex = /^\s*(?:(?:lowp|mediump|highp)\s+)?(\w+)\s+(\w+)(?:\s*\[\s*(\d+)\s*\])?\s*;\s*$/gm;
        const blocks: UniformBlockLayout[] = [];
        let match: RegExpExecArray | null;

        while ((match = blockRegex.exec(shaderSource)) !== null) {
            const [, blockName, blockBody] = match;
            const fields: UniformFieldLayout[] = [];
            let offset = 0;
            // Reset regex lastIndex for each block
            uniformRegex.lastIndex = 0;

            let uniformMatch: RegExpExecArray | null;
            while ((uniformMatch = uniformRegex.exec(blockBody)) !== null) {
                const type = uniformMatch[1];
                const arraySize = uniformMatch[3] ? parseInt(uniformMatch[3]) : undefined;
                const typeInfo = std140Types[type];
                if (!typeInfo) throw new Error(`Unknown uniform type: ${type}`);
                let {size, align} = typeInfo;
                if (arraySize) {
                    // std140: array elements are aligned to max(16, baseAlignment)
                    const memberAlign = Math.max(16, align);
                    offset = Math.ceil(offset / memberAlign) * memberAlign;
                    // Each element occupies size rounded up to 16
                    const stride = Math.ceil(size / 16) * 16;
                    size = stride * arraySize;
                } else {
                    // std140: align offset for non-array
                    offset = Math.ceil(offset / align) * align;
                }
                fields.push({name: uniformMatch[2], type, offset, size, arraySize});
                offset += size;
            }
            const byteSize = Math.ceil(offset / 16) * 16; // final block size rounded to 16
            blocks.push({name: blockName, bindingPoint: 0, fields, byteSize});
        }
        return blocks;
    }


    // Automatically initializes UBOs based on the shader code (for WebGL2)
    initializeUBOs(ubos) {
        const gl = this.gl as WebGL2RenderingContext;
        const program = this.prog;

        // Ensure the program is active before setting UBO bindings
        gl.useProgram(program);

        // Parse the shader sources to find uniform blocks
        this.uniformBlocks?.forEach((block) => {
            // Get the block index for the current uniform block
            const blockIndex = gl.getUniformBlockIndex(program, block.name);

            // Check if the block index is valid
            if (blockIndex !== gl.INVALID_INDEX) {
                gl.uniformBlockBinding(program, blockIndex, 0);
                console.log('Init UBO for', this.name, ':', block.name, 'blockIndex', blockIndex, 'bindingpoint', 0);
                // Bind the UBO to the corresponding binding point
                // gl.bindBufferBase(gl.UNIFORM_BUFFER, block.bindingPoint, ubos.view.buffer);
            }
        });

        // uniformBlocks.forEach((block) => {
        //     // Create UBO and bind the data for each uniform block
        //     // const ubo = gl.createBuffer();
        //     // gl.bindBuffer(gl.UNIFORM_BUFFER, ubo);
        //
        //     // Assuming data for UBO is a Float32Array (this could vary depending on the block)
        //     // const initialData = new Float32Array(block.size); // Replace with actual size
        //     // gl.bufferData(gl.UNIFORM_BUFFER, initialData, gl.STATIC_DRAW);
        //
        //     // Get the block index for the current uniform block
        //     const blockIndex = gl.getUniformBlockIndex(program, block.name);
        //     gl.uniformBlockBinding(program, blockIndex, block.bindingPoint);
        //
        //     // console.log('Init UBO for', this.name, ':', block.name, 'blockIndex', blockIndex, 'bindingpoint', block.bindingPoint);
        //
        //     // Bind the UBO to the corresponding binding point
        //     // gl.bindBufferBase(gl.UNIFORM_BUFFER, block.bindingPoint, ubo);
        //
        //     // Store reference to the UBO for future updates (if needed)
        //     // block.ubo = ubo;
        // });

        return this.uniformBlocks;
    }

    private initAttribute(attr: Attribute): WebGLBuffer {
        const gl = this.gl;

        let buf = this.buffers.get(attr);

        if (!buf) {
            buf = gl.createBuffer();
            this.buffers.set(attr, buf);
            // attr.buffer = buf;
            // attr.gl = gl;
        }

        gl.bindBuffer(gl.ARRAY_BUFFER, buf);

        if (attr.dirty) {
            attr.dirty = false;
            gl.bufferData(gl.ARRAY_BUFFER, attr.data, attr.dynamic ? gl.DYNAMIC_DRAW : gl.STATIC_DRAW);
            // we keep attribute data because its might be needed for ray casting
            // if (!attr.dynamic) delete attr.data;
        }

        return buf;
    }


    private createUniformSetter(uInfo: WebGLActiveInfo, location: WebGLUniformLocation) {
        const {gl} = this;

        switch (uInfo.type) {
        case gl.FLOAT:
            return (v) => gl.uniform1f(location, v);
        case gl.FLOAT_MAT3:
            return (v) => gl.uniformMatrix3fv(location, false, v);
        case gl.FLOAT_MAT4:
            return (v) => {
                gl.uniformMatrix4fv(location, false, v);
            };
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
            if (uInfo.size === 1) {
                const tu = this.texUnitCount++;
                return (v) => {
                    gl.uniform1i(location, tu);
                    gl.activeTexture(gl.TEXTURE0 + tu);
                    v?.bind();
                    // gl.bindTexture(gl.TEXTURE_2D, v?.texture);
                };
            }
            const baseUnit = this.texUnitCount;
            this.texUnitCount += uInfo.size;

            const maxUnits = new Int32Array(uInfo.size);
            for (let i = 0; i < uInfo.size; i++) {
                maxUnits[i] = baseUnit + i;
            }

            return (textures: Texture[]) => {
                const count = textures.length;
                for (let i = 0; i < count; i++) {
                    gl.activeTexture(gl.TEXTURE0 + maxUnits[i]);
                    textures[i]?.bind();
                }
                gl.uniform1iv(location, maxUnits);
                // gl.uniform1iv(location, maxUnits.subarray(0, count));
            };
        }

        return () => console.warn('setting uniform not supported', uInfo, location);
    }

    private buildSource(vertexShader: string, fragmentShader: string, macros?: {
        [name: string]: any
    }): string[] {
        const prog = this;

        macros = {...prog.macros, DEVICE_PIXEL_RATIO: prog.dpr.toFixed(1), ...macros};

        let macroSrc = '';
        for (let name in macros) {
            macroSrc += `#define ${name} ${macros[name]}\n`;
        }

        return [
            preprocessShaderIncludes(macroSrc + introVertex + vertexShader, GLSL_INCLUDES),
            preprocessShaderIncludes(macroSrc + fragmentShader, GLSL_INCLUDES)
        ].map(positionGLSLVersion);
    }

    protected compile(vertexShader: string, fragmentShader: string, macros?: {
        [name: string]: any
    }) {
        const {gl} = this;

        const [vertexSrc, fragSrc] = this.buildSource(vertexShader, fragmentShader, macros || {});

        const glProg = createProgram(gl, vertexSrc, fragSrc);

        this.prog = glProg;
        this.texUnitCount = 0;

        // setup attributes
        let activeAttributes = gl.getProgramParameter(glProg, gl.ACTIVE_ATTRIBUTES);

        this.activeAttributes = activeAttributes;

        for (let a = 0; a < activeAttributes; ++a) {
            const aInfo = gl.getActiveAttrib(glProg, a);
            const {name, type} = aInfo;
            const index = gl.getAttribLocation(glProg, name);
            const length = type == gl.FLOAT_MAT2 ? 2 : type == gl.FLOAT_MAT3 ? 3 : type == gl.FLOAT_MAT4 ? 4 : 1;
            this.attributeLocations[name] = {index, length};
        }


        this.uniformBlocks = this.getUniformBlocksFromShader(vertexSrc);


        // for (let block of this.uniformBlocks) {
        //     for (let uniformField of block.fields) {
        //
        //     }
        //     console.log('Detected UBO in program', this.name, ':', block.name, 'size:', block.size, 'fields:', block.fields);
        //     debugger;
        // }


        // this.uniformBufferObjects = this.initializeUBOs(vertexSrc);

        // setup uniforms
        let activeUniforms = gl.getProgramParameter(glProg, gl.ACTIVE_UNIFORMS);

        console.log('----', this.name, this.uniformBlocks);

        for (let u = 0; u < activeUniforms; u++) {
            const uInfo = gl.getActiveUniform(glProg, u);
            const name = uInfo.name;
            const location = gl.getUniformLocation(glProg, name);
            if (location) {
                this.uniforms[name] = location;
                // gl.getUniformLocation(program, uniformInfo.name);
                this.uniformSetters[uInfo.name] = this.createUniformSetter(uInfo, location);
            }
        }
    }


    // // Initializes traditional uniforms for WebGL1
    // initializeWebGL1Uniforms() {
    //     const gl = this.gl;
    //     const program = this.program;
    //
    //     // For WebGL1, you can define and get uniform locations like this
    //     this.uMatrixLocation = gl.getUniformLocation(program, 'u_matrix');
    // }
    // Set UBO data (only for WebGL2)
    setUBOData() {
        const gl = this.gl as WebGL2RenderingContext;
        if (gl instanceof WebGL2RenderingContext) {
            // Update the UBO data only when necessary (e.g., during initialization or significant updates)
            const updatedData = new Float32Array(16); // New matrix data (e.g., from animation)
            // Iterate over the stored UBOs and update each one (if needed)
            this.uniformBufferObjects.forEach((block) => {
                gl.bindBuffer(gl.UNIFORM_BUFFER, block.ubo);
                gl.bufferSubData(gl.UNIFORM_BUFFER, 0, updatedData); // Update data
            });
        }
    }

    usesUBO(): boolean {
        return this.uniformBufferObjects?.length > 0;
    }


    private setBufferCache(buffers: BufferCache) {
        this.buffers = buffers;
    }

    getUniformLocation(name: string): WebGLUniformLocation {
        return this.uniforms[name];
    }

    initUniform(name: string, data: Uniform): boolean {
        const uniformSetter = this.uniformSetters[name];
        if (uniformSetter) {
            uniformSetter(data);
            return true;
        }
    }

    initUniforms(uniforms: CompiledUniformMap) {
        for (let name in uniforms) {
            this.initUniform(name, uniforms[name]);
        }
    }

    initViewUniforms(displayUniforms: ViewUniforms) {
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

    initBufferAttributes(geometryBuffer: GeometryBuffer, groupIndex: number) {
        const bufAttributes = geometryBuffer.getAttributes();
        const {vaoManager} = this;

        const group = geometryBuffer.groups[groupIndex];
        const vao = group.vao;
        let bindShAttr = groupIndex === 0 && !vao;

        if (vaoManager.isVAOSupported) {
            if (!vao) {
                group.vao = vaoManager.createVAO();
                bindShAttr = true;
            }
            vaoManager.bindVAO(group.vao);
        }

        this.bindVertexAttributes(bufAttributes, !bindShAttr);

        if (!vao) {
            const index = (<ElementsDrawCmd>group).index;
            if (index) {
                this.initIndex(index);
            }
        }
    }

    bindVertexAttributes(attributes: AttributeMap, onlyWhenDirty: boolean) {
        const {gl, buffers, attributeLocations, attributeDivisors} = this;

        // this.initBuffers(attributes);

        for (let name in attributes) {
            const attribute = attributes[name];

            if (!attributeLocations[name]) continue;

            let {index, length} = attributeLocations[name];

            const {value} = attribute as ConstantAttribute;

            if (value != undefined) {
                if (!onlyWhenDirty) {
                    for (let i = 0; i < length; ++i) {
                        const location = index + i;
                        // Attribute is using constant value
                        this.setConstantAttributeValue(location, value);
                    }
                }
                continue;
            }

            const attr = attribute as Attribute;

            if (onlyWhenDirty && !attr.dirty) {
                continue;
            }

            this.initAttribute(attr);
            // gl.bindBuffer(gl.ARRAY_BUFFER, buffers.get(attr));

            if (index == UNDEF) {
                console.warn(this.name, ': attribute', name, 'not found');
            }

            const {bytesPerElement, instanced} = attr;
            const attributeDivisor = Number(instanced) | 0;
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
                    this.glInstancing.vertexAttribDivisor(location, 1);
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

    protected dbgGLState(geoBuffer) {
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

    draw(geoBuffer: GeometryBuffer, isPreview?: boolean) {
        const {gl} = this;
        const {groups, instances} = geoBuffer;

        // if (this.name == 'Line' || this.name == 'Image'){
        //     this.dbgGLState(geoBuffer);
        // }

        for (let g = 0, len = groups.length; g < len; g++) {
            let grp = groups[g];
            let mode = grp.mode != UNDEF ? grp.mode : this.mode;

            this.initBufferAttributes(geoBuffer, g);

            if (grp.uniforms) {
                this.initUniforms(grp.uniforms);
            }

            if ((<ElementsDrawCmd>grp).index) {
                const index = (<ElementsDrawCmd>grp).index;
                const count = index.length;
                const type = index.type;

                if (instances) {
                    this.glInstancing.drawElementsInstanced(mode, count, type, 0, instances);
                } else {
                    gl.drawElements(mode, count, type, 0);
                }
            } else {
                const first = (<ArrayDrawCmd>grp).arrays.first;
                const count = (<ArrayDrawCmd>grp).arrays.count;

                if (instances) {
                    this.glInstancing.drawArraysInstanced(mode, first, count, instances);
                } else {
                    gl.drawArrays(mode, first, count);
                }
            }
        }
        // this.vaoManager.bindVAO(null);
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

    configureRenderState(geoBuffer: GeometryBuffer, pass: PASS, zIndex?: number) {
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
        }
        prog.toggleCapability(gl.CULL_FACE, !!cullFace);


        if (geoBuffer.depthMask != null) {
            gl.depthMask(geoBuffer.depthMask);
        }

        const colorMask = geoBuffer.colorMask || this.colorMask;
        if (colorMask != null) {
            gl.colorMask(colorMask.r, colorMask.g, colorMask.b, colorMask.a);
        }

        gl.disable(gl.POLYGON_OFFSET_FILL);
    }

    disableAttributes(newProgramMaxAttr: number) {
        // With VAOs, attribute enable/disable state is stored in the VAO,
        // so manually disabling here is unnecessary (and can be counterproductive).
        if (this.vaoManager.isVAOSupported) return;

        const {attributeLocations, attributeDivisors, gl} = this;
        // can be optimised to just disable unused attributes.
        // like: for (let i = newProgramMaxAttr; i < oldProgramMaxAttr; i++)...
        for (let name in attributeLocations) {
            let {index, length} = attributeLocations[name];

            while (length--) {
                let i = index + length;
                if (attributeDivisors[i]) {
                    this.glInstancing.vertexAttribDivisor(i, 0);
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

    initLight(bufferLightUniforms: CompiledUniformMap, cameraWorld: Float64Array) {
        this.initUniforms(bufferLightUniforms);
        this.initUniform('u_camWorld', cameraWorld);
    }

    /**
     * Initializes the terrain heightmap for the given GeometryBuffer.
     * Binds heightmap textures and sets related uniforms for the shader programs.
     */
    initHeightMap(geomBuffer: GeometryBuffer, heightMapTextures: HeightMapTileCache) {
        const start = performance.now();
        if (!geomBuffer.heightMapRef && !geomBuffer.heightMap) {
            return;
        }

        let tileSize = heightMapTextures.tileSize;
        let heightMapSize: number;

        if (geomBuffer.heightMap) {
            heightMapSize = geomBuffer.heightMap.size;
            // Handle case when geomBuffer is a TerrainGeometryBuffer with a direct heightMap
            // HeightMap is already set in uniforms -> no further action required here.
        } else {
            if (typeof geomBuffer.heightMapRef === 'string') {
                // terrain data from same tile is available
                const terrainQuadkey: string = geomBuffer.heightMapRef;
                let heightMapTexture: Texture = heightMapTextures.get(terrainQuadkey)?.texture;
                if (!heightMapTexture) {
                    heightMapTexture = heightMapTextures.getEmptyTexture();
                    tileSize = heightMapTexture.width - heightMapTextures.tilePadding;
                }
                heightMapSize = heightMapTexture.width;
                this.initUniform('uHeightMap', heightMapTexture);
            }
        }

        this.gl.uniform2f(this.getUniformLocation('uHeightMapTileSize'), heightMapSize, tileSize);
    }


    prepareUniformBlocks(buffer: GeometryBuffer) {
        // for (const layout of this.uniformBlocks || []) {
        //     if (!buffer.hasUniformBlockInstance(layout.name)) {
        //         const instance = new UniformBlockInstance(this.gl as WebGL2RenderingContext, layout);
        //         buffer.setUniformBlockInstance(layout.name, instance);
        //     }
        // }
    }

    initBufferUniforms(geometryBuffer: GeometryBuffer, uniforms: CompiledUniformMap) {
        for (let name in uniforms) {
            const data = uniforms[name];
            const isSimpleUniform = this.initUniform(name, data);
            // if (!isSimpleUniform) {
            //     const blockInstance = geometryBuffer.getUniformBlockInstanceOfField(name);
            //     if (blockInstance?.dirty) {
            //         blockInstance.setters[name](data);
            //     }
            // }
        }
        // geometryBuffer.uploadUniformBlocks();
        // const gl = this.gl as WebGL2RenderingContext;
        // for (const block of this.uniformBlocks) {
        //     const blockInstance = geometryBuffer.getUniformBlockInstance(block.name);
        //     gl.bindBufferBase(gl.UNIFORM_BUFFER, block.bindingPoint, blockInstance.glBuffer);
        // }
    }
}

export default Program;
