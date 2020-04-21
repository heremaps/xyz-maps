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

import BasicRender from '../BasicRender';
import {layers} from '@here/xyz-maps-core';
import GLTile from './GLTile';
import {IconManager} from './IconManager';
import {toRGB} from './color';

import RectProgram from './program/Rect';
import CircleProgram from './program/Circle';
import LineProgram from './program/Line';
import DashedLineProgram from './program/DashedLine';
import PolygonProgram from './program/Polygon';
import ImageProgram from './program/Image';
import TextProgram from './program/Text';
import IconProgram from './program/Icon';
import ExtrudeProgram from './program/Extrude';
import Program from './program/Program';

import {createGridTextBuffer, createGridTileBuffer, createTileBuffer} from './buffer/debugTileBuffer';
import {GeometryBuffer} from './buffer/GeometryBuffer';

import Bucket from './Bucket';

import {transformMat4} from 'gl-matrix/vec3';
import {
    create,
    lookAt,
    multiply,
    perspective,
    rotateX,
    rotateZ,
    translate,
    scale,
    clone,
    invert,
    identity
} from 'gl-matrix/mat4';
import {Layer} from '../Layers';
import {GLStates} from './program/GLStates';

const mat4 = {create, lookAt, multiply, perspective, rotateX, rotateZ, translate, scale, clone, invert, identity};

type TileLayer = layers.TileLayer;
type Tile = any;


const FIELD_OF_VIEW = 45 * Math.PI / 180;

const unclip = (v, dim) => Math.round((v + 1) / 2.0 * dim);

const EXTENSION_OES_ELEMENT_INDEX_UINT = 'OES_element_index_uint';

const DEBUG_GRID_FONT = {
    font: 'bold 14px Arial',
    stroke: 'red',
    fill: 'white',
    strokeWidth: 3
    // textAlign : 'start',
    // textBaseline : 'alphabetic'
};

// const DEBUG_GRID_FONT = {fill:'#ff0000', stroke:'#ffff00', strokeWidth: 2 };

export type RenderOptions = WebGLContextAttributes;


export class GLRender implements BasicRender {
    icons: IconManager;
    private vMat: Float32Array; // view matrix
    private pMat: Float32Array; // projection matrix
    private invPMat: Float32Array; // inverse projection matrix
    screenMat: Float32Array;
    invScreenMat: Float32Array;
    private scale: number;
    private rz: number;
    private rx: number;
    private programs: { [name: string]: Program };
    private gridTextBuf = new WeakMap();
    private clearColor: string;
    private dLayer: Layer;

    tileGrid: boolean = false;
    tileSize: number = 256;

    private dpr: number; // devicePixelRatio
    private w: number;
    private h: number;

    private dbgTile = {
        256: createGridTileBuffer(256),
        512: createGridTileBuffer(512)
    };

    private stencilTile: GeometryBuffer;

    private depthFnc: GLenum;
    private pass: 'opaque' | 'alpha';

    buffers = new WeakMap();
    gl: WebGLRenderingContext;
    private ctxAttr: WebGLContextAttributes;

    constructor(renderOptions: RenderOptions) {
        this.ctxAttr = {
            alpha: true,
            antialias: false,
            depth: true,
            stencil: true,
            premultipliedAlpha: false,
            preserveDrawingBuffer: false,
            ...renderOptions
        };


        this.pMat = mat4.create();
        this.vMat = mat4.create();
        this.invPMat = mat4.create();
        this.screenMat = mat4.create();
        this.invScreenMat = mat4.create();

        const stencilTile = createTileBuffer(1);
        // will only draw in alpha pass!
        stencilTile.alpha = true; // this.pass == 'alpha';
        // need to be set to enable stencil test in program init.
        stencilTile.blend = true;
        this.stencilTile = stencilTile;
    }

    setPass(pass: 'opaque' | 'alpha') {
        // console.log(`-------- ${pass} pass --------`);
        const {gl} = this;
        this.pass = pass;

        this.depthFnc = pass == 'alpha'
            ? gl.LEQUAL // enable alpha blending within same z-level.
            : gl.LESS;
    }

    setBackgroundColor(color: string) {
        this.clearColor = color;

        if (this.gl) {
            const rgb = toRGB(color);
            this.gl.clearColor(rgb[0], rgb[1], rgb[2], 1.0);
        }
    }

