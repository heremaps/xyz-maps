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

import BasicRender from '../BasicRender';
import {CustomLayer, Tile, TileLayer} from '@here/xyz-maps-core';
import GLTile from './GLTile';
import RectProgram from './program/Rect';
import CircleProgram from './program/Circle';
import LineProgram from './program/Line';
import DashedLineProgram from './program/DashedLine';
import PolygonProgram from './program/Polygon';
import ImageProgram from './program/Image';
import TextProgram from './program/Text';
import IconProgram from './program/Icon';
import ExtrudeProgram from './program/Extrude';
import BoxProgram from './program/Box';
import SphereProgram from './program/Sphere';
import ModelProgram from './program/Model';
import HeatmapProgram from './program/Heatmap';
import {createSkyBuffer, createSkyMatrix, SkyProgram} from './program/Sky';
import Program, {ColorMask, UniformMap} from './program/Program';

import {createGridTextBuffer, createGridTileBuffer, createStencilTileBuffer} from './buffer/debugTileBuffer';
import {GeometryBuffer, IndexData, IndexGrp} from './buffer/GeometryBuffer';

import {PASS} from './program/GLStates';
import {MAX_PITCH_GRID, TileBufferData} from './Display';

import {transformMat4} from 'gl-matrix/vec3';
import {
    clone,
    copy,
    create,
    identity,
    invert,
    lookAt,
    multiply,
    ortho,
    perspective,
    rotateX,
    rotateZ,
    scale,
    translate
} from 'gl-matrix/mat4';
import BasicTile from '../BasicTile';
import {Attribute} from './buffer/Attribute';
import {GLExtensions} from './GLExtensions';
import {Texture} from './Texture';
import {Color} from '@here/xyz-maps-common';
import {GradientTexture} from './GradientFactory';
import {ViewportTile} from '../BasicDisplay';
import toRGB = Color.toRGB;


const mat4 = {
    ortho,
    create,
    lookAt,
    multiply,
    perspective,
    rotateX,
    rotateZ,
    translate,
    scale,
    clone,
    copy,
    invert,
    identity
};

const PI2 = 2 * Math.PI;
const DEG_2_RAD = Math.PI / 180;
const FIELD_OF_VIEW = 38 * DEG_2_RAD;
// Calculates the critical pitch angle where the view frustum reaches its limit.
// Beyond this angle, the calculation for zFar becomes unstable or negative.
const CRITICAL_PITCH = Math.PI / 2 - Math.atan(Math.tan(FIELD_OF_VIEW / 2));

const EXTENSION_OES_ELEMENT_INDEX_UINT = 'OES_element_index_uint';
const EXTENSION_ANGLE_INSTANCED_ARRAYS = 'ANGLE_instanced_arrays';

const DEBUG_GRID_FONT = {
    font: 'bold 14px Arial',
    stroke: 'red',
    fill: 'white',
    strokeWidth: 3
    // textAlign : 'start',
    // textBaseline : 'alphabetic'
};

const MAX_PITCH_SCISSOR = 72 * DEG_2_RAD;

const FULL_TILE_STENCIL = [[0, 0, 1]];

export type RenderOptions = WebGLContextAttributes;

export type BufferCache = WeakMap<Attribute | IndexData, WebGLBuffer>;


export type ViewUniforms = {
    fixedView: number;
    rz: number;
    elapsedTime: number;
    inverseMatrix: Float32Array;
}


export class GLRender implements BasicRender {
    static DEFAULT_COLOR_MASK: ColorMask = {
        r: true, g: true, b: true, a: true
    };

    static NO_COLOR_MASK: ColorMask = {
        r: false, g: false, b: false, a: false
    };
    readonly vPMat: Float32Array; // projection matrix
    readonly vPRasterMat: Float32Array; // pixel aligned projection matrix for raster data
    private readonly vMat: Float32Array; // view matrix
    private readonly invVPMat: Float32Array; // inverse projection matrix
    // the worldmatrix used by custom layers to project from absolute worldcoordinates [0-1] to screencoordinates
    private readonly worldMatrix: Float64Array;
    // temporary matrix used for matrix calculations
    private _tmpMatrix: Float32Array;

    private skyMatrix: Float32Array = createSkyMatrix();
    private skyBuffer: GeometryBuffer = createSkyBuffer();

    screenMat: Float32Array;
    invScreenMat: Float32Array;
    cameraWorld: Float64Array = new Float64Array(3);

    private tilePreviewTransform: {
        m: Float32Array; // tile transformation matrix,
        tx: number; // translate x
        ty: number; // translate y
        s: number; // scale
    };

    private zMeterToPixel: number;
    private scale: number;
    private rz: number;
    private rx: number;
    private programs: { [name: string]: Program };
    private gridTextBuf = new WeakMap();
    // private dLayer: { z: number, z3d: number };
    private zIndex: number; // current zIndex buffer should be drawn
    private min3dZIndex: number; // min zIndex containing 3d/extruded data


    tileGrid: boolean = false;
    // tileSize: number = 256;

