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
import {Color} from '@here/xyz-maps-common';
import {createProgram, hoistGLSLVersionDirective, logGLRenderState, preprocessShaderIncludes} from '../glTools';
import {GLStates} from './GLStates';

// @ts-ignore
import introVertex from '../glsl/intro_vertex.glsl';
// @ts-ignore
import lightGLSL from '../glsl/light.glsl';
// @ts-ignore
import utilsGLSL from '../glsl/utils.glsl';
import {
    ArrayDrawCmd,
    DynamicUniform,
    ElementsDrawCmd,
    GeometryBuffer,
    HeightMapReference,
    IndexData,
    Uniform
} from '../buffer/GeometryBuffer';
import {BufferCache, ProgramContext, ViewUniforms} from '../GLRender';
import {Attribute} from '../buffer/Attribute';
import {ConstantAttribute} from '../buffer/templates/TemplateBuffer';
import {Texture} from '../Texture';
import {HeightMapTileCache} from '../HeightMapTileCache';
import {std140Types, UniformBlockLayout, UniformFieldLayout} from '../UniformBlock';
import {RenderTile, RenderTileTarget} from '../RenderTile';
import {IRenderTarget, ScreenRenderTarget} from '../RenderTarget';
import {BlendFactor, GraphicsDevice} from '../device/GraphicsDevice';
import {PASS, RenderPass} from '../RenderPass';
import {RenderState} from '../RenderState';
import {TerrainOcclusionMode} from '../buffer/TerrainRenderPolicy';

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

// Every program macro occupies a unique bit because variant masks are OR-combined.
export const PROGRAM_MACRO = {
    TERRAIN_OCCLUSION: 1 << 0,
    DIFFUSE: 1 << 1,
    SPECULAR: 1 << 2,
    NORMAL_MAP: 1 << 3,
    DASH_ARRAY: 1 << 4,
    DASH_PATTERN: 1 << 5,
    DASH_TEXTURE: 1 << 6,
    USE_HEIGHTMAP: 1 << 7,
    TERRAIN_MODEL_HM: 1 << 8,
    OVERLAY_MAP: 1 << 9,
    TERRAIN_LIGHTING_FRAGMENT: 1 << 10,
    DBG_GRID: 1 << 11,
    SPHERE: 1 << 12
} as const;

export type ProgramMacroName = keyof typeof PROGRAM_MACRO;

export type ProgramMacros = {
    -readonly [Name in ProgramMacroName]?: typeof PROGRAM_MACRO[Name]
};

type ShaderMacros = {
    [name: string]: number | string
};

export type ProgramInitOptions = {
    screenTarget: ScreenRenderTarget;
    buffers: BufferCache;
    ubos?: unknown;
    [key: string]: unknown;
};

/**
 * Depth bias (in polygon offset units) applied to heightmapped point features
 * while hardware depth testing is active. It keeps them above the terrain
 * surface without preventing terrain geometry at significantly different
 * depths from occluding them.
 */
const TERRAIN_SURFACE_DEPTH_BIAS = -(1 << 11);

class Program {
    protected vertexShaderSrc: string;
    protected fragmentShaderSrc: string;
    protected framebuffer: WebGLFramebuffer;
    private colorMask: ColorMask;
    activeAttributes: number;
    private uniformBufferObjects: any[];

    // static _noMacros = {};
    protected screenTarget: ScreenRenderTarget;
    private readonly defaultHeightMapTransform: Float32Array = new Float32Array([0, 0, 1]);

    static getMacros(buffer: GeometryBuffer, useTerrainOcclusion = true): ProgramMacros {
        let macros: ProgramMacros;
        if (buffer.heightMapRef) {
            macros = {USE_HEIGHTMAP: PROGRAM_MACRO.USE_HEIGHTMAP};
        }
        if (useTerrainOcclusion && buffer.terrainOcclusion === TerrainOcclusionMode.TERRAIN) {
            macros ||= {};
            macros.TERRAIN_OCCLUSION = PROGRAM_MACRO.TERRAIN_OCCLUSION;
        }
        return macros;
    }

