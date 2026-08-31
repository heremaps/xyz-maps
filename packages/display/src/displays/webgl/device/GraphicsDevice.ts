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
import {isWebGL2} from '../glTools';

import {RenderState} from '../RenderState';
import {GLExtensions} from './GLExtensions';
import {createWebGLInstancing, WebGLInstancing} from './GLInstancing';
import {ScreenDepthBackend} from './ScreenDepthBackend';
import {VAOManager} from './VAOManager';

const makeEnum = <K extends string>(keys: readonly K[]) =>
    Object.fromEntries(keys.map((k) => [k, 0])) as Record<K, number>;
export const BlendFactor = makeEnum([
    'ZERO',
    'ONE',
    'SRC_ALPHA',
    'ONE_MINUS_SRC_ALPHA'
] as const);

export const TextureFormat = makeEnum([
    'R8',
    'LUMINANCE'
] as const);

export const DepthFunc = makeEnum([
    'NEVER',
    'LESS',
    'LEQUAL',
    'EQUAL',
    'GEQUAL',
    'GREATER',
    'NOTEQUAL',
    'ALWAYS'
] as const);

export const ClearMask = makeEnum([
    'COLOR',
    'DEPTH',
    'STENCIL'
] as const);

export const CullFace = makeEnum([
    'FRONT',
    'BACK'
] as const);

const WEBGL1_DEFAULT_EXTENSIONS = [
    'OES_element_index_uint',
    'ANGLE_instanced_arrays',
    'OES_texture_float'
];

type WebGLDepthTextureExtension = {
    UNSIGNED_INT_24_8_WEBGL: GLenum;
};

export type DepthTextureParameters = {
    format: GLenum;
    internalFormat: GLenum;
    type: GLenum;
};


export interface GraphicsProgram {
    prog: WebGLProgram;
    activeAttributes: number;

    disableAttributes(newProgramMaxAttr: number);
};

export class GraphicsDevice {
    readonly gl: WebGLRenderingContext;
    readonly isWebGL2: boolean;
    readonly DEPTH_STENCIL_INTERNAL_FORMAT: number;
    private readonly depthTextureExtension: WebGLDepthTextureExtension | null;
    readonly extensions: GLExtensions;
    readonly instancing: WebGLInstancing;
    readonly vaoManager: VAOManager;
    private _screenDepth?: ScreenDepthBackend;


    private _framebuffer: WebGLFramebuffer | null = null;
    private _renderbuffer: WebGLRenderbuffer | null = null;
    private _currentProgram: GraphicsProgram | null = null;

    private _viewport: [number, number, number, number] = [-1, -1, -1, -1];
    private _clearColor: [number, number, number, number] = [NaN, NaN, NaN, NaN];
    private _colorMask: [boolean, boolean, boolean, boolean] = [true, true, true, true];
    private _depthMask!: boolean;
    private _depthTest!: boolean | null;
    private _depthFnc!: number | null;
    private _depthRange: [number, number] = [-1, -1];

    private _blendSrc!: number | null;
    private _blendDst!: number | null;
    private _blendEnabled!: boolean | null;

    private _clearDepth!: number;
    private _clearStencil!: number;

    private _scissorTest!: boolean | null;

    // --- stencil ---
    private _stencilTest!: boolean | null;
    private _stencilFunc!: number | null;
    private _stencilRef!: number | null;
    private _stencilValueMask!: number | null;
    private _stencilOpFail!: number | null;
    private _stencilOpZFail!: number | null;
    private _stencilOpZPass!: number | null;
    private _stencilWriteMask: number = null;

    private _enabledAttributes = new Set<number>();
    private _cullFaceEnabled: boolean;
    private _cullFaceMode: number;
    private _frontFace: number;

    private _polygonOffsetEnabled = false;
    private _polygonOffsetFactor = 0;
    private _polygonOffsetUnits = 0;

    private _activeTextureUnit = 0;
    private _boundTexture2D: Array<WebGLTexture | null>;

    private _maxTexSize: number;