    setScale(scale: number, sx: number, sy: number) {

    }

    setRotation(rz: number, rx: number) {
    }

    prepare(index: number, glTile: GLTile, tile: Tile, layer: TileLayer) {
        console.log('prepare!');
    }

    clear(): void {
        const {gl} = this;
        // gl.clearDepth(1.0);
        gl.colorMask(true, true, true, true);
        gl.disable(gl.SCISSOR_TEST);
        gl.depthMask(true);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);
        gl.colorMask(true, true, true, false);
    }

    init(canvas: HTMLCanvasElement, devicePixelRation: number): void {
        this.dpr = devicePixelRation;

        const gl = <WebGLRenderingContext>canvas.getContext('webgl', this.ctxAttr);

        // @ts-ignore
        gl.dpr = devicePixelRation;

        if (!gl.getExtension(EXTENSION_OES_ELEMENT_INDEX_UINT)) {
            console.warn(EXTENSION_OES_ELEMENT_INDEX_UINT + ' not supported!');
        }
        // gl.frontFace(gl.CCW);
        // gl.enable(gl.CULL_FACE);
        gl.cullFace(gl.FRONT);
        gl.enable(gl.DEPTH_TEST);
        gl.enable(gl.SCISSOR_TEST);
        // gl.enable(gl.BLEND);
        // gl.enable(gl.DEPTH_TEST);

        gl.clearStencil(0);

        const texUnits = gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS);

        this.icons = new IconManager(gl, texUnits - 2);

        this.programs = {
            Rect: new RectProgram(gl, devicePixelRation),
            Line: new LineProgram(gl, devicePixelRation),
            DashedLine: new DashedLineProgram(gl, devicePixelRation),
            Text: new TextProgram(gl, devicePixelRation),
            Image: new ImageProgram(gl, devicePixelRation),
            Circle: new CircleProgram(gl, devicePixelRation),
            Polygon: new PolygonProgram(gl, devicePixelRation),
            Extrude: new ExtrudeProgram(gl, devicePixelRation),
            Icon: new IconProgram(gl, devicePixelRation)
        };

        // gl.depthFunc(gl.LESS);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        // gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        // gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA)

        this.gl = gl;
        this.setBackgroundColor(this.clearColor);
    }

    grid(show: boolean): void {
        this.tileGrid = show;
    }

    applyTransform() {

    }

    initView(pixelWidth: number, pixelHeight: number, scale: number, rotX: number, rotZ: number) {
        const projectionMatrix = this.pMat;
        const viewMatrix = this.vMat;

        //                                . alpha°
        //                         d2 . ´     .°|
        //                        . ´       .°  |
        //                    . ´         .°    |
        //                 .´ |         .°      |
        //           d1 .´\   | hPH   .°        |
        //           .´    \  |     .°          |
        //        .´      h \ |rx°.°            |
        //    . ´            \| .°              |
        // hFov° -------------|-----------------|
        // <--   targetZ   -->
        // <--               zfar            -->

        const hFOV = FIELD_OF_VIEW * .5;
        const centerPixelX = pixelWidth * .5;
        // hPH
        const centerPixelY = pixelHeight * .5;
        // one texel equals one pixel
        const targetZ = centerPixelY / Math.tan(hFOV);
        const cosHFOV = Math.cos(hFOV);
        // h
        const height = Math.sin(hFOV) * targetZ;
        const alpha = Math.PI * .5 - hFOV + rotX;
        const d1 = cosHFOV * targetZ;
        const d2 = height / Math.tan(alpha);
        const zNear = targetZ * .25;
        let zFar = cosHFOV * (d1 + d2);
        // avoid precision issues...
        zFar *= 1.005;

        this.w = pixelWidth;
        this.h = pixelHeight;
        this.rz = rotZ;
        this.rx = rotX;
        this.scale = scale;

        this.gl.viewport(0, 0, pixelWidth * this.dpr, pixelHeight * this.dpr);

        mat4.perspective(projectionMatrix, FIELD_OF_VIEW, pixelWidth / pixelHeight, zNear, zFar);

        // {mat4} mat4.lookAt(out, eye, center, up)
        mat4.lookAt(viewMatrix, [centerPixelX, centerPixelY, -targetZ], [centerPixelX, centerPixelY, 0], [0, -1, 0]);
        mat4.translate(viewMatrix, viewMatrix, [centerPixelX, centerPixelY, 0]);
        mat4.rotateX(viewMatrix, viewMatrix, rotX);
        mat4.rotateZ(viewMatrix, viewMatrix, rotZ);
        mat4.scale(viewMatrix, viewMatrix, [scale, scale, scale]);
        mat4.translate(viewMatrix, viewMatrix, [-centerPixelX, -centerPixelY, 0]);

        mat4.multiply(projectionMatrix, projectionMatrix, viewMatrix);

        invert(this.invPMat, this.pMat);

        // convert from clipspace to screen.
        let screenMatrix = mat4.identity(this.screenMat);
        mat4.scale(screenMatrix, screenMatrix, [centerPixelX, -centerPixelY, 1]);
        mat4.translate(screenMatrix, screenMatrix, [1, -1, 0]);
        mat4.multiply(screenMatrix, screenMatrix, this.pMat);

        invert(this.invScreenMat, screenMatrix);

        // // used for debug only...
        // let s05 = mat4.clone(this.pMat);
        // mat4.translate(s05, s05, [centerPixelX, centerPixelY, 0]);
        // mat4.scale(s05, s05, [.5, .5,.5]);
        // mat4.translate(s05, s05, [-centerPixelX, -centerPixelY, 0]);
        // this.pMat = s05;
    }


    initBuffers(attributes) {
        const gl = this.gl;
        let attr;
        let buf;

        for (let name in attributes) {
            attr = attributes[name];
            buf = this.buffers.get(attr);

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

    private prog: Program;

    useProgram(prog): boolean {
        const activeProgam = this.prog;

        if (activeProgam != prog) {
            // prog.use();
            const gl = this.gl;

            if (activeProgam) {
                // disable bound Attributes from previous program.
                const activeAttributes = activeProgam.attributes;
                for (let name in activeAttributes) {
                    gl.disableVertexAttribArray(activeAttributes[name]);
                }
            }

            gl.useProgram(prog.prog);
            this.prog = prog;
            return true;
        }
        return false;
    }

    drawGrid(x: number, y: number, dTile: GLTile, tileSize: number | string) {
        const curPass = this.pass;

        this.pass = 'alpha';
        // this.pass = 'opaque';
        this.drawBuffer(this.dbgTile[tileSize], x, y, null, null); // , {depth: false, scissor: false});

        let textBuffer: GeometryBuffer = this.gridTextBuf.get(dTile);

        if (!textBuffer) {
            textBuffer = createGridTextBuffer(dTile.quadkey, this.gl, DEBUG_GRID_FONT);

            this.gridTextBuf.set(dTile, textBuffer);
        }

        // gl.enable(gl.BLEND);
        // gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        // gl.depthMask(false);
        // this.pass = 'alpha';
        this.drawBuffer(textBuffer, x + 4, y + 4);

        // reset pass
        this.pass = curPass;

        // gl.depthMask(true);
        // gl.disable(gl.BLEND);
        // gl.enable(gl.DEPTH_TEST);
    }

    deleteBuffer(buffer: GeometryBuffer) {
        const {buffers, gl} = this;
        const {attributes, texture, index} = buffer;

        if (texture) {
            texture.destroy();
        }

        for (let name in attributes) {
            let attr = attributes[name];
            let glBuffer = buffers.get(attr);
            gl.deleteBuffer(glBuffer);
        }

        if (index) {
            gl.deleteBuffer(buffers.get(index));
        }
    }

    private grpFilter: (group: GeometryBuffer) => boolean;

    setGroupFilter(filter?: (group: GeometryBuffer) => boolean) {
        this.grpFilter = filter;
    }

    private drawBuffer(buffer: GeometryBuffer, x: number, y: number, pMat?: Float32Array, dZoom?: number/* , customGLStates?*/, tileScale?: number): void {
        const gl = this.gl;
        const buffers = this.buffers;
        const renderLayer = this.dLayer;
        const renderPass = this.pass;

        let bufAttributes;
        let program: Program;
        let uLocation;

        program = this.programs[buffer.type];

        if (this.grpFilter && !this.grpFilter(buffer)) {
            return;
        }

        if (program) {
            let pass = program.pass(renderPass);

            if (buffer.alpha) {
                pass = renderPass == 'alpha';
                // customGLStates = customGLStates || {};
                // customGLStates.blend = true;
                // customGLStates.depth = true;
            }

            if (pass) {
                if (this.stencilVal && buffer.alpha) {
                    const refVal = this.stencilVal;
                    this.stencilVal = null;
                    this.drawStencil(refVal);
                }

                bufAttributes = buffer.getAttributes();
                this.initBuffers(bufAttributes);

                this.useProgram(program);
                // initialise pass default
                gl.depthFunc(this.depthFnc);

                program.init(<GLStates>buffer, renderPass,
                    // only use stencil when needed.. no need if map is untransformed
                    Boolean(this.rx || this.rz)
                );

                program.initAttributes(bufAttributes, buffers);

                program.initUniforms(buffer.uniforms);

                uLocation = program.uniforms;

                gl.uniform1f(uLocation.u_rotate, this.rz);
                gl.uniform2f(uLocation.u_resolution, this.w, this.h);
                gl.uniform1f(uLocation.u_zIndex, -.05 * renderLayer.getAbsoluteZ(buffer.zIndex));
                gl.uniform1f(uLocation.u_scale, this.scale * (dZoom || 1));
                gl.uniform1f(uLocation.u_scale, this.scale * (dZoom || 1));
                gl.uniform2f(uLocation.u_topLeft, x, y);
                gl.uniform1f(uLocation.u_tileScale, tileScale || 1);
                gl.uniformMatrix4fv(uLocation.u_matrix, false, pMat || this.pMat);

                program.draw(buffer, buffers);
            }
        }
        // else console.warn('no program found', group.type);
    }


    private stencilVal: number;
    private stencilSize: number;
    private stencilX: number;
    private stencilY: number;

    initStencil(refValue: number, x, y, tileSize: number) {
        this.stencilVal = refValue;
        this.stencilSize = tileSize;
        this.stencilX = x;
        this.stencilY = y;
    };

    drawStencil(refVal: number) {
        // return this.gl.stencilFunc(this.gl.ALWAYS, 0, 0);
        if (this.rx || this.rz) {
            const {gl, stencilTile} = this;
            const x = this.stencilX;
            const y = this.stencilY;

            gl.stencilFunc(gl.ALWAYS, refVal, 0xff);
            gl.stencilOp(gl.REPLACE, gl.REPLACE, gl.REPLACE);
            // disable color buffer
            gl.colorMask(false, false, false, false);

            const grpFilter = this.grpFilter;
            this.grpFilter = null;

            this.drawBuffer(stencilTile, x, y, null, null, this.stencilSize);

            this.grpFilter = grpFilter;
            gl.stencilFunc(gl.EQUAL, refVal, 0xff);
            gl.stencilOp(gl.KEEP, gl.KEEP, gl.KEEP);
            // enable color buffer again
            gl.colorMask(true, true, true, false);
        }
    }

    private initScissor(x: number, y: number, width: number, height: number) {
        const gl = this.gl;
        const buf = this.pass == 'opaque' ? .5 : 0;
        const x1 = x - buf;
        const x2 = x + width + buf;
        const y1 = y - buf;
        const y2 = y + height + buf;
        const lowerLeft = [x1, y2, 0];
        const lowerRight = [x2, y2, 0];
        const upperLeft = [x1, y1, 0];
        const upperRight = [x2, y1, 0];
        let xmin = Infinity;
        let xmax = -xmin;
        let ymin = xmin;
        let ymax = xmax;

        for (let p of [lowerLeft, lowerRight, upperLeft, upperRight]) {
            p = transformMat4([], p, this.pMat);
            let x = unclip(p[0], gl.canvas.width);
            let y = unclip(p[1], gl.canvas.height);
            if (x < xmin) xmin = x;
            if (x > xmax) xmax = x;
            if (y < ymin) ymin = y;
            if (y > ymax) ymax = y;
        }
        // set the scissor rectangle.
        gl.scissor(xmin, ymin, xmax - xmin, ymax - ymin);
    }

    layer(dTile: GLTile, x: number, y: number, renderLayer: Layer, tileBucket: Bucket): void {
        const data = dTile.data;
        const z = dTile.quadkey.length;
        const layerIndex = renderLayer.index;
        const tileSize = renderLayer.layer.tileSize;
        this.dLayer = renderLayer;

        let previewData;
        let buffers;
        let buffer;
        let qk;
        let previewTile;
        let previewBuffers;
        let prevScale;
        let tileScaleMatrix;
        let sx;
        let sy;
        let sWidth;
        let dx;
        let dy;
        let dWidth;
        let tScale;
        let scale;
        let dZoom;
        let px;
        let py;

        let scissored = false;
        let stenciled = false;


        if (buffers = data[layerIndex]) {
            const length = buffers.length - 1;
            const isAlphaPass = this.pass == 'alpha';

            for (let b = 0; b <= length; b++) {
                // in case of alpha pass reverse drawing order to allow alpha blending using depthfunc LEQUAL
                buffer = buffers[isAlphaPass ? length - b : b];

                if (!scissored) {
                    scissored = true;

                    this.initScissor(x, y, tileSize, tileSize);
                }

                if (!stenciled) {
                    this.initStencil(dTile.i, x, y, tileSize);
                    stenciled = true;
                }

                this.drawBuffer(buffer, x, y);
            }
        } else if (previewData = dTile.preview(layerIndex)) {
            if (previewData.length) {
                prevScale = 1;
                tileScaleMatrix = mat4.clone(this.pMat);
                mat4.translate(tileScaleMatrix, tileScaleMatrix, [x, y, 0]);
                // mat4.scale(tileScaleMatrix, tileScaleMatrix, [pScale, pScale, pScale]);

                for (let preview of previewData) {
                    qk = preview[0];
                    previewTile = tileBucket.get(qk, true /* SKIP TRACK*/);

                    if (previewTile) {
                        if (previewBuffers = previewTile.getData(layerIndex)) {
                            // let ordererd = this._test(previewBuffers);

                            sx = preview[1];
                            sy = preview[2];
                            sWidth = preview[3];
                            dx = preview[5];
                            dy = preview[6];
                            dWidth = preview[7];
                            tScale = dWidth / sWidth; // Math.pow(2, dTile.quadkey.length - qk.length);

                            // prevScale = prevScale || tScale;

                            scale = tScale / prevScale;
                            dZoom = Math.pow(2, z - qk.length);
                            px = dx / tScale - sx;
                            py = dy / tScale - sy;

                            mat4.scale(tileScaleMatrix, tileScaleMatrix, [scale, scale, scale]);
                            // mat4.scale(tileScaleMatrix, tileScaleMatrix, [1/scale, 1/scale, 1/scale]);
                            prevScale = tScale;

                            for (let buf of previewBuffers) {
                                this.initScissor(x + dx, y + dy, dWidth, dWidth);
                                // this.gl.scissor(0, 0, 4096, 4096);

                                // this.gl.stencilFunc(this.gl.ALWAYS, 0, 0);
                                // this.initStencil(px,py, tileSize, Math.random()*255 +1 ^0 );
                                // this.initStencil( px -  (x + dx), py - (y + dy), tileSize, previewTile.i, tileScaleMatrix);
                                // mat4.scale(tileScaleMatrix, tileScaleMatrix, [1, 1, 1]);
                                // this.initStencil(0,0, tileSize, Math.random()*255 +1 ^0, tileScaleMatrix );
                                // works for zoom in preview // this.initStencil(x, y, tileSize, dTile.i); //this.drawBuffer(buf, px, py, tileScaleMatrix, dZoom);
                                // this.initStencil(x,y, tileSize, dTile.i);

                                if (dZoom < 1) {
                                    // this.gl.clear(this.gl.STENCIL_BUFFER_BIT);
                                    this.initStencil(previewTile.i, x + dx, y + dy, tileSize * dZoom);
                                    // this.gl.stencilFunc(this.gl.ALWAYS, 0, 0);
                                } else if (!stenciled) {
                                    stenciled = true;
                                    this.initStencil(dTile.i, x, y, tileSize);
                                }

                                this.drawBuffer(buf, px, py, tileScaleMatrix, dZoom);
                            }
                        }
                    }
                }
            }
        }
    }

    destroy(): void {
        this.icons.destroy();
    }
}