    static getMacroMask(macros?: ProgramMacros): number {
        let mask = 0;
        if (macros) {
            // Compile-time macro values are numeric bit flags.
            for (const name in macros) {
                mask |= macros[name as ProgramMacroName] || 0;
            }
        }
        return mask;
    }

    static getProgramId(buffer: GeometryBuffer, macros?: ProgramMacros) {
        const macroMask = Program.getMacroMask(macros);
        return macroMask
            ? buffer.type + macroMask
            : buffer.type;
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
    protected uniformSetters: { [uniform: string]: (v: any) => void } = {};
    protected mode: number; // gl.POINTS;

    private dpr: number; // devicepixelratio

    protected _pass: PASS;

    private texUnitCount: number;

    private terrainPreviewMaxTiles = 8;

    private macros: ShaderMacros = {
        'M_PI': 3.1415927410125732
    };

    // Parsed from shader source (WebGL2 only); empty in WebGL1
    uniformBlocks?: UniformBlockLayout[];

    constructor(
        protected readonly device: GraphicsDevice,
        // mode: number,
        // vertexShader: string,
        // fragmentShader: string,
        devicePixelRation: number,
        macros?: ProgramMacros,
        mode?: number
    ) {
        const gl = device.gl;
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

    init(options: ProgramInitOptions) {
        this.screenTarget = options.screenTarget;
        if (this.screenTarget.depthSnapshotFormat === 'rgba') {
            this.macros.TERRAIN_DEPTH_RGBA = 1;
        }
        this.compile(this.vertexShaderSrc, this.fragmentShaderSrc, this.macros);

        this.setBufferCache(options.buffers);

        this.initializeUBOs(options.ubos);

        this.ensureExtensions();
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
        this.device.useProgram(this);

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

        // let err = gl.getError();
        // if (err === gl.INVALID_OPERATION) {
        //     throw new Error('WebGL bindBuffer: Invalid Operation');
        // }

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
                    // gl.activeTexture(gl.TEXTURE0 + tu);
                    v?.bind(tu);
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
                    // gl.activeTexture(gl.TEXTURE0 + maxUnits[i]);
                    textures[i]?.bind(maxUnits[i]);
                }
                gl.uniform1iv(location, maxUnits);
                // gl.uniform1iv(location, maxUnits.subarray(0, count));
            };
        }