    private dpr: number; // devicePixelRatio

    private dbgTile = createGridTileBuffer();
    private stencilTile: GeometryBuffer;
    private depthFnc: GLenum;
    private depthMask: boolean;
    private readonly ctxAttr: WebGLContextAttributes;
    private depthBufferSize: number;

    processedLight: { [lightSetName: string]: UniformMap }[] = [];

    pass: PASS;
    buffers: BufferCache = new WeakMap();
    gl: WebGLRenderingContext;
    private glExt: GLExtensions;
    zIndexLength: number;
    fixedView: number;

    private sharedUniforms: {
        u_resolution: number[];
        u_matrix: Float32Array;
        u_topLeft: number[];
        u_scale: number;
        u_zMeterToPixel: number;
        u_camWorld: Float64Array;
    };

    private programConfig: { [name: string]: { program: typeof Program, default?: boolean, macros?: any } };
    private resolution: number[] = [];
    private startTime: number;
    distanceCam2Center: number;

    private viewUniforms: ViewUniforms = {
        rz: 0,
        elapsedTime: 0,
        fixedView: 0,
        inverseMatrix: new Float32Array(16)
    };
    private bufferLightUniforms: UniformMap;

    constructor(renderOptions: RenderOptions) {
        this.ctxAttr = {
            alpha: true,
            antialias: false,
            depth: true,
            stencil: true,
            premultipliedAlpha: true,
            preserveDrawingBuffer: false,
            ...renderOptions
        };

        this.vPMat = mat4.create();
        this.vPRasterMat = mat4.create();
        this.vMat = mat4.create();
        this.invVPMat = mat4.create();
        this.screenMat = mat4.create();
        this.invScreenMat = mat4.create();
        this._tmpMatrix = mat4.create();

        this.worldMatrix = new Float64Array(16);

        this.tilePreviewTransform = {
            m: mat4.create(),
            tx: 0,
            ty: 0,
            s: 0
        };
    }

    getContext(): WebGLRenderingContext {
        return this.gl;
    }


    setPass(pass: PASS) {
        // console.log(`------------------------ ${pass} pass ------------------------`);
        const {gl} = this;
        this.pass = pass;

        switch (pass) {
        case PASS.OPAQUE:
            this.depthMask = true;
            this.depthFnc = gl.LESS;
            break;
        case PASS.ALPHA:
            // this.depthFnc = gl.LESS;
            // this.depthMask = true;
            this.depthFnc = gl.LEQUAL;
            this.depthMask = false;
            break;
        case PASS.POST_ALPHA:
            this.depthFnc = gl.EQUAL;
            this.depthMask = false;
            // make sure to clear complete stencil buffer is cleared
            gl.disable(gl.SCISSOR_TEST);
            // first alpha pass was used as depth only pass.
            gl.clear(gl.STENCIL_BUFFER_BIT);
        }
    }

    convertColor(color: string | Color.RGBA) {
        return toRGB(color);
    }

    setBackgroundColor(color: Color.RGBA) {
        this.gl?.clearColor(color[0], color[1], color[2], color[3] ?? 1.0);
    }

    setSkyColor(color: Color.RGBA | GradientTexture) {
        this.skyBuffer.addUniform('u_fill', color);
    }

    setScale(scale: number, sx: number, sy: number) {

    }

    setRotation(rz: number, rx: number) {
    }

    clear(clearColor?): void {
        const {gl} = this;

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        if (clearColor) {
            this.setBackgroundColor(clearColor);
        }
        gl.colorMask(true, true, true, true);
        gl.disable(gl.SCISSOR_TEST);
        gl.depthMask(true);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);