    constructor(canvas: HTMLCanvasElement, attributes: WebGLContextAttributes) {
        // const gl = canvas.getContext('webgl', attributes);
        const gl = canvas.getContext('webgl2', attributes) || canvas.getContext('webgl', attributes);
        if (!gl) {
            throw new Error('Unable to create a WebGL context');
        }
        this.gl = gl;

        this.isWebGL2 = isWebGL2(gl);
        this.extensions = new GLExtensions(
            gl,
            this.isWebGL2 ? [] : WEBGL1_DEFAULT_EXTENSIONS
        );
        this.instancing = createWebGLInstancing(gl, this.extensions);
        this.vaoManager = new VAOManager(gl, this.extensions);
        this.depthTextureExtension = this.isWebGL2
            ? null
            : this.extensions.getExtension('WEBGL_depth_texture') as WebGLDepthTextureExtension | null;
        this._screenDepth = this.isWebGL2 || !!this.depthTextureExtension
            ? new ScreenDepthBackend(this)
            : undefined;
        this.DEPTH_STENCIL_INTERNAL_FORMAT = this.isWebGL2
            ? (gl as WebGL2RenderingContext).DEPTH24_STENCIL8
            : gl.DEPTH_STENCIL;

        this.initEnums();
        this.invalidateState();

        this._boundTexture2D = new Array(gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS)).fill(null);