        return () => console.warn('setting uniform not supported', uInfo, location);
    }

    private buildSource(vertexShader: string, fragmentShader: string, macros?: ShaderMacros): string[] {
        const prog = this;

        macros = {...prog.macros, DEVICE_PIXEL_RATIO: prog.dpr.toFixed(1), ...macros};

        let macroSrc = '';
        for (let name in macros) {
            macroSrc += `#define ${name} ${macros[name]}\n`;
        }
        const vertexMacroSrc = `${macroSrc}#define XYZ_VERTEX_SHADER 1\n`;
        const fragmentMacroSrc = `${macroSrc}#define XYZ_FRAGMENT_SHADER 1\n`;

        const insertIntroVertex = (src: string, intro: string): string => {
            // Find insertion point: after the initial "header" block consisting of
            // #version, #extension, #pragma, #line and blank lines.
            // This avoids breaking WebGL rules where #version must be first and
            // #extension must appear before any non-preprocessor tokens.
            let i = 0;
            let insertAt = 0;

            while (i < src.length) {
                const lineStart = i;
                let lineEnd = src.indexOf('\n', i);
                if (lineEnd === -1) lineEnd = src.length;
                const line = src.slice(lineStart, lineEnd);
                const trimmed = line.trim();
                // if (trimmed.length === 0) {// Keep leading blank lines as part of the header.
                //     insertAt = lineEnd; } else
                if (trimmed.startsWith('#')) {
                    // Allow only directives that are safe/required at the top.
                    // Keep them grouped together before intro.
                    if (/^\s*#\s*(version|extension|pragma|line)\b/.test(line)) {
                        insertAt = lineEnd;
                    } else {
                        // Any other preprocessor directive: still keep it in the header
                        // to avoid changing meaning.
                        insertAt = lineEnd;
                    }
                } else {
                    // First real token: stop. Insert right before this line.
                    insertAt = lineStart;
                    break;
                }
                i = lineEnd + 1;
                if (lineEnd === src.length) break;
            }
            // Ensure we insert on a line boundary.
            const needsTrailingNl = insertAt > 0 && src[insertAt - 1] !== '\n';
            const prefix = src.slice(0, insertAt) + (needsTrailingNl ? '\n' : '');
            const suffix = src.slice(insertAt);
            return `${prefix}\n${intro}\n${suffix}`;
        };


        const vertexProcessed = preprocessShaderIncludes(vertexShader, GLSL_INCLUDES);
        const fragmentProcessed = preprocessShaderIncludes(fragmentShader, GLSL_INCLUDES);

        return [
            insertIntroVertex(vertexProcessed, vertexMacroSrc + introVertex),
            hoistGLSLVersionDirective(fragmentMacroSrc + fragmentProcessed)
        ]; // .map(positionGLSLVersion);
    }

    protected compile(vertexShader: string, fragmentShader: string, macros?: ShaderMacros) {
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

        // this.uniformBufferObjects = this.initializeUBOs(vertexSrc);

        // setup uniforms
        let activeUniforms = gl.getProgramParameter(glProg, gl.ACTIVE_UNIFORMS);

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

    initViewUniforms(_displayUniforms: ViewUniforms, isOffscreenPass = false) {
        if (this.macros.TERRAIN_OCCLUSION && !isOffscreenPass) {
            const terrainDepth = this.screenTarget?.getDepthTexture();
            if (terrainDepth) {
                this.initUniform('u_terrainDepth', terrainDepth);
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

    initBufferAttributes(geometryBuffer: GeometryBuffer, groupIndex: number) {
        const bufAttributes = geometryBuffer.getAttributes();
        const {vaoManager} = this.device;

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
                attributeDivisors[location] = attributeDivisor;
                if (instanced) {
                    this.device.instancing.vertexAttribDivisor(location, 1);
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

    isPassRequired(activePass: PASS, itemPassMask: PASS): boolean {
        const passed = Boolean(activePass & itemPassMask);

        if (!passed) debugger;

        return passed;
    }

    protected dbgGLState(geoBuffer) {
        logGLRenderState(this.gl, {
            'TYPE (ID)': `${this.name} ${geoBuffer.id || null}`,
            'PASS': this._pass
        }/* , this.prog*/);
        console.log(geoBuffer);
    }

    draw(geoBuffer: GeometryBuffer, isPreview?: boolean) {
        const {gl} = this;
        const {groups, instances} = geoBuffer;

        // if (this.name == 'Line' || this.name == 'Image'){
        // if (this.name === 'Extrude') {
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
                    this.device.instancing.drawElementsInstanced(mode, count, type, 0, instances);
                } else {
                    gl.drawElements(mode, count, type, 0);
                }
            } else {
                const first = (<ArrayDrawCmd>grp).arrays.first;
                const count = (<ArrayDrawCmd>grp).arrays.count;

                if (instances) {
                    this.device.instancing.drawArraysInstanced(mode, first, count, instances);
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
        sFactor: number = BlendFactor.ONE,
        dFactor: number = BlendFactor.ONE_MINUS_SRC_ALPHA
    ) {
        this.device.setBlendFunc(sFactor, dFactor);
    }

    configureRenderState(renderItem: RenderTile, pass: PASS) {
        const geoBuffer = renderItem.buffer;
        this._pass = pass;

        const cullFace = geoBuffer.cullFace();

        this.device.setCullFaceEnabled(!!cullFace);
        if (cullFace) {
            this.device.setCullFace(cullFace);
        }

        this.device.applyPolygonOffsetState(false);
    }

    disableAttributes(newProgramMaxAttr: number) {
        // With VAOs, attribute enable/disable state is stored in the VAO,
        // so manually disabling here is unnecessary (and can be counterproductive).
        if (this.device.vaoManager.isVAOSupported) return;

        const {attributeLocations, attributeDivisors, gl} = this;
        // can be optimised to just disable unused attributes.
        // like: for (let i = newProgramMaxAttr; i < oldProgramMaxAttr; i++)...
        for (let name in attributeLocations) {
            let {index, length} = attributeLocations[name];

            while (length--) {
                let i = index + length;
                if (attributeDivisors[i]) {
                    this.device.instancing.vertexAttribDivisor(i, 0);
                    attributeDivisors[i] = 0;
                }
                gl.disableVertexAttribArray(i);
            }
        }
    }

    delete() {
        this.gl.deleteProgram(this.prog);
    }

    setContext(context: ProgramContext) {

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
    initHeightMap(geomBuffer: GeometryBuffer, heightMapTextures: HeightMapTileCache, exaggeration: number = 1) {
        if (!geomBuffer.heightMapRef && !geomBuffer.heightMap) {
            return;
        }

        let tileSize = heightMapTextures.tileSize;
        let heightMapSize: number;
        let padding = heightMapTextures.padding;

        if (geomBuffer.heightMap) {
            padding = geomBuffer.heightMap.padding ?? padding;
            heightMapSize = geomBuffer.heightMap.size;
            // Handle case when geomBuffer is a TerrainGeometryBuffer with a direct heightMap
            // HeightMap is already set in uniforms -> no further action required here.
        } else {
            const ref = geomBuffer.heightMapRef;
            if (ref && typeof ref === 'object') {
                const heightMapData = geomBuffer.resolvedHeightMap;
                let heightMapTexture: Texture = heightMapData?.texture;
                padding = heightMapData?.padding ?? padding;

                if (!heightMapTexture) {
                    heightMapTexture = heightMapTextures.getEmptyTexture();
                    tileSize = heightMapTexture.width - heightMapTextures.tilePadding;
                }

                heightMapSize = heightMapTexture.width;
                this.initUniform('uHeightMap', heightMapTexture);
            }
        }

        // Prefer the per-frame resolved transform: it matches the heightmap that was
        // actually bound, including the case where the resolve fell back to an ancestor.
        const ref = geomBuffer.heightMapRef as HeightMapReference;
        const heightMapTransform = geomBuffer.resolvedHeightMapTransform !== undefined
            ? geomBuffer.resolvedHeightMapTransform
            : ref?.transform;
        this.initUniform('uHeightMapTransform', heightMapTransform ?? this.defaultHeightMapTransform);

        this.gl.uniform3f(this.getUniformLocation('uHeightMapTileSize'), heightMapSize, tileSize, padding);
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

    preparePass(pass: PASS, renderTile: RenderTile, renderTarget: IRenderTarget) {
        // this.bindFramebuffer(frameBuffer, width, height);
        renderTarget.bind(this.device);
    }

    // preparePass(pass: PASS, renderTile: RenderTile, frameBuffer: WebGLFramebuffer | null = null, width?: number, height?: number) {
    //     this.bindFramebuffer(frameBuffer, width, height);
    // }
    // preparePass(pass: PASS, frameBuffer: WebGLFramebuffer | null = null, width?: number, height?: number) {
    //     this.bindFramebuffer(frameBuffer, width, height);
    // }
    protected ensureExtensions() {

    }

    // getPassStateOverride(renderPass: RenderPass): RenderState | null {
    //     return null;
    // }

    getPassStateOverride(renderPass: RenderPass, buffer: GeometryBuffer, stencilRefVal: number): RenderState | null {
        const pass = renderPass.type;

        if (buffer.needsAlphaDepthPass()) {
            const gl = this.gl;
            if (pass === PASS.ALPHA_COLOR) {
                return {
                    stencil: {
                        enabled: false
                        // func: {
                        //     func: gl.EQUAL,
                        //     ref: stencilRefVal,
                        //     mask: 0xff
                        // },
                        // op: {fail: gl.KEEP, zfail: gl.KEEP, zpass: gl.KEEP}
                    }
                };
            }
        }


        return null;
    };


    /**
     * Applies per-draw render state overrides for stencil and depth testing.
     *
     * This method dynamically adjusts WebGL state for two main use cases:
     *
     * 1. **Tile Stenciling (2D / flat geometry only)**:
     *    - Used to clip flat / unclipped geometry to a specific tile region.
     *    - Sets `stencilTest = true`
     *    - Uses `stencilFunc(EQUAL, tileStencilId, 0xff)`
     *    - Uses `stencilOp(KEEP, KEEP, KEEP)` to leave stencil values unchanged
     *    - Typically applied in both ALPHA_DEPTH and ALPHA_COLOR passes when rendering
     *      2D tiles or other flat geometries, regardless of blending mode (opaque or alpha).
     *
     * 2. **Alpha Overlap / Dual-Pass Alpha (extruded polygons)**:
     *    - Ensures color writes only for fragments that match the depth pre-pass.
     *    - Sets `depthFunc = EQUAL` in ALPHA_COLOR pass.
     *    - If no tile stencil is active, increments stencil via `stencilOp(KEEP, KEEP, INCR)`
     *      to track overlapping fragments and prevent double-blending.
     *
     * Notes:
     * - `ALPHA_DEPTH` pass writes depth only; does not change color.
     * - `ALPHA_COLOR` pass blends fragment colors based on depth and optionally stencil.
     * - Overrides are applied per-draw; defaults in RenderPass definitions remain unchanged.
     *
     * @internal
     * @hidden
     *
     * @param renderPass - The RenderPass currently being drawn.
     * @param buffer - GeometryBuffer being rendered.
     * @param tileStencilId - Optional stencil reference ID for tile clipping; only used for 2D / flat geometry.
     * @returns true if any overrides were applied, false otherwise.
     */
    applyPassOverrides(
        renderPass: RenderPass,
        renderTile: RenderTile,
        // buffer: GeometryBuffer,
        tileStencilId: number | null,
        isOffscreenPass: boolean
    ): boolean {
        const buffer = renderTile.buffer;

        let override = false;
        // --- Tile Stencil Masking ---
        if (tileStencilId !== null) {
            // Only render inside the tile
            this.device.setStencilTest(true);
            // overwrites/sets pass default renderPass.desc.state.stencil
            this.device.setStencilFunc(this.gl.EQUAL, tileStencilId, 0xff);
            // Keep stencil untouched
            this.device.setStencilOp(this.gl.KEEP, this.gl.KEEP, this.gl.KEEP);
            override = true;
        }


        if (buffer.needsAlphaDepthPass()) {
            if (renderPass.type === PASS.ALPHA_COLOR) {
                // Ensure color writes only where depth matches the pre-pass
                this.device.setDepthFunc(this.gl.EQUAL);
                // If no tile stencil is active, we need to increment stencil for overlap tracking
                if (tileStencilId === null && !isOffscreenPass) {
                    this.device.setStencilTest(true);
                    this.device.setStencilOp(this.gl.KEEP, this.gl.KEEP, this.gl.INCR);
                }
                override = true;
            } else if (tileStencilId === null /* && renderPass.type === PASS.ALPHA_DEPTH*/) {
                // make sure tile stencil test is disabled for 3d features and enable overlap alpha tracking.
                this.device.setStencilTest(false);
                override = true;
            }
        }

        // Screen-depth occlusion disables hardware depth testing and evaluates
        // terrain visibility in the shader. The polygon offset is only needed
        // for the remaining onscreen heightmapped point features.
        if (!isOffscreenPass) {
            if (renderTile.isTerrainOcclusionCandidate() && this.screenTarget?.getDepthTexture()) {
                this.device.setDepthTest(false);
                override = true;
            } else if (!buffer.isTerrainSurface() && buffer.requiresHeightMap() && buffer.isPointBuffer()) {
                // Without shader-based screen-depth occlusion, heightmapped point features
                // use hardware depth testing. Bias them slightly toward the camera so the
                // terrain surface they sit on cannot partially occlude their geometry or
                // cause z-fighting, while terrain at a different depth can still occlude them.
                this.device.applyPolygonOffsetState(true, 0, TERRAIN_SURFACE_DEPTH_BIAS);
                override = true;
            }
        }
        return override;
    }
}

export default Program;