        this.reservedStencils.clear();
    }

    init(canvas: HTMLCanvasElement, devicePixelRation: number): void {
        this.dpr = devicePixelRation;

        const gl = <WebGLRenderingContext>canvas.getContext('webgl', this.ctxAttr);

        // @ts-ignore
        gl.dpr = devicePixelRation;


        this.startTime = Date.now();

        this.gl = gl;
        this.glExt = new GLExtensions(gl, [
            EXTENSION_OES_ELEMENT_INDEX_UINT,
            EXTENSION_ANGLE_INSTANCED_ARRAYS
        ]);

        this.initContext();

        const stencilTile = createStencilTileBuffer(1, gl);
        stencilTile.pass = PASS.OPAQUE | PASS.ALPHA;
        // need to be set to enable stencil test in program init.
        stencilTile.blend = true;
        // stencilTile.colorMask = {r: true, g: true, b: true, a: false};
        stencilTile.colorMask = {r: false, g: false, b: false, a: false};
        // stencilTile.depthMask = false;
        stencilTile.depthMask = false;

        this.stencilTile = stencilTile;

        this.depthBufferSize = 1 << gl.getParameter(gl.DEPTH_BITS);

        const programConfig = this.programConfig = {
            Rect: {program: RectProgram},
            Line: {program: LineProgram},
            DashedLine: {program: DashedLineProgram, default: false},
            Text: {program: TextProgram},
            Image: {program: ImageProgram},
            Circle: {program: CircleProgram},
            Polygon: {program: PolygonProgram},
            Extrude: {program: ExtrudeProgram, default: false},
            Icon: {program: IconProgram},
            Box: {program: BoxProgram, default: false},
            Sphere: {program: SphereProgram, default: false},
            Model: {program: ModelProgram, default: false},
            Heatmap: {program: HeatmapProgram, default: false},
            Sky: {program: SkyProgram}
        };

        this.programs = {};

        for (let program in programConfig) {
            const cfg = programConfig[program];
            if (cfg.default === false) continue;
            this.createProgram(program, cfg.program);
        }
    }

    private createProgram(name: string, Prog: typeof Program, macros?): Program {
        const {gl, programs, dpr} = this;

        if (programs[name]) {
            programs[name].delete();
        }

        const program = programs[name] = new Prog(gl, dpr, macros);

        program.init(
            this.buffers,
            this.glExt.getExtension(EXTENSION_ANGLE_INSTANCED_ARRAYS)
        );

        return program;
    }


    private initContext() {
        const {gl} = this;
        // gl.frontFace(gl.CW);
        gl.enable(gl.CULL_FACE);
        gl.cullFace(gl.FRONT);
        gl.enable(gl.DEPTH_TEST);
        gl.enable(gl.SCISSOR_TEST);
        // gl.enable(gl.BLEND);
        // gl.enable(gl.DEPTH_TEST);
        // gl.depthFunc(gl.LESS);
        gl.clearStencil(0);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        // gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        // gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    }

    grid(show: boolean | { grid3d: boolean }): void {
        if (typeof show == 'object') {
            if (show.grid3d != undefined) {
                this.createProgram('Model', ModelProgram, show.grid3d && {DBG_GRID: 1});
            }
        } else {
            this.tileGrid = show;
        }
    }

    applyTransform() {

    }

    updateMapGridMatrix(pitch: number, width, height) {
        const centerX = width / 2;
        const centerY = height / 2;
        const targetZ = centerY / Math.tan(FIELD_OF_VIEW / 2);
        const prjMat = this._tmpMatrix;
        const cam = [centerX, centerY, -targetZ];

        mat4.perspective(prjMat, FIELD_OF_VIEW, width / height, 0.1, 1e5);
        this.updateVPMatrix(prjMat, cam, pitch, 0, [1, 1, 1]);
        return prjMat;
    }

    private _tm = new Float32Array(16);

    private updateVPMatrix(
        prjMatrix: Float32Array | Float64Array,
        cam: number[],
        rotX: number,
        rotZ: number,
        scale: number[],
        viewMatrix: Float32Array | Float64Array = this._tm
    ): Float32Array | Float64Array {
        // const cam = [cx, cy, -targetZ];
        const [cx, cy] = cam;
        mat4.lookAt(viewMatrix, cam, [cx, cy, 0], [0, -1, 0]);
        mat4.translate(viewMatrix, viewMatrix, [cx, cy, 0]);
        mat4.rotateX(viewMatrix, viewMatrix, -rotX);
        mat4.rotateZ(viewMatrix, viewMatrix, rotZ);
        mat4.scale(viewMatrix, viewMatrix, scale);
        mat4.translate(viewMatrix, viewMatrix, [-cx, -cy, 0]);
        return mat4.multiply(prjMatrix, prjMatrix, viewMatrix);
    }


    initView(
        pixelWidth: number,
        pixelHeight: number,
        scale: number,
        rotX: number, // pitch
        rotZ: number,
        groundRes: number,
        worldCenterX: number,
        worldCenterY: number,
        worldSize: number
    ) {
        const viewPrjMatrix = this.vPMat;
        const viewMatrix = this.vMat;
        this.zMeterToPixel = 1 / groundRes;
        // Calculating zFar based on pitch and hFOV when map is "overpitched".
        // The tile grid is clipped at MAX_PITCH_GRID, but the view can be pitched further.
        // The calculations ensure that zFar adapts based on the pitch, maintaining view stability.
        //                                       alpha)
        //                                    . ´   |
        //                                . ´     .°|
        //                            . ´       .°  |
        //                        . ´         .°    |
        //                 d2 . ´           .°      |
        //                 .´ |           .°        |
        //           d1 .´\*) | hPH     .° k        |
        //           .´    \  |       .°            |
        //        .´      h \ | rX).°               |
        //    . ´            \| .°                (*|
        // hFov) -------------|---------------------|
        // <--   targetZ   --> <-- farPlaneOffset -->
        // <--               zFar                 -->

        const halfVFOV = FIELD_OF_VIEW * .5;
        const centerPixelX = pixelWidth * .5;
        // hPH
        const centerPixelY = pixelHeight * .5;
        // one texel equals one pixel
        // Calculate base zFar as if the map were flat
        const targetZ = centerPixelY / Math.tan(halfVFOV);
        const h = Math.sin(halfVFOV) * targetZ;

        const maxGridPitch = Math.min(rotX, MAX_PITCH_GRID);
        const alpha = Math.PI * .5 - halfVFOV - maxGridPitch;
        // const d1 = Math.cos(halfVFOV) * targetZ;
        // const d2 = h / Math.tan(alpha);
        // const zFar = Math.sin(Math.PI/2 - hFOV) * (d1+d2);
        // const zFar = Math.cos(halfVFOV) * (d1 + d2);
        // const farPlaneOffset = Math.sin(pitch) * h / Math.sin(alpha);
        // const zFar = targetZ + farPlaneOffset;
        // calculate far plane offset based on pitch angle and adjust if pitch exceeds MAX_PITCH_GRID limit
        const farPlaneOffsetAngle = rotX > maxGridPitch
            ? Math.cos(Math.PI / 2 - rotX)
            : Math.sin(maxGridPitch);
        // calculate k based on pitch up to MAX_PITCH_GRID.
        const k = h / Math.sin(alpha);
        const farPlaneOffset = farPlaneOffsetAngle * k;
        let zFar = targetZ + farPlaneOffset;
        // Small buffer to avoid precision issues
        zFar *= 1.005;

        this.rz = (rotZ + PI2) % PI2;
        this.rx = rotX;
        this.scale = scale;

        this.gl.viewport(0, 0, pixelWidth * this.dpr, pixelHeight * this.dpr);

        const zNear = pixelHeight / 100;

        mat4.perspective(viewPrjMatrix, FIELD_OF_VIEW, pixelWidth / pixelHeight, zNear, zFar);

        // let worldMatrix = mat4.copy(this.worldMatrix, projectionMatrix);
        // mat4.scale(worldMatrix, worldMatrix, [1, -1, 1]);
        // mat4.translate(worldMatrix, worldMatrix, [0, 0, -targetZ]);
        // mat4.rotateX(worldMatrix, worldMatrix, rotX);
        // mat4.rotateZ(worldMatrix, worldMatrix, rotZ);
        // mat4.scale(worldMatrix, worldMatrix, [worldSize, worldSize, worldSize]);
        // mat4.translate(worldMatrix, worldMatrix, [-worldCenterX, -worldCenterY, 0]);
        this.worldMatrix.set(viewPrjMatrix);
        this.updateVPMatrix(this.worldMatrix, [worldCenterX, worldCenterY, -targetZ], rotX, rotZ,
            [worldSize, worldSize, -worldSize]
        );
        // const cam = [centerPixelX, centerPixelY, -targetZ];
        // mat4.lookAt(viewMatrix, cam, [centerPixelX, centerPixelY, 0], [0, -1, 0]);
        // mat4.translate(viewMatrix, viewMatrix, [centerPixelX, centerPixelY, 0]);
        // mat4.rotateX(viewMatrix, viewMatrix, -rotX);
        // mat4.rotateZ(viewMatrix, viewMatrix, rotZ);
        // mat4.scale(viewMatrix, viewMatrix, [scale, scale, scale / groundRes]); // scale z axis to meter/pixel
        // mat4.translate(viewMatrix, viewMatrix, [-centerPixelX, -centerPixelY, 0]);
        // mat4.multiply(projectionMatrix, projectionMatrix, viewMatrix);
        this.updateVPMatrix(viewPrjMatrix, [centerPixelX, centerPixelY, -targetZ], rotX, rotZ,
            [scale, scale, scale / groundRes],
            viewMatrix
        );

        invert(this.invVPMat, viewPrjMatrix);

        // convert from clipspace to screen.
        let screenMatrix = mat4.identity(this.screenMat);
        mat4.scale(screenMatrix, screenMatrix, [centerPixelX, -centerPixelY, 1]);
        mat4.translate(screenMatrix, screenMatrix, [1, -1, 0]);
        mat4.multiply(screenMatrix, screenMatrix, this.vPMat);

        invert(this.invScreenMat, screenMatrix);

        // update camera's world position
        const {cameraWorld} = this;
        cameraWorld[0] = 0;
        cameraWorld[1] = 0;
        cameraWorld[2] = -1;
        transformMat4(cameraWorld, cameraWorld, this.invVPMat);
        // The Z-axis is scaled to meters per pixel, leading to a non-uniform coordinate system.
        // To maintain consistent specular highlight sizes,
        // we scale Z by zMeterToPixel to compensate for ground resolution scaling, ensuring a uniform coordinate system.
        cameraWorld[2] *= this.zMeterToPixel;

        // pixel perfect matrix used for crisper raster graphics, icons/text/raster-tiles
        // rounding in shader leads to precision issues and tiles edges become visible when the map is scaled.
        const pixelPerfectMatrix = mat4.copy(this.vPRasterMat, viewPrjMatrix);
        const worldCenterPixelX = worldCenterX * worldSize;
        const worldCenterPixelY = worldCenterY * worldSize;
        const dx = worldCenterPixelX - Math.round(worldCenterPixelX) + centerPixelX % 1;
        const dy = worldCenterPixelY - Math.round(worldCenterPixelY) + centerPixelY % 1;
        mat4.translate(pixelPerfectMatrix, pixelPerfectMatrix, [dx - Math.round(dx), dy - Math.round(dy), 0]);

        // used for debug only...
        // let s05 = mat4.clone(this.vPMat);
        // mat4.translate(s05, s05, [centerPixelX, centerPixelY, 0]);
        // mat4.scale(s05, s05, [.5, .5, .5]);
        // mat4.translate(s05, s05, [-centerPixelX, -centerPixelY, 0]);
        // this.vPMat = s05;

        this.distanceCam2Center = 0.5 / Math.tan(halfVFOV) * pixelHeight;

        this.setResolution(pixelWidth, pixelHeight);

        this.initSharedUniforms();

        this.initDisplayUniforms();

        // clear tile preview matrix cache
        this.tilePreviewTransform.tx = null;
        this.tilePreviewTransform.ty = null;
        this.tilePreviewTransform.s = null;
    }

    private initDisplayUniforms() {
        const {viewUniforms} = this;
        viewUniforms.rz = this.rz;
        viewUniforms.elapsedTime = (Date.now() - this.startTime) / 1000.0;
        viewUniforms.inverseMatrix = this.invVPMat;
        viewUniforms.fixedView = this.fixedView;
    }


    private initSharedUniforms() {
        this.sharedUniforms = {
            'u_resolution': this.resolution,
            'u_scale': null, // this.scale * dZoom,
            'u_topLeft': [0, 0],
            'u_matrix': this.vPMat,
            'u_zMeterToPixel': null, // this.zMeterToPixel / dZoom,
            'u_camWorld': this.cameraWorld
        };
    }

    private prog: Program;

    useProgram(prog: Program): boolean {
        const activeProgam = this.prog;

        if (activeProgam != prog) {
            const gl = this.gl;

            if (activeProgam) {
                // disable bound Attributes from previous program.
                activeProgam.disableAttributes();
            }

            gl.useProgram(prog.prog);
            this.prog = prog;
            return true;
        }
        return false;
    }

    drawGrid(x: number, y: number, dTile: GLTile, tileSize: number) {
        this.dbgTile.uniforms.u_tileScale = tileSize;
        this.dbgTile.clearUniformCache();

        this.drawBuffer(this.dbgTile, x, y, null, null);

        let textBuffer: GeometryBuffer = this.gridTextBuf.get(dTile);

        if (!textBuffer) {
            textBuffer = createGridTextBuffer(dTile.quadkey, this.gl, DEBUG_GRID_FONT);

            this.gridTextBuf.set(dTile, textBuffer);
        }

        this.drawBuffer(textBuffer, x + 4, y + 4);
    }

    deleteBuffer(buffer: GeometryBuffer) {
        const {buffers, gl} = this;
        let {attributes, uniforms} = buffer;

        for (let name in uniforms) {
            let uniform = <Texture>uniforms[name];
            // if (uniform instanceof Texture) {
            if (uniform.format) {
                let refCounter = uniform.ref = (uniform.ref || 1) - 1;
                if (refCounter === 0) {
                    (uniform as Texture).destroy();
                }
            }
        }

        for (let name in attributes) {
            let attr = <Attribute>attributes[name];
            let refCounter = attr.ref = (attr.ref || 1) - 1;
            if (refCounter === 0) {
                let glBuffer = buffers.get(<Attribute>attr);
                gl.deleteBuffer(glBuffer);
            }
        }

        for (let grp of buffer.groups) {
            const index = (<IndexGrp>grp).index;
            if (index) {
                gl.deleteBuffer(buffers.get(index));
            }
        }

        buffer.destroy(buffer);
    }


    // initGroundDepth(x: number, y: number, tileScale?: number
    // ) {
    //     const gl = this.gl;
    //     const buffer = this.stencilTile;
    //     let program = this.programs[buffer.type];
    //
    //     let bufAttributes = buffer.getAttributes();
    //     program.initBuffers(bufAttributes);
    //
    //     this.useProgram(program);
    //
    //     gl.depthRange(0, 1.0);
    //
    //     gl.depthMask(true);
    //     gl.disable(gl.STENCIL_TEST);
    //     gl.disable(gl.SCISSOR_TEST);
    //     gl.enable(gl.DEPTH_TEST);
    //
    //     program.initAttributes(bufAttributes);
    //     program.initUniforms(buffer.uniforms);
    //
    //     const uLocation = program.uniforms;
    //
    //     gl.uniform2f(uLocation.u_topLeft, x, y);
    //     gl.uniform1f(uLocation.u_tileScale, tileScale || 1);
    //     gl.uniformMatrix4fv(uLocation.u_matrix, false, this.vPMat);
    //
    //     gl.clear(gl.DEPTH_BUFFER_BIT);
    //     gl.depthFunc(gl.ALWAYS);
    //     // gl.polygonOffset(1, 1);
    //     // gl.enable(gl.POLYGON_OFFSET_FILL);
    //     gl.colorMask(false, false, false, false);
    //     program.draw(buffer);
    //     gl.colorMask(true, true, true, false);
    //     // gl.disable(gl.POLYGON_OFFSET_FILL);
    //     gl.depthFunc(this.depthFnc);
    // }

    private initProgram(
        program: Program,
        buffer: GeometryBuffer,
        renderPass: PASS,
        uniforms: UniformMap = buffer.getUniformData()
    ) {
        const bufAttributes = buffer.getAttributes();
        this.useProgram(program);
        program.setResolution(this.resolution);
        program.initBuffers(bufAttributes);

        program.initGeometryBuffer(buffer, renderPass, this.zIndex);
        program.initAttributes(bufAttributes);

        program.initUniforms(this.sharedUniforms);
        program.initViewUniforms(this.viewUniforms);

        if (buffer.light && this.bufferLightUniforms) {
            program.initUniforms(this.bufferLightUniforms);
        }

        program.initUniforms(uniforms);
    }

    private drawBuffer(
        buffer: GeometryBuffer,
        x: number,
        y: number,
        pMat?: Float32Array,
        dZoom?: number,
        forceStencil?: boolean
    ): void {
        const {gl, pass} = this;
        const program: Program = this.getProgram(buffer);

        if (program) {
            dZoom = dZoom || 1;

            const zIndex = this.zIndex;
            const isOnTopOf3d = (buffer.flat && zIndex > this.min3dZIndex);
            let executePass = program.initPass(pass, buffer);

            if (isOnTopOf3d && buffer.pass == PASS.OPAQUE) {
                // opaque flat geometry that is on top of 3d must be drawn in alpha pass.
                executePass = pass == PASS.ALPHA;
            }

            if (executePass) {
                const compiledUniforms = buffer.compileUniforms();
                if (!program.isBufferVisible(compiledUniforms.uniforms)) {
                    return;
                }
                // initialize shared uniforms
                const {sharedUniforms} = this;
                sharedUniforms.u_scale = this.scale * dZoom;
                sharedUniforms.u_matrix = pMat || (buffer.pixelPerfect ? this.vPRasterMat : this.vPMat);
                sharedUniforms.u_zMeterToPixel = this.zMeterToPixel / dZoom;

                // must be set at render time
                this.viewUniforms.fixedView = this.fixedView;

                const uses2PassAlpha = buffer.needs2AlphaPasses();
                let stencilRefVal = null;

                if (
                    // (!uses2PassAlpha || pass != PASS.POST_ALPHA) &&
                    forceStencil || (buffer.clip && buffer.isFlat())
                ) {
                    stencilRefVal = this.drawStencil(x, y, dZoom, pMat);
                }

                // initialise pass default
                let {depthFnc, depthMask} = this;
                let colorMask = GLRender.DEFAULT_COLOR_MASK;

                if (uses2PassAlpha) {
                    if (pass == PASS.ALPHA) {
                        colorMask = GLRender.NO_COLOR_MASK;
                        depthMask = true;
                    } else if (pass == PASS.POST_ALPHA) {
                        // use stencil to prevent geometry overlaps across tile edges
                        if (stencilRefVal != null) {
                            // flat geom
                            gl.stencilFunc(gl.EQUAL, stencilRefVal, 0xff);
                            gl.stencilOp(gl.KEEP, gl.KEEP, gl.KEEP);
                            // gl.stencilOp(gl.KEEP, gl.KEEP, gl.DECR);
                        } else {
                            // 3d geom
                            // gl.stencilFunc(gl.NOTEQUAL, 0, 0xff);
                            // gl.stencilOp(gl.KEEP, gl.KEEP, gl.REPLACE);
                            gl.stencilFunc(gl.EQUAL, 0, 0xff);
                            gl.stencilOp(gl.KEEP, gl.KEEP, gl.INCR);
                            gl.enable(gl.STENCIL_TEST);
                            // stencilTest = true;
                        }
                    }
                }

                gl.depthFunc(depthFnc);
                gl.depthMask(depthMask);

                program.setColorMask(colorMask);

                // must be set after stenciling...
                sharedUniforms.u_topLeft[0] = x;
                sharedUniforms.u_topLeft[1] = y;


                const depth = (65535 - zIndex) / 65536;
                // const depth = 1 - (1 + zIndex) / (1 << 16);
                gl.depthRange(buffer.flat ? depth : 0, depth);

                this.initProgram(program, buffer, pass);

                if (uses2PassAlpha) {
                    // 2 pass alpha requires stencil usage. otherwise only needed when buffer scissors.
                    if (pass == PASS.POST_ALPHA) {
                        // enable stencil test in any case...
                        // flat geometry uses tile clipping stencil...
                        // 3d uses stencil to prevent overlaps
                        gl.enable(gl.STENCIL_TEST);
                    }
                }

                if (isOnTopOf3d) {
                    gl.disable(gl.DEPTH_TEST);
                }

                program.draw(buffer);
            }
        } else console.warn('no program found', buffer.type);
    }

    private stencilVal: number;
    private stencilSize: number;
    private tileStencils: number[][];
    private reservedStencils = new Map<number, number>();

    private initStencil(refValue: number, tileSize: number, subStencils: number[][] = FULL_TILE_STENCIL) {
        this.stencilVal = refValue;
        this.stencilSize = tileSize;
        this.tileStencils = subStencils;
    };

    private reserveStencilValue(id: number): number {
        const {reservedStencils} = this;
        let refVal = reservedStencils.get(id);
        if (!refVal) {
            refVal = reservedStencils.size + 1;
            if (refVal > 255) {
                refVal = 1;
                reservedStencils.clear();
                this.gl.clear(this.gl.STENCIL_BUFFER_BIT);
            }
            reservedStencils.set(id, refVal);
        }
        return refVal;
    }

    private drawStencil(x: number, y: number, scale: number/* , snapGrid: boolean*/, pMat) {
        // return this.gl.stencilFunc(this.gl.ALWAYS, 0, 0);
        const {gl, stencilTile, sharedUniforms} = this;
        const program: Program = this.getProgram(stencilTile);
        const tileStencilId = scale * 16777216 + this.stencilVal;
        const refVal = this.reserveStencilValue(tileStencilId);

        gl.stencilFunc(gl.ALWAYS, refVal, 0xff);
        gl.stencilOp(gl.REPLACE, gl.REPLACE, gl.REPLACE);
        // stencilTile.colorMask = {r: true, g: true, b: true, a: true};
        // stencilTile.uniforms.u_color = [1, 0, 1, 1];

        for (let position of this.tileStencils) {
            sharedUniforms.u_topLeft[0] = x + position[0] * this.stencilSize;
            sharedUniforms.u_topLeft[1] = y + position[1] * this.stencilSize;
            stencilTile.uniforms.u_tileScale = this.stencilSize * position[2];

            this.initProgram(program, stencilTile, this.pass, stencilTile.uniforms);

            gl.enable(gl.STENCIL_TEST);
            program.draw(stencilTile);
        }
        gl.stencilFunc(gl.EQUAL, refVal, 0xff);
        gl.stencilOp(gl.KEEP, gl.KEEP, gl.KEEP);

        return refVal;
    }

    private initScissor(x: number, y: number, size: number, matrix: Float32Array) {
        // return this.gl.scissor(0, 0, this.gl.canvas.width, this.gl.canvas.height);
        const {gl} = this;
        const w = gl.canvas.width;
        const h = gl.canvas.height;

        if (this.scale > 4.0 // workaround: precision issues for 22+ zooms -> disable scissor
            || -this.rx > MAX_PITCH_SCISSOR // high pitch, part of tile is "behind" the cam, plane "flips" -> skip scissor.
        ) {
            return [0, 0, w, h];
        }

        const x2 = x + size;
        const y2 = y + size;
        const lowerLeft = [x, y2, 0];
        const lowerRight = [x2, y2, 0];
        const upperLeft = [x, y, 0];
        const upperRight = [x2, y, 0];

        let xmin = Infinity;
        let xmax = -xmin;
        let ymin = xmin;
        let ymax = xmax;

        for (let p of [lowerLeft, lowerRight, upperLeft, upperRight]) {
            let [x, y] = transformMat4(p, p, matrix);
            if (x < xmin) xmin = x;
            if (x > xmax) xmax = x;
            if (y < ymin) ymin = y;
            if (y > ymax) ymax = y;
        }
        // clip to screen
        xmin = Math.round((xmin + 1) * .5 * w);
        xmax = Math.round((xmax + 1) * .5 * w);
        ymin = Math.round((ymin + 1) * .5 * h);
        ymax = Math.round((ymax + 1) * .5 * h);
        //
        // xmin = ((xmin + 1) * .5 * w);
        // xmax = ((xmax + 1) * .5 * w);
        // ymin = ((ymin + 1) * .5 * h);
        // ymax = ((ymax + 1) * .5 * h);

        const sw = xmax - xmin;
        const sh = ymax - ymin;
        // this.stencilSize = Math.max(sw, sh);
        return [xmin, ymin, sw, sh];
    }


    initBufferScissorBox(buffer: GeometryBuffer, screenTile: ViewportTile, preview?: TileBufferData['data']['preview']) {
        if (buffer.clip) {
            let tileSize = screenTile.size;
            let {x, y, tile} = screenTile;
            let matrix = this.vPMat;

            if (preview) {
                const [previewQuadkey, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight] = preview;
                const scale = dWidth / sWidth;
                x += dx;
                y += dy;
                tileSize *= scale;
                // const dZoom = Math.pow(2, tile.quadkey.length - previewQuadkey.length);
                // const px = dx / scale - sx;
                // const py = dy / scale - sy;
                // const previewTransformMatrix = this.initPreviewMatrix(x, y, scale);
                // if (buffer.scissor) {
                // this.initScissor(x + dx, y + dy, tileSize * scale, this.vPMat);
                // // this.initScissor(x - sx * scale, y - sy * scale, dWidth * scale, this.vPMat);
                // // this.initScissor(px, py, tileSize, previewTransformMatrix);
                // }
            }
            buffer.scissorBox = this.initScissor(x, y, tileSize, matrix);
        } else {
            buffer.scissorBox = null;
        }
    }

    draw(bufferData: TileBufferData, min3dZIndex: number): void {
        const screenTile = bufferData.data.tile;
        const dTile = <GLTile>screenTile.tile;
        const {layer, b: buffer} = bufferData;
        const {preview} = bufferData.data;
        let {x, y, scaledSize} = screenTile;
        const {tileSize} = layer;
        const distanceScale = scaledSize / tileSize;

        this.zIndex = bufferData.z;
        this.min3dZIndex = min3dZIndex;

        this.bufferLightUniforms = buffer.light ? this.processedLight[layer.index][buffer.light] : null;

        // make sure to reset stencil
        this.stencilVal = null;
        if (preview) {
            // (screenTile.preview ||= new Map()).set(buffer, preview);
            const [previewQuadkey, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight] = preview;
            const previewScale = dWidth / sWidth;
            const previewTransformMatrix = this.initPreviewMatrix(
                x + (dx - sx * previewScale) * distanceScale,
                y + (dy - sy * previewScale) * distanceScale,
                previewScale * distanceScale,
                buffer.pixelPerfect
            );

            const {clip} = buffer;
            let clipPreview = false;
            if (previewScale > 1 && !buffer.needs2AlphaPasses()) {
                // Already clipped geometry is stenciled to match the dimensions of smaller preview tiles accurately when zoomed in.
                clipPreview = buffer.clip = true;
            }

            this.initStencil(dTile.i, tileSize, bufferData.data.stencils);

            this.drawBuffer(buffer, 0, 0, previewTransformMatrix, distanceScale * previewScale,
                // Ensure clipped geometry is stenciled when required
                clipPreview
            );

            buffer.clip = clip;
        } else {
            let previewTransformMatrix;
            if (distanceScale > 1) {
                previewTransformMatrix = this.initPreviewMatrix(x, y, distanceScale, buffer.pixelPerfect);
                x = 0;
                y = 0;
            }
            this.initStencil(dTile.i, tileSize);
            this.drawBuffer(buffer, x, y, previewTransformMatrix, distanceScale);
        }
    }


    drawSky(horizonY: number, height: number, maxHorizonY: number) {
        if (!horizonY) return; // sky is not visible

        this.zIndex = 0; // min3dZ

        const {skyBuffer} = this;
        const horizon = skyBuffer.getUniform('u_horizon');
        horizon[0] = 2 * horizonY / height;
        horizon[1] = 2 * maxHorizonY; // pitch:85 (->) 0.4198
        // make sure uniforms are being updated...
        skyBuffer.clearUniformCache();

        this.drawBuffer(skyBuffer, 0, 0, this.skyMatrix);
    }

    private initPreviewMatrix(tx: number, ty: number, s: number, pixelPerfect?: boolean): Float32Array {
        const {tilePreviewTransform} = this;
        const {m} = tilePreviewTransform;
        if (
            tilePreviewTransform.tx != tx ||
            tilePreviewTransform.ty != ty ||
            tilePreviewTransform.s != s
        ) {
            mat4.copy(m, pixelPerfect ? this.vPRasterMat : this.vPMat);
            mat4.translate(m, m, [tx, ty, 0]);
            mat4.scale(m, m, [s, s, 1]);

            tilePreviewTransform.tx = tx;
            tilePreviewTransform.ty = ty;
            tilePreviewTransform.s = s;
        }
        return m;
    }

    destroy(): void {
    }

    prepare(INSTRUCTIONS: any, tile: Tile, layer: TileLayer, display: any, dTile: BasicTile, cb: () => void): void {
    }

    drawCustom(layer: CustomLayer, zIndex: number) {
        const render = this;
        const {gl} = render;

        render.prog = null;

        const zFar = (65535 - zIndex) / 65536;
        const zNear = layer.renderOptions.mode == '3d' ? 0 : zFar;

        gl.depthRange(zNear, zFar);
        gl.disable(gl.SCISSOR_TEST);
        gl.disable(gl.STENCIL_TEST);

        layer.render(gl, render.worldMatrix);

        // make sure vao gets unbound in case of being used to prevent possible side effects
        this.glExt.getExtension('OES_vertex_array_object')?.bindVertexArrayOES(null);

        // make sure canvas framebuffer is used
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        this.initContext();
    }

    private getProgram(buffer: GeometryBuffer) {
        let id = buffer.progId;
        const type = buffer.type;

        if (!id) {
            const Program = this.programConfig[type].program;
            id = buffer.progId = Program.getProgramId(buffer, Program.getMacros(buffer));
        }

        let prog = this.programs[id];

        if (prog === undefined) {
            const Program = this.programConfig[type].program;
            if (Program) {
                prog = this.createProgram(id, Program, Program.getMacros(buffer));
            }
        }

        return prog;
    }

    private setResolution(width: number, height: number) {
        const {resolution} = this;
        // if (resolution[0] != width || resolution[1] != height) {
        resolution[0] = width;
        resolution[1] = height;
        // }
    }
}