        this._maxTexSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    }

    invalidateState(): void {
        this._framebuffer = null;
        this._renderbuffer = null;
        this._currentProgram = null;

        this._viewport[0] = -1;
        this._viewport[1] = -1;
        this._viewport[2] = -1;
        this._viewport[3] = -1;

        this._clearColor[0] = NaN;
        this._clearColor[1] = NaN;
        this._clearColor[2] = NaN;
        this._clearColor[3] = NaN;

        this._colorMask[0] = true;
        this._colorMask[1] = true;
        this._colorMask[2] = true;
        this._colorMask[3] = true;

        this._depthMask = true;
        this._depthTest = null;
        this._depthFnc = null;
        this._depthRange[0] = -1;
        this._depthRange[1] = -1;

        this._blendSrc = null;
        this._blendDst = null;
        this._blendEnabled = null;

        this._clearDepth = NaN;
        this._clearStencil = NaN;

        this._scissorTest = null;

        this._stencilTest = null;
        this._stencilFunc = null;
        this._stencilRef = null;
        this._stencilValueMask = null;
        this._stencilOpFail = null;
        this._stencilOpZFail = null;
        this._stencilOpZPass = null;

        this._enabledAttributes.clear();
    }

    resetStateToDefaults(options: { keepViewport?: boolean } = {}): void {
        const gl = this.gl;
        const keepViewport = options.keepViewport ?? true;
        // Unbind program + draw targets.
        this.useProgram(null);
        this.bindFramebuffer(null);
        this.bindRenderbuffer(null);

        // Reset toggles.
        this.setDepthTest(false);
        this.setScissorTest(false);
        this.setStencilTest(false);
        this.setCullFaceEnabled(false);
        this.setPolygonOffsetFillEnabled(false);
        this.setBlendEnabled(false);
        gl.disable(gl.SAMPLE_ALPHA_TO_COVERAGE);
        gl.disable(gl.SAMPLE_COVERAGE);
        gl.enable(gl.DITHER);

        // Reset blend/depth/stencil/color defaults.
        gl.blendColor(0, 0, 0, 0);
        gl.blendEquation(gl.FUNC_ADD);
        this.setBlendFunc(gl.ONE, gl.ZERO);

        this.setClearColor(0, 0, 0, 0);
        this.setClearDepth(1);
        this.setClearStencil(0);

        this.setColorMask(true, true, true, true);
        this.setDepthMask(true);
        this.setDepthFunc(gl.LESS);
        this.setDepthRange(0, 1);

        this.setCullFace(gl.BACK);
        this.setFrontFace(gl.CCW);

        this.setStencilFunc(gl.ALWAYS, 0, 0xffffffff);
        this.setStencilOp(gl.KEEP, gl.KEEP, gl.KEEP);
        this.setStencilMask(0xffffffff);

        this.setPolygonOffset(0, 0);
        gl.sampleCoverage(1, false);

        if (!keepViewport) {
            this.setViewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
            gl.scissor(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        }

        // Unbind all texture targets on all units.
        for (let unit = 0; unit < this._boundTexture2D.length; unit++) {
            gl.activeTexture(gl.TEXTURE0 + unit);
            gl.bindTexture(gl.TEXTURE_2D, null);
            gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);

            if (this.isWebGL2) {
                const gl2 = gl as WebGL2RenderingContext;
                gl.bindTexture(gl2.TEXTURE_3D, null);
                gl.bindTexture(gl2.TEXTURE_2D_ARRAY, null);
            }
        }
        this._activeTextureUnit = 0;
        gl.activeTexture(gl.TEXTURE0);
        this._boundTexture2D.fill(null);

        this.unbindVertexArray();

        // Disable all attrib arrays to avoid leftovers from external/custom renderers.
        const maxAttribs = gl.getParameter(gl.MAX_VERTEX_ATTRIBS) as number;
        for (let i = 0; i < maxAttribs; i++) {
            gl.disableVertexAttribArray(i);
        }
        this._enabledAttributes.clear();
    }

    private initEnums() {
        const gl = this.gl;
        if (gl instanceof WebGL2RenderingContext) {
            TextureFormat.R8 = gl.R8;
            TextureFormat.LUMINANCE = gl.RED;
        } else {
            TextureFormat.R8 = gl.LUMINANCE;
            TextureFormat.LUMINANCE = gl.LUMINANCE;
        }
        // Blend factors
        BlendFactor.ZERO = gl.ZERO;
        BlendFactor.ONE = gl.ONE;
        BlendFactor.SRC_ALPHA = gl.SRC_ALPHA;
        BlendFactor.ONE_MINUS_SRC_ALPHA = gl.ONE_MINUS_SRC_ALPHA;
        // DepthFunc
        DepthFunc.NEVER = gl.NEVER;
        DepthFunc.LESS = gl.LESS;
        DepthFunc.LEQUAL = gl.LEQUAL;
        DepthFunc.EQUAL = gl.EQUAL;
        DepthFunc.GEQUAL = gl.GEQUAL;
        DepthFunc.GREATER = gl.GREATER;
        DepthFunc.NOTEQUAL = gl.NOTEQUAL;
        DepthFunc.ALWAYS = gl.ALWAYS;
        // Clear masks (bitfield for gl.clear)
        ClearMask.COLOR = gl.COLOR_BUFFER_BIT;
        ClearMask.DEPTH = gl.DEPTH_BUFFER_BIT;
        ClearMask.STENCIL = gl.STENCIL_BUFFER_BIT;
        // Cull face
        CullFace.FRONT = gl.FRONT;
        CullFace.BACK = gl.BACK;
    }

    bindFramebuffer(fb: WebGLFramebuffer | null) {
        if (this._framebuffer !== fb) {
            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, fb);
            this._framebuffer = fb;
        }
    }

    invalidateFramebufferState(): void {
        this._framebuffer = null;
    }

    unbindVertexArray(): void {
        this.vaoManager.bindVAO(null);
    }

    getScreenDepth(): ScreenDepthBackend | undefined {
        if (!this._screenDepth) {
            throw new Error('Screen depth textures are not supported');
        }
        return this._screenDepth;
    }

    destroy(): void {
        const screenDepth = this._screenDepth;
        this._screenDepth = undefined;
        screenDepth?.destroy();
    }

    bindRenderbuffer(rb: WebGLRenderbuffer | null) {
        if (this._renderbuffer !== rb) {
            this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, rb);
            this._renderbuffer = rb;
        }
    }

    deleteRenderbuffer(rb: WebGLRenderbuffer | null) {
        if (!rb) return;
        if (this._renderbuffer === rb) {
            this.bindRenderbuffer(null);
        }
        this.gl.deleteRenderbuffer(rb);
    }

    deleteFramebuffer(fb: WebGLFramebuffer | null) {
        if (!fb) return;
        if (this._framebuffer === fb) {
            this.bindFramebuffer(null);
        }
        this.gl.deleteFramebuffer(fb);
    }

    //
    // getWidth(): number {
    //     return this._viewport[2];
    // }
    // getHeight(): number {
    //     return this._viewport[3];
    // }

    setViewport(x: number, y: number, width: number, height: number) {
        const viewport = this._viewport;
        if (viewport[0] !== x || viewport[1] !== y || viewport[2] !== width || viewport[3] !== height) {
            this.gl.viewport(x, y, width, height);
            viewport[0] = x;
            viewport[1] = y;
            viewport[2] = width;
            viewport[3] = height;
        }
    }

    getCurrentProgram(): GraphicsProgram | null {
        return this._currentProgram;
    }

    useProgram(program: GraphicsProgram | null ): boolean {
        const curProg = this._currentProgram;
        if (curProg === program) return false;
        // disable bound Attributes from current program first
        curProg?.disableAttributes(curProg.activeAttributes);

        this.gl.useProgram(program === null ? null : program.prog);
        this._currentProgram = program;
        return true;
    }

    // ---- State Methods ----
    setColorMask(r: boolean, g: boolean, b: boolean, a: boolean) {
        const cm = this._colorMask;
        if (cm[0] !== r || cm[1] !== g || cm[2] !== b || cm[3] !== a) {
            this.gl.colorMask(r, g, b, a);
            cm[0] = r;
            cm[1] = g;
            cm[2] = b;
            cm[3] = a;
        }
    }

    setClearDepth(depth: number) {
        if (this._clearDepth !== depth) {
            // WebGL1 + WebGL2 both expose clearDepth()
            this.gl.clearDepth(depth);
            this._clearDepth = depth;
        }
    }

    setClearStencil(stencil: number) {
        if (this._clearStencil !== stencil) {
            this.gl.clearStencil(stencil);
            this._clearStencil = stencil;
        }
    }

    setDepthMask(flag: boolean) {
        if (this._depthMask !== flag) {
            this.gl.depthMask(flag);
            this._depthMask = flag;
        }
    }

    setDepthTest(flag: boolean) {
        if (this._depthTest !== flag) {
            const gl = this.gl;
            if (flag) gl.enable(gl.DEPTH_TEST);
            else gl.disable(gl.DEPTH_TEST);
            this._depthTest = flag;
        }
    }

    setScissorTest(flag: boolean) {
        if (this._scissorTest !== flag) {
            const gl = this.gl;
            if (flag) gl.enable(gl.SCISSOR_TEST);
            else gl.disable(gl.SCISSOR_TEST);
            this._scissorTest = flag;
        }
    }

    setStencilTest(flag: boolean) {
        if (this._stencilTest !== flag) {
            const gl = this.gl;
            if (flag) gl.enable(gl.STENCIL_TEST);
            else gl.disable(gl.STENCIL_TEST);
            this._stencilTest = flag;
        }
    }

    setStencilFunc(func: number, ref: number, mask: number) {
        if (this._stencilFunc !== func || this._stencilRef !== ref || this._stencilValueMask !== mask) {
            this.gl.stencilFunc(func, ref, mask);
            this._stencilFunc = func;
            this._stencilRef = ref;
            this._stencilValueMask = mask;
        }
    }

    setStencilOp(fail: number, zfail: number, zpass: number) {
        if (this._stencilOpFail !== fail || this._stencilOpZFail !== zfail || this._stencilOpZPass !== zpass) {
            this.gl.stencilOp(fail, zfail, zpass);
            this._stencilOpFail = fail;
            this._stencilOpZFail = zfail;
            this._stencilOpZPass = zpass;
        }
    }

    setStencilState(
        enabled: boolean,
        func?: { func: number; ref: number; mask: number },
        op?: { fail: number; zfail: number; zpass: number }
    ) {
        this.setStencilTest(enabled);
        if (!enabled) return;

        if (func) this.setStencilFunc(func.func, func.ref, func.mask);
        if (op) this.setStencilOp(op.fail, op.zfail, op.zpass);
    }

    clear(mask: number) {
        // this.gl.clear(mask);

        this.setScissorTest(false);

        if (mask & ClearMask.COLOR) {
            this.setColorMask(true, true, true, true);
        }
        if (mask & ClearMask.DEPTH) {
            this.setDepthMask(true);
        }
        if (mask & ClearMask.STENCIL) {
            this.setStencilMask(0xff);
        }
        this.gl.clear(mask);
    }

    setClearColor(r: number, g: number, b: number, a: number) {
        const cc = this._clearColor;
        if (cc[0] !== r || cc[1] !== g || cc[2] !== b || cc[3] !== a) {
            this.gl.clearColor(r, g, b, a);
            cc[0] = r;
            cc[1] = g;
            cc[2] = b;
            cc[3] = a;
        }
    }

    setBlendFunc(src: number, dst: number) {
        if (this._blendSrc !== src || this._blendDst !== dst) {
            this.gl.blendFunc(src, dst);
            this._blendSrc = src;
            this._blendDst = dst;
        }
    }

    setBlendEnabled(enabled: boolean) {
        if (this._blendEnabled !== enabled) {
            const gl = this.gl;
            enabled ? gl.enable(gl.BLEND) : gl.disable(gl.BLEND);
            this._blendEnabled = enabled;
        }
    }

    setDepthFunc(depthFnc: number) {
        if (this._depthFnc !== depthFnc) {
            this.gl.depthFunc(depthFnc);
            this._depthFnc = depthFnc;
        }
    }

    setDepthRange(near: number, far: number) {
        const [currentNear, currentFar] = this._depthRange;
        if (currentNear !== near || currentFar !== far) {
            this.gl.depthRange(near, far);
            this._depthRange = [near, far];
        }
    }

    enableVertexAttribArray(index: number) {
        if (!this._enabledAttributes.has(index)) {
            this.gl.enableVertexAttribArray(index);
            this._enabledAttributes.add(index);
        }
    }

    disableVertexAttribArray(index: number) {
        if (this._enabledAttributes.has(index)) {
            this.gl.disableVertexAttribArray(index);
            this._enabledAttributes.delete(index);
        }
    }

    applyRenderState(renderState: RenderState) {
        const device = this;

        // const gl = device.gl;
        // ---------- depth ----------
        const depthTest = renderState.depthTest;
        if (depthTest) {
            device.setDepthTest(!!depthTest.enabled);
            // depthTest.enabled
            //     ? gl.enable(gl.DEPTH_TEST)
            //     : gl.disable(gl.DEPTH_TEST);

            if (depthTest.func !== undefined) {
                device.setDepthFunc(depthTest.func);
            }
            if (depthTest.write !== undefined) {
                device.setDepthMask(depthTest.write);
            }
        }
        // ---------- blend ----------
        this.applyBlendState(renderState.blend);
        // ---------- color mask ----------
        const colorMask = renderState.colorMask;
        if (colorMask) {
            device.setColorMask(colorMask[0], colorMask[1], colorMask[2], colorMask[3]);
        }

        // ---------- stencil ----------
        this.applyStencilState(renderState.stencil);

        // cull
        // this.applyCullState(renderState.cull);
    }

    applyStencilState(stencil?: RenderState['stencil']) {
        // const gl = this.gl;
        const enabled = stencil ? stencil.enabled : false;
        if (enabled) {
            // gl.enable(gl.STENCIL_TEST);
            this.setStencilFunc(stencil.func.func, stencil.func.ref, stencil.func.mask);
            this.setStencilOp(stencil.op.fail, stencil.op.zfail, stencil.op.zpass);
            // gl.stencilFunc(stencil.func.func, stencil.func.ref, stencil.func.mask);
            // gl.stencilOp(stencil.op.fail, stencil.op.zfail, stencil.op.zpass);
        }
        // else {
        //     // gl.disable(gl.STENCIL_TEST);
        // }
        this.setStencilTest(enabled);
    }

    applyBlendState(blend: RenderState['blend']) {
        if (blend) {
            this.setBlendEnabled(!!blend.enabled);

            if (blend.src !== undefined) {
                this.setBlendFunc(blend.src, blend.dst!);
            }
        }
    }

    setStencilMask(writeMask: number) {
        if (this._stencilWriteMask !== writeMask) {
            this.gl.stencilMask(writeMask);
            this._stencilWriteMask = writeMask;
        }
    }

    setPolygonOffsetFillEnabled(enabled: boolean): void {
        if (this._polygonOffsetEnabled !== enabled) {
            const gl = this.gl;
            enabled ? gl.enable(gl.POLYGON_OFFSET_FILL)
                : gl.disable(gl.POLYGON_OFFSET_FILL);
            this._polygonOffsetEnabled = enabled;
        }
    }

    setPolygonOffset(factor: number, units: number): void {
        if (
            this._polygonOffsetFactor !== factor ||
            this._polygonOffsetUnits !== units
        ) {
            this.gl.polygonOffset(factor, units);
            this._polygonOffsetFactor = factor;
            this._polygonOffsetUnits = units;
        }
    }

    applyPolygonOffsetState(
        enabled: boolean,
        factor: number = this._polygonOffsetFactor,
        units: number = this._polygonOffsetUnits
    ) {
        this.setPolygonOffsetFillEnabled(enabled);
        if (enabled) {
            this.setPolygonOffset(factor, units);
        }
    }


    setCullFaceEnabled(enabled: boolean) {
        if (this._cullFaceEnabled !== enabled) {
            const gl = this.gl;
            enabled ? gl.enable(gl.CULL_FACE) : gl.disable(gl.CULL_FACE);
            this._cullFaceEnabled = enabled;
        }
    }

    setCullFace(mode: number) {
        if (this._cullFaceMode !== mode) {
            this.gl.cullFace(mode);
            this._cullFaceMode = mode;
        }
    }

    setFrontFace(mode: number) {
        if (this._frontFace !== mode) {
            this.gl.frontFace(mode);
            this._frontFace = mode;
        }
    }

    applyCullState(enabled: boolean, face?: number, frontFace?: number) {
        this.setCullFaceEnabled(enabled);

        if (!enabled) return;

        if (face !== undefined) {
            this.setCullFace(face);
        }
        if (frontFace !== undefined) {
            this.setFrontFace(frontFace);
        }
    }

    // ---- Texture methods ----
    activeTexture(unit: number): void {
        if (this._activeTextureUnit === unit) return;
        this._activeTextureUnit = unit;
        this.gl.activeTexture(this.gl.TEXTURE0 + unit);
    }

    bindTexture2D(unit: number, tex: WebGLTexture | null): void {
        this.activeTexture(unit);
        if (this._boundTexture2D[unit] === tex) return;
        this._boundTexture2D[unit] = tex;
        this.gl.bindTexture(this.gl.TEXTURE_2D, tex);
    }

    unbindTexture2D(tex: WebGLTexture): void {
        for (let unit = 0; unit < this._boundTexture2D.length; unit++) {
            if (this._boundTexture2D[unit] === tex) {
                this.bindTexture2D(unit, null);
            }
        }
    }

    unbindAllTextures(): void {
        for (let unit = 0; unit < this._boundTexture2D.length; unit++) {
            this.bindTexture2D(unit, null);
        }
    }

    getMaxTexSize(): number {
        return this._maxTexSize;
    }

    get supportsScreenDepthTexture(): boolean {
        return !!this._screenDepth;
    }

    getDepthTextureParameters(depthStencil: boolean): DepthTextureParameters {
        const gl = this.gl;
        if (!this.supportsScreenDepthTexture) {
            throw new Error('Depth textures are not supported');
        }

        if (!depthStencil) {
            return {
                format: gl.DEPTH_COMPONENT,
                internalFormat: this.isWebGL2 ? (gl as WebGL2RenderingContext).DEPTH_COMPONENT16 : gl.DEPTH_COMPONENT,
                type: gl.UNSIGNED_SHORT
            };
        }

        return this.isWebGL2
            ? {
                format: gl.DEPTH_STENCIL,
                internalFormat: (gl as WebGL2RenderingContext).DEPTH24_STENCIL8,
                type: (gl as WebGL2RenderingContext).UNSIGNED_INT_24_8
            }
            : {
                format: gl.DEPTH_STENCIL,
                internalFormat: gl.DEPTH_STENCIL,
                type: this.depthTextureExtension!.UNSIGNED_INT_24_8_WEBGL
            };
    }
}
