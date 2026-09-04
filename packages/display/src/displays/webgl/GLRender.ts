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
import {Color} from '@here/xyz-maps-common';
import {CustomLayer, Material, Tile, TileLayer} from '@here/xyz-maps-core';
import BasicRender from '../BasicRender';
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
import TerrainProgram from './program/Terrain';
import HeatmapProgram from './program/Heatmap';
import VerticalLineProgram from './program/VerticalLine';
import {createSkyBuffer, createSkyMatrix, SkyProgram} from './program/Sky';
import Program, {ColorMask, CompiledUniformMap} from './program/Program';
import {
    createGridTextBuffer,
    createGridTileBuffer,
    createStencilTileBuffer,
    StencilTileBuffer
} from './buffer/debugTileBuffer';
import {ElementsDrawCmd, GeometryBuffer, IndexData} from './buffer/GeometryBuffer';
import {DisplayTile} from '../BasicDisplay';
import {CustomRenderData, RenderData} from './Display';
import {GRID_PITCH_CLAMP, Z_INDEX_DEPTH_SLOTS} from './constants';
import {HeightMapTileCache} from './HeightMapTileCache';
import {logGLRenderState} from './glTools';

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
import {Texture} from './Texture';
import {FillTexture} from './FillTexture';
import {RenderTile, RenderTileTarget, ViewportTileData} from './RenderTile';
import {createViewUBO, UBO} from './UBO';
import {BlendFactor, ClearMask, DepthFunc, CullFace, GraphicsDevice} from './device/GraphicsDevice';
import {ScreenRenderTarget, IRenderTarget} from './RenderTarget';
import {PASS, RenderPass} from './RenderPass';
import {RenderTargetManager} from './RenderTargetManager';
import {tileUtils} from '@here/xyz-maps-core';
import {GridTile} from '../../Grid';

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
const FIELD_OF_VIEW = 40 * DEG_2_RAD;
// Calculates the critical pitch angle where the view frustum reaches its limit.
// Beyond this angle, the calculation for zFar becomes unstable or negative.
const CRITICAL_PITCH = Math.PI / 2 - Math.atan(Math.tan(FIELD_OF_VIEW / 2));

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

export type RenderOptions = WebGLContextAttributes & {
    useScreenDepthTexture?: boolean;
};

export type BufferCache = WeakMap<Attribute | IndexData, WebGLBuffer>;


export type ViewUniforms = {
    fixedView: number;
    rz: number;
    elapsedTime: number;
    inverseMatrix: Float32Array;
}


export interface ProgramContext {
    resolution: number[];
    // Program specific features
    features: {
        terrainColor?: Color.RGBA | null,
        terrainMaterial?: Material | null
    };
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
    // temp matrix used for matrix calculations.
    private _tmpMatrix: Float32Array;
    // dedicated buffer for reconstructing the camera from the inverse view matrix.
    // keeping it separate avoids aliasing with updateMapGridMatrix().
    private _invViewMatrix: Float32Array;

    private skyMatrix: Float32Array = createSkyMatrix();
    private skyBuffer: GeometryBuffer = createSkyBuffer();
    private sky: RenderTile = new RenderTile(this.skyBuffer, 0, {
        tile: new GridTile(0, 0, 0, 1, 1, 0, 0, [])
    }, this.skyBuffer.pass);

    screenMat: Float32Array;
    invScreenMat: Float32Array;
    // the z-plane height (in screen pixel units) at which unproject intersects.
    // with Camera Z-Compensation this is 0 (center at terrain maps to z=0).
    terrainUnprojectZ: number = 0;
    // the actual terrain pivot height in display pixels (for grid-bounds calculation)
    terrainPivotZPixels: number = 0;
    cameraWorld: Float64Array = new Float64Array(3);

    // used for local tile lighting, stores camera position in tile space,
    // accounting for tile scale (e.g. preview or LOD)
    private localCamera: Float64Array;

    // unscaled Z conversion: meters -> map pixels at current ground resolution. The render scale is applied separately.
    private zMeterToMapPixel: number;
    private scale: number;
    // correction factor for terrain-pivot zoom compensation.
    // When terrain pivot is active, the display zoom is increased to keep camera altitude
    // constant — but the camera-to-surface distance hasn't changed. Multiplying u_scale by
    // this factor ensures pixel-defined sizes (line widths, symbol sizes) stay visually
    // consistent regardless of the pivot-induced zoom adjustment.
    // Value: targetZ / (targetZ + terrainPivotZ), i.e. < 1 when pivot is active.
    private pivotScaleFactor: number = 1;
    private rz: number;
    private rx: number;
    // Compiled program variants per buffer type, indexed by the resolved macro mask.
    private programVariantsByType: { [name: string]: Map<number, Program> };
    private renderStateMacroMasks: { [name: string]: number } = {};
    private gridTextBuf = new WeakMap();
    // private dLayer: { z: number, z3d: number };
    // private min3dZIndex: number; // min zIndex containing 3d/extruded data
    tileGrid: boolean = false;
    // tileSize: number = 256;

    private dpr: number; // devicePixelRatio

    private dbgTile: { [tileSize: number]: GeometryBuffer } = {};
    private dbgRenderTile: {
        renderTile: RenderTile,
        vpData: ViewportTileData
    };
    private stencilTile: RenderTile;
    private depthFnc: GLenum;
    private depthMask: boolean;
    private readonly ctxAttr: WebGLContextAttributes;

    processedLight: { [lightSetName: string]: CompiledUniformMap }[] = [];

    private renderPass: RenderPass;
    pass: PASS;
    private buffers: BufferCache = new WeakMap();
    gl: WebGLRenderingContext;
    device: GraphicsDevice;

    zIndexLength: number;
    fixedView: number;

    private sharedUniforms: {
        u_resolution: number[];
        u_matrix: Float32Array;
        u_tile: [x: number, y: number, size: number, scale: number];
        u_scale: number;
        u_zMeterToPixel: number;
        u_exaggeration: number;
    };

    private programConfig: { [name: string]: { program: typeof Program, default?: boolean, macros?: any } };
    // private resolution: number[] = [];
    private mapContext: ProgramContext = {resolution: [], features: {}};

    private startTime: number;
    // Distance cam to center in pixel.
    // To convert to meters simply multiply with groundResolution.
    distanceCam2Center: number;

    private viewUniforms: ViewUniforms = {
        rz: 0,
        elapsedTime: 0,
        fixedView: 0,
        inverseMatrix: new Float32Array(16)
    };
    private bufferLightUniforms: CompiledUniformMap;
    private terrainHeightMapCache: HeightMapTileCache;
    private ubo: {
        view: UBO;
        lights: UBO
    };
    private screenRenderTarget: ScreenRenderTarget;
    private useScreenDepthTexture: boolean;

    private passes: Record<PASS, RenderPass>;
    private _stencilClearedForZIndex: number;
    private _stencilClearTarget: IRenderTarget | null;
    private rtManager: RenderTargetManager;

    // Per-frame lookup: terrain quadkey → required FBO pixel size.
    // Computed in Display.initLayerBuffers() based on zoom level delta.
    fboSizes: { [qk: string]: number } | null = null;
    // Per-frame lookup: terrain quadkey → rolling content hash of buffer UIDs.
    // Used by RenderTargetManager to skip re-rendering FBOs with unchanged content.
    fboContentHashes: { [qk: string]: number } | null = null;
    private terrainExaggeration: number = 1;

    // Frame draw call stats
    private _frameStats = {
        drawCalls: 0,
        offscreenDrawCalls: 0,
        offscreenSkipped: 0,
        screenDrawCalls: 0
    };
    dbgFrameStats: boolean = false;

    maxTextureSize: number;

    fovRad: number = FIELD_OF_VIEW;

    constructor(renderOptions: RenderOptions) {
        let {useScreenDepthTexture, ...contextOptions} = renderOptions || {};

        this.useScreenDepthTexture = !!(useScreenDepthTexture ?? 1);

        this.ctxAttr = {
            alpha: true,
            antialias: false,
            depth: true,
            stencil: true,
            premultipliedAlpha: true,
            preserveDrawingBuffer: false,
            ...contextOptions
        };


        this.ubo = {
            view: createViewUBO(0),
            // view: {
            //     data: new Float32Array(4*4 + 2),
            //     index: 0,
            //     buffer: null
            // },
            lights: {
                index: 1,
                buffer: null
            }
        };
        this.vPMat = this.ubo.view.data.subarray(0, 16);
        // this.vPMat = new Float32Array(16);
        this.vPRasterMat = mat4.create();
        this.vMat = mat4.create();
        this.invVPMat = mat4.create();
        this.screenMat = mat4.create();
        this.invScreenMat = mat4.create();
        this._tmpMatrix = mat4.create();
        this._invViewMatrix = mat4.create();

        this.worldMatrix = new Float64Array(16);

        this.localCamera = new Float64Array(3);
    }

    getContext(): WebGLRenderingContext {
        return this.gl;
    }


    setBackgroundColor(color: Color.RGBA) {
        // this.device?.setClearColor(color[0], color[1], color[2], color[3] ?? 1.0);
    }

    setSkyColor(color: Color.RGBA | FillTexture) {
        this.skyBuffer.addUniform('u_fill', color);
    }

    private setTerrainColor(terrainColor: Color.RGBA | null) {
        this.mapContext.features.terrainColor = terrainColor;
    }

    private setTerrainMaterial(terrainMaterial: Material | null) {
        this.mapContext.features.terrainMaterial = terrainMaterial;
    }

    private updateRenderStateMacroMasks() {
        for (const type in this.programConfig) {
            this.renderStateMacroMasks[type] = this.programConfig[type].program.getRenderMacroMask(
                this.mapContext,
                this.supportsTerrainOcclusion()
            );
        }
    }

    setScale(scale: number, sx: number, sy: number) {

    }

    setRotation(rz: number, rx: number) {
    }

    beginFrame(
        clearColor: Color.RGBA,
        terrainColor?: Color.RGBA,
        terrainExaggeration?: number,
        terrainMaterial?: Material
    ): void {
        this.terrainExaggeration = terrainExaggeration ?? 1;

        this._stencilClearedForZIndex = -1;
        this._stencilClearTarget = null;

        // Reset frame stats
        const s = this._frameStats;
        s.drawCalls = 0;
        s.offscreenDrawCalls = 0;
        s.offscreenSkipped = 0;
        s.screenDrawCalls = 0;

        this.screenRenderTarget.bind(this.device);
        this.screenRenderTarget.clear(this.device, clearColor);
        this.screenRenderTarget.beginFrame();

        this.setTerrainColor(terrainColor);
        this.setTerrainMaterial(terrainMaterial);
        this.updateRenderStateMacroMasks();

        this.reservedStencils.clear();

        this.rtManager.beginFrame();
    }

    endFrame() {
        this.screenRenderTarget.present(this.device);
        this.rtManager.endFrame();

        if (this.dbgFrameStats) {
            const s = this._frameStats;
            console.log(
                `[Frame] draws: ${s.drawCalls} | screen: ${s.screenDrawCalls} | offscreen: ${s.offscreenDrawCalls} | cached(skipped): ${s.offscreenSkipped}`
            );
        }
    }

    supportsTerrainOcclusion(): boolean {
        return this.screenRenderTarget?.hasDepthTextureTarget() === true;
    }

    captureTerrainDepth(): void {
        this.screenRenderTarget.captureDepth();
    }

    /**
     * Forces the terrain overlay FBOs to be rendered in the next frame.
     * Used after a fractional zoom settles so zoom-dependent styles are evaluated again.
     * @internal
     * @hidden
     */
    invalidateTerrainFBOs(): void {
        this.rtManager.invalidate();
    }

    init(canvas: HTMLCanvasElement, devicePixelRation: number, terrainHeightMapTextures: HeightMapTileCache): void {
        this.dpr = devicePixelRation;

        this.device = new GraphicsDevice(canvas, this.ctxAttr);
        const gl = this.device.gl;

        this.maxTextureSize = Math.min(4096, this.device.getMaxTexSize());

        this.rtManager = new RenderTargetManager(this.device, terrainHeightMapTextures);

        const useDepthTextureTarget = this.useScreenDepthTexture && this.device.supportsScreenDepthTexture;
        if (this.useScreenDepthTexture && !useDepthTextureTarget) {
            console.warn('Screen depth texture target is unsupported; using default framebuffer');
        }
        this.screenRenderTarget = new ScreenRenderTarget(this.device, useDepthTextureTarget);
        // @ts-ignore
        gl.dpr = devicePixelRation;

        this.startTime = Date.now();

        this.gl = gl;
        this.depthFnc = DepthFunc.LESS;

        this.passes = {
            [PASS.OPAQUE]: new RenderPass(PASS.OPAQUE, {
                renderTarget: this.screenRenderTarget,
                // viewport,
                state: {
                    depthTest: {
                        enabled: true,
                        func: gl.LESS,
                        write: true
                    },
                    blend: {enabled: false},
                    colorMask: [true, true, true, true]
                }
            }),
            [PASS.ALPHA_COLOR]: new RenderPass(PASS.ALPHA_COLOR, {
                renderTarget: this.screenRenderTarget,
                // viewport,
                state: {
                    depthTest: {
                        enabled: true,
                        // Default for alpha color rendering:
                        // LEQUAL allows standard single-pass alpha blending.
                        // For dual/overlap alpha, the depth function is overridden to EQUAL
                        // in the per-draw pass override to match the depth pre-pass exactly.
                        func: gl.LEQUAL,
                        write: false
                        // write: true
                    },
                    blend: {
                        enabled: true,
                        src: gl.ONE,
                        dst: gl.ONE_MINUS_SRC_ALPHA
                    },
                    colorMask: [true, true, true, true]
                    // Stencil is enabled; reference values and comparisons are supplied
                    // per draw via pass overrides (e.g. for tile clipping masks).
                    // stencil: {
                    //     enabled: true,
                    //     // func / ref / mask are set via per-draw overrides
                    //     func: {func: gl.EQUAL, ref: 0 /* tile-ID*/, mask: 0xff},
                    //     op: {fail: gl.KEEP, zfail: gl.KEEP, zpass: gl.KEEP}
                    // }

                }
            }),
            [PASS.ALPHA_DEPTH]: new RenderPass(PASS.ALPHA_DEPTH, {
                renderTarget: this.screenRenderTarget,
                // viewport,
                state: {
                    depthTest: {
                        enabled: true,
                        func: gl.LEQUAL,
                        write: true
                    },
                    blend: {enabled: false},
                    colorMask: [false, false, false, false],
                    stencil: {
                        enabled: true,
                        func: {func: gl.EQUAL, ref: 0 /* tile-stencil-id */, mask: 0xff},
                        op: {fail: gl.KEEP, zfail: gl.KEEP, zpass: gl.KEEP}
                    }
                    // stencil: {
                    //     func: {func: gl.ALWAYS, ref: 1, mask: 0xff},
                    //     op: {fail: gl.KEEP, zfail: gl.KEEP, zpass: gl.REPLACE}
                    // }
                }
            })
        };

        // initialize UBO buffers
        if (this.device.isWebGL2) {
            for (let name in this.ubo) {
                const ubo = this.ubo[name];
                ubo.buffer ||= gl.createBuffer();
                const gl2 = (gl as WebGL2RenderingContext);
                gl2.bindBufferBase(gl2.UNIFORM_BUFFER, ubo.index, ubo.buffer);
            }
        }


        this.terrainHeightMapCache = terrainHeightMapTextures;
        this.terrainHeightMapCache.initEmptyTexture(this.device);

        const stencilTile: StencilTileBuffer = createStencilTileBuffer(1, this.device);
        stencilTile.pass = PASS.OPAQUE | PASS.ALPHA_COLOR;
        // need to be set to enable stencil test in program init.
        stencilTile.blend = true;
        // stencilTile.colorMask = {r: true, g: true, b: true, a: false};
        // stencilTile.colorMask = {r: false, g: false, b: false, a: false};
        // stencilTile.depthMask = false;
        this.stencilTile = new RenderTile(stencilTile);

        const programConfig = this.programConfig = {
            Rect: {program: RectProgram},
            Line: {program: LineProgram},
            DashedLine: {program: DashedLineProgram, default: false},
            Text: {program: TextProgram},
            Image: {program: ImageProgram},
            Circle: {program: CircleProgram},
            Polygon: {program: PolygonProgram},
            VerticalLine: {program: VerticalLineProgram},
            Extrude: {program: ExtrudeProgram, default: false},
            Icon: {program: IconProgram},
            Box: {program: BoxProgram, default: false},
            Sphere: {program: SphereProgram, default: false},
            Model: {program: ModelProgram, default: false},
            Terrain: {program: TerrainProgram, default: false},
            Heatmap: {program: HeatmapProgram, default: false},
            Sky: {program: SkyProgram}
        };

        this.programVariantsByType = {};

        for (let program in programConfig) {
            const cfg = programConfig[program];
            this.programVariantsByType[program] = new Map<number, Program>();
            if (cfg.default === false) continue;
            this.createProgramVariant(program, 0);
        }
    }

    private createProgramVariant(type: string, mask: number): Program {
        const {device, dpr} = this;
        const variants = this.programVariantsByType[type];
        let program = variants.get(mask);

        if (program) {
            return program;
        }

        const ProgramClass = this.programConfig[type].program;
        program = new ProgramClass(device, dpr, Program.getMacrosFromMask(mask));
        program.init({
            screenTarget: this.screenRenderTarget,
            buffers: this.buffers,
            ubos: this.ubo,
            tileOffscreenTextures: this.rtManager
        });
        variants.set(mask, program);

        return program;
    }

    grid(show: boolean | { grid3d: boolean }): void {
        if (typeof show == 'object') {
            if (show.grid3d != undefined) {
                TerrainProgram.dbgGrid = !!show.grid3d;
            }
        } else {
            this.tileGrid = show;
        }
    }

    applyTransform() {

    }

    updateMapGridMatrix(pitch: number, width, height, terrainPivotZ: number = 0, rotZ: number = 0) {
        const centerX = width / 2;
        const centerY = height / 2;
        const targetZ = centerY / Math.tan(this.fovRad / 2);
        const prjMat = this._tmpMatrix;
        const cam = [centerX, centerY, targetZ]; // camera at T above tile plane

        mat4.perspective(prjMat, this.fovRad, width / height, 0.1, 1e5);
        this.updateVPMatrix(prjMat, cam, pitch, rotZ, [1, 1, 1], undefined, terrainPivotZ);
        return prjMat;
    }

    private _tm = new Float64Array(16);

    private updateVPMatrix(
        prjMatrix: Float32Array | Float64Array,
        cam: number[],
        rotX: number,
        rotZ: number,
        scale: number[],
        viewMatrix: Float32Array | Float64Array = this._tm,
        terrainPivotZ: number = 0
    ): Float32Array | Float64Array {
        // NOTE: _tm is Float64Array for worldVP precision (pZ can be ~25 billion).
        const [cx, cy] = cam;
        const targetZ = cam[2];

        // Absolute terrain-relative camera pose:
        //   target = [cx, cy, pZ]     <- terrain point under the screen center
        //   camera = [cx, cy, pZ + T] <- camera T above that point
        //
        // `terrainPivotZ` is a real world height converted to the same display
        // coordinate space as the camera. It is not a trailing view translation.
        // The world is rotated around the target terrain point, so changing the
        // sampled terrain height changes the look-at point and the camera together.
        //
        // Matrix chain (applied right-to-left to world points):
        //   translate(-cx,-cy,0) -> scale → translate(0,0,-pZ) -> rotations
        //   -> translate(cx,cy,pZ) -> lookAt(camera, target)
        //
        // A world point at the target height therefore ends at the look-at point
        // before lookAt is applied and remains exactly at the screen center for
        // every pitch and bearing. Points at other heights retain their physical
        // depth relative to that absolute camera pose.
        const camera = [cx, cy, targetZ + terrainPivotZ];
        const target = [cx, cy, terrainPivotZ];
        mat4.lookAt(viewMatrix, camera, target, [0, 1, 0]);
        mat4.translate(viewMatrix, viewMatrix, [cx, cy, terrainPivotZ]);
        mat4.rotateX(viewMatrix, viewMatrix, -rotX);
        mat4.rotateZ(viewMatrix, viewMatrix, -rotZ);
        mat4.translate(viewMatrix, viewMatrix, [0, 0, -terrainPivotZ]);
        mat4.scale(viewMatrix, viewMatrix, [scale[0], -scale[1], scale[2]]);
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
        worldSize: number,
        terrainPivotElevation: number = 0, // locked terrain pivot height in meters
        minVisibleTerrainElevation: number = terrainPivotElevation
    ) {
        const viewPrjMatrix = this.vPMat;
        const viewMatrix = this.vMat;
        this.zMeterToMapPixel = 1 / groundRes;

        // ---------------------------------------------------------------------
        // Legacy flat-terrain zFar derivation (pitch/FOV only), kept as background
        // for the original geometry. The terrain-aware calculation below extends this
        // model with GRID_PITCH_CLAMP, terrain pivot height, and lower visible terrain.
        // Calculating zFar based on pitch and hFOV when map is "overpitched".
        // The tile grid is clipped at GRID_PITCH_CLAMP, but the view can be pitched further.
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
        // <--               zFar
        // ---------------------------------------------------------------------

        // Terrain-aware zFar:
        // Compute the grid edge on a flat plane, clamping its pitch at GRID_PITCH_CLAMP.
        // If visible terrain lies below the pivot, extend zFar to the lower terrain plane
        // at the same screen-space Y. For overpitch, the grid stays clamped while the
        // actual pitch continues.
        //
        // Side view in camera space:
        //
        // camera  .\
        //          | \  clamped grid edge
        //          |  *---------------- pivot plane
        //          |  |\
        //          |  | \ belowPivotZ
        //          |  |  *
        //          +--+--*---------------- lower terrain plane
        //             T  |              view depth
        //                zFar
        //
        // T = targetZ, camera distance to the pivot plane
        // P = actual pitch; Pg = min(P, GRID_PITCH_CLAMP)
        // belowPivotZ = pivot altitude - lowest visible terrain altitude (pixels)
        //
        // The grid edge defines the horizon ratio. Its intersection with the lower
        // terrain plane gives terrainGridDistanceY and the final view depth:
        // zFar = T + terrainGridDistanceY * sin(P) + belowPivotZ * cos(P)

        const halfVFOV = this.fovRad * .5;
        const centerPixelX = pixelWidth * .5;
        // hPH
        const centerPixelY = pixelHeight * .5;
        // one texel equals one pixel at sea level (z=0)
        // Calculate base targetZ as if the map were flat
        const targetZ = centerPixelY / Math.tan(halfVFOV);

        const zMeterToDisplayPixel = scale * this.zMeterToMapPixel;

        // Terrain pivot height in display pixels (for orbit center / view matrix)
        const terrainPivotZ = terrainPivotElevation * zMeterToDisplayPixel;

        // zFar must be consistent with the horizon/grid cutoff, which is calculated
        // from the flat (pivotZ=0) grid extent. The xy grid extent therefore stays
        // terrain-independent, while the depth calculation accounts for terrain that
        // lies below the current pivot (for example: center pivot at 2400m, far tiles at 0m).
        // Flat elevated terrain reports the same minimum as the pivot, so it keeps the
        // same zFar/horizon behavior as flat sea-level terrain.
        const minTerrainElevation = minVisibleTerrainElevation;
        const minTerrainZ = minTerrainElevation * zMeterToDisplayPixel;
        const belowPivotZ = Math.max(0, terrainPivotZ - minTerrainZ);

        // The grid edge is computed at the actual pitch until GRID_PITCH_CLAMP and
        // remains frozen afterwards. This matches Display.calcHorizonYOffset().
        const gridPitch = Math.min(rotX, GRID_PITCH_CLAMP);
        const gridDenominator = Math.cos(gridPitch + halfVFOV);
        const flatGridDistanceY = targetZ * Math.sin(halfVFOV) / gridDenominator;

        // Screen-space y/depth ratio of the frozen flat grid edge at the actual pitch.
        // For rotX <= GRID_PITCH_CLAMP this equals the top frustum ray; for overpitch it
        // is the clamped horizon line projected with the current camera pitch.
        const flatGridDepth = targetZ + flatGridDistanceY * Math.sin(rotX);
        const flatGridViewY = flatGridDistanceY * Math.cos(rotX);
        const horizonRatio = flatGridViewY / flatGridDepth;

        // Find the point on the lowest terrain plane that projects to the same screen-space
        // horizon ratio. This prevents clipping before the horizon when the pivot is high
        // but distant terrain is much lower.
        const terrainDenominator = Math.cos(rotX) - horizonRatio * Math.sin(rotX);
        const terrainGridDistanceY = belowPivotZ
            ? (horizonRatio * (targetZ + belowPivotZ * Math.cos(rotX)) + belowPivotZ * Math.sin(rotX)) / terrainDenominator
            : flatGridDistanceY;

        // Project the terrain edge onto the camera's view-depth axis:
        //   targetZ                         -> base camera distance to the pivot plane
        //   terrainGridDistanceY * sin(P)   -> depth gained by moving forward on the map plane
        //   belowPivotZ * cos(P)            -> depth gained by terrain lying below the pivot plane
        let zFar = targetZ + terrainGridDistanceY * Math.sin(rotX) + belowPivotZ * Math.cos(rotX);
        // Small buffer to avoid precision issues.
        zFar *= 1.001;

        this.rz = (rotZ + PI2) % PI2;
        this.rx = rotX;
        this.scale = scale;
        // compensate pivot-induced zoom: raising the terrain pivot increases u_scale and
        // shrinks pixel-defined geometry. This factor restores its camera-relative size.
        this.pivotScaleFactor = terrainPivotZ > 0
            ? targetZ / (targetZ + terrainPivotZ)
            : 1;

        this.setResolution(pixelWidth, pixelHeight);

        this.device.setViewport(0, 0, pixelWidth * this.dpr, pixelHeight * this.dpr);

        const zNear = pixelHeight / 100;

        mat4.perspective(viewPrjMatrix, this.fovRad, pixelWidth / pixelHeight, zNear, zFar);

        this.worldMatrix.set(viewPrjMatrix);
        const terrainPivotZWorld = terrainPivotElevation / groundRes * worldSize;

        this.updateVPMatrix(this.worldMatrix, [worldCenterX, worldCenterY, targetZ], rotX, rotZ,
            [worldSize, worldSize, worldSize],
            undefined,
            terrainPivotZWorld
        );

        this.updateVPMatrix(viewPrjMatrix, [centerPixelX, centerPixelY, targetZ], rotX, rotZ,
            // [scale, scale, scale / groundRes],
            [scale, scale, zMeterToDisplayPixel],
            viewMatrix,
            terrainPivotZ
        );

        invert(this.invVPMat, viewPrjMatrix);

        // convert from clipspace to screen.
        let screenMatrix = mat4.identity(this.screenMat);
        mat4.scale(screenMatrix, screenMatrix, [centerPixelX, -centerPixelY, 1]);
        mat4.translate(screenMatrix, screenMatrix, [1, -1, 0]);
        mat4.multiply(screenMatrix, screenMatrix, this.vPMat);

        // invScreenMat: pivoted inverse (for grid bounds, raycasting - what's actually visible)
        invert(this.invScreenMat, screenMatrix);

        // terrain orbit: VP input z is in meters. Intersect unproject ray at terrainPivotElevation
        // to get terrain-level world coords at screen center — correct at all pitch angles.
        this.terrainUnprojectZ = terrainPivotElevation;
        // store actual pivot in display pixels for grid-bounds calculation
        this.terrainPivotZPixels = terrainPivotZ;

        // update camera's world position
        this.updateCamWorld(this.cameraWorld);

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

        // this.distanceCam2Center = 0.5 / Math.tan(halfVFOV) * pixelHeight;
        this.distanceCam2Center = targetZ;

        this.initSharedUniforms();

        this.initDisplayUniforms();
    }

    private updateCamWorld(camWorld: Float32Array | Float64Array) {
        // Reconstruct the camera from the inverse view transform, not from the
        // inverse projection*view matrix. The latter's translation column is the
        // world point at clip-space origin and is not the camera position.
        //
        // The view matrix already contains the terrain-relative absolute pose,
        // including pitch, bearing and the world-to-display scale. Its inverse
        // therefore gives the camera position in the same relative world space
        // consumed by Map.getCamera() and CameraTerrainController.
        const invViewMatrix = invert(this._invViewMatrix, this.vMat);
        camWorld[0] = invViewMatrix[12];
        camWorld[1] = invViewMatrix[13];
        camWorld[2] = invViewMatrix[14];
    }

    private getCameraElevationMeters(): number {
        return -this.cameraWorld[2];
        // return -this.cameraWorld[2] / this.zMeterToPixel;

        this.updateViewUBO();
    }

    private updateViewUBO() {
        if (this.device.isWebGL2) {
            const viewUbo = this.ubo.view;

            // resolution
            const resolution = this.mapContext.resolution;
            viewUbo.data[16] = resolution[0];
            viewUbo.data[17] = resolution[1];

            const gl = this.gl as WebGL2RenderingContext;
            gl.bindBuffer(gl.UNIFORM_BUFFER, viewUbo.buffer);
            gl.bufferData(gl.UNIFORM_BUFFER, viewUbo.data, gl.DYNAMIC_DRAW);

            // gl.bufferData(gl.UNIFORM_BUFFER, this.vPMat, gl.DYNAMIC_DRAW);
            // gl.bufferSubData(gl.UNIFORM_BUFFER, 0, viewMatrix);
            // gl.bufferSubData(gl.UNIFORM_BUFFER, 64, new Float32Array([tileScale]));
            // Bind to binding point 0
            // gl.bindBufferBase(gl.UNIFORM_BUFFER, viewUbo.index, ubo.buffer);
        }
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
            'u_resolution': this.mapContext.resolution,
            'u_scale': null, // this.scale * dZoom,
            'u_tile': [0, 0, 0, 1],
            'u_matrix': this.vPMat,
            'u_zMeterToPixel': null, // this.zMeterToPixel / dZoom,
            'u_exaggeration': 1
        };
    }

    private prog: Program;

    drawGrid(x: number, y: number, dTile: GLTile, tileSize: number) {
        this.beginPass(this.passes[PASS.ALPHA_COLOR]);
        const tileBuffer = this.getDbgTile(tileSize);

        this.dbgRenderTile ||= {
            renderTile: new RenderTile(tileBuffer),
            vpData: {tile: new GridTile(0, 0, 0, tileSize, tileSize, 0, 0, [])}
        };
        const {renderTile, vpData} = this.dbgRenderTile;
        renderTile.init(tileBuffer, 0, vpData);

        this.drawBuffer(renderTile, x, y, null, null);

        let textBuffer: GeometryBuffer = this.gridTextBuf.get(dTile);

        if (!textBuffer) {
            textBuffer = createGridTextBuffer(dTile.quadkey, this.device, DEBUG_GRID_FONT);
            this.gridTextBuf.set(dTile, textBuffer);
        }

        renderTile.init(textBuffer);
        this.drawBuffer(renderTile, x + 4, y + 4);
    }

    releaseGeometryBuffer(buffer: GeometryBuffer, quadkey?: string): void {
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
                const glBuffer = buffers.get(<Attribute>attr);
                gl.deleteBuffer(glBuffer);
            }
        }

        for (let grp of buffer.groups) {
            const index = (<ElementsDrawCmd>grp).index;
            if (index) {
                gl.deleteBuffer(buffers.get(index));
            }
            if (grp.vao) {
                this.device.vaoManager.deleteVAO(grp.vao);
                grp.vao = null;
            }
        }

        if (buffer.heightMap) {
            this.terrainHeightMapCache.delete(quadkey);
        }

        buffer.destroy(buffer);
    }

    /**
     * releases a synthetic terrain buffer's per-tile resources.
     * shared grid geometry and source attributes remain intact.
     * only the VAO and optional synthetic heightmap texture are owned by the buffer.
     *
     * @internal
     * @hidden
     */
    releaseSyntheticTerrainBuffer(
        buffer: GeometryBuffer,
        syntheticHeightMap?: { texture?: { destroy: () => void } }
    ): void {
        for (const grp of buffer.groups) {
            if (grp.vao) {
                this.device.vaoManager.deleteVAO(grp.vao);
                grp.vao = null;
            }
        }
        syntheticHeightMap?.texture?.destroy();
    }

    private initProgram(
        program: Program,
        renderItem: RenderTile,
        // buffer: GeometryBuffer,
        renderPass: PASS,
        uniforms?: CompiledUniformMap,
        cameraWorld?: Float64Array
    ) {
        const buffer = renderItem.buffer;

        this.device.useProgram(program);
        program.setContext(this.mapContext);
        // program.initBuffers(bufAttributes);

        program.prepareUniformBlocks(buffer);

        program.configureRenderState(renderItem, renderPass);

        program.initUniforms(this.sharedUniforms);

        program.initViewUniforms(
            this.viewUniforms,
            renderItem.renderTarget === RenderTileTarget.OffscreenTerrain
        );

        if (buffer.light && this.bufferLightUniforms) {
            program.initLight(this.bufferLightUniforms, cameraWorld || this.cameraWorld);
        }

        program.initUniform('u_camWorld', cameraWorld || this.cameraWorld);

        program.initBufferUniforms(buffer, uniforms || buffer.getUniformData());
        program.initHeightMap(buffer, this.terrainHeightMapCache, this.terrainExaggeration);
    }

    private drawBuffer(
        renderTile: RenderTile,
        x: number,
        y: number,
        mvpMat?: Float32Array,
        dZoom?: number,
        needsTileStencil?: boolean
    ): void {
        const buffer: GeometryBuffer = renderTile.buffer;
        const {pass} = this;
        const program: Program = this.getProgram(buffer);

        if (program) {
            let isScaledTile = mvpMat == null && dZoom !== undefined;
            dZoom ||= 1;

            const zIndex = renderTile.z;
            // const usesOffscreen = buffer.renderTarget === RenderTarget.OffscreenTerrain;
            const usesOffscreen = renderTile.needsOffscreenPass();
            let mapScale = this.scale;

            const compiledUniforms = buffer.compileUniforms();
            if (!program.isBufferVisible(compiledUniforms.uniforms)) {
                return;
            }


            let renderTarget: IRenderTarget = this.screenRenderTarget;


            if (usesOffscreen) {
                const terrainLayer = renderTile.layer.getTerrainLayer();
                const terrainTileSize = terrainLayer.tileSize;
                const terrainQuadkey = renderTile.data.terrainTileQuadkey || renderTile.data.tile.quadkey;

                const offscreenSize = this.fboSizes?.[terrainQuadkey] || (terrainTileSize * 2.0);
                const contentHash = this.fboContentHashes?.[terrainQuadkey];

                // FBO content unchanged —> skip all work for this draw call.
                const tileOffscreenTarget = this.rtManager.getOrCreate(terrainQuadkey, offscreenSize, contentHash);
                if (!tileOffscreenTarget) {
                    this._frameStats.offscreenSkipped++;
                    return;
                }

                const preview = renderTile.data.preview;
                const previewScale = preview ? (preview[7] as number) / (preview[3] as number) : 1;
                dZoom *= previewScale;

                mvpMat = renderTile.updateMVPMatrix(this.getOffscreenTileMatrix(terrainTileSize));
                x = 0;
                y = 0;

                if (tileOffscreenTarget.requiresClear) {
                    tileOffscreenTarget.bind(this.device);
                    tileOffscreenTarget.clear(this.device);
                    this.renderPass.reassertPassState(this.device);
                }
                renderTarget = tileOffscreenTarget;
            }

            // initialize shared uniforms
            const {sharedUniforms} = this;
            // pivotScaleFactor is omitted for:
            // 1. offscreen FBO passes use ortho projection; pivot/perspective do not affect size.
            // 2. onscreen heightMapRef features follow terrain altitude; keep altitude scaling at 1
            //    because perspective already handles their size.
            const isOnTerrainSurface = !usesOffscreen && buffer.requiresHeightMap() && !buffer.isTerrainSurface();
            const skipPivotScale = usesOffscreen || isOnTerrainSurface;
            sharedUniforms.u_scale = mapScale * dZoom * (skipPivotScale ? 1 : this.pivotScaleFactor);
            sharedUniforms.u_exaggeration = this.terrainExaggeration;
            sharedUniforms.u_matrix = mvpMat || renderTile.updateMVPMatrix(buffer.pixelPerfect ? this.vPRasterMat : this.vPMat);
            // Shader height conversion:
            //   vertex height in meters
            //      * u_zMeterToPixel  -> map pixels at the tile's effective zoom
            //      * u_scale          -> display pixels
            // u_scale includes dZoom for scaled/preview tiles. Divide by dZoom here so
            // elevation remains in the map-view scale and is not scaled twice by tile LOD.
            sharedUniforms.u_zMeterToPixel = this.zMeterToMapPixel / dZoom;

            buffer.renderScale = sharedUniforms.u_scale;
            // must be set at render time
            this.viewUniforms.fixedView = this.fixedView;

            needsTileStencil ||= (
                buffer.clip === true && buffer.isFlat()
                && !usesOffscreen
            );

            let tileStencilId: number = null;

            if (needsTileStencil) {
                tileStencilId = this.drawStencil(x, y, dZoom, renderTile);
            }

            // must be set after stenciling...
            sharedUniforms.u_tile[0] = x;
            sharedUniforms.u_tile[1] = y;
            sharedUniforms.u_tile[2] = renderTile.getTileSize();

            const depth = this.getDepthForZIndex(zIndex);
            this.device.setDepthRange(buffer.flat ? depth : 0, depth);

            let cameraWorld = this.cameraWorld;
            if (isScaledTile && buffer.light) {
                cameraWorld = this.getLocalCameraPosition(renderTile.getModelMatrix());
            }

            // initialize uniforms and gl states
            this.initProgram(program, renderTile, pass, buffer.getUniformData(), cameraWorld);

            // fbo gets bound inside preparePass
            program.preparePass(pass, renderTile, renderTarget);

            // const isOnTopOf3d = (buffer.flat && zIndex > this.min3dZIndex) && !usesOffscreen;
            if (renderTile.disableDepthTestOver3D) {
                this.device.setDepthTest(false);
            }

            const passOverrides = program.applyPassOverrides(
                this.renderPass,
                renderTile,
                // buffer,
                tileStencilId,
                usesOffscreen
            ) || renderTile.disableDepthTestOver3D;

            // zIndex is compacted per render target; reset the per-Z stencil tracker on target switches.
            if (this._stencilClearTarget !== renderTarget) {
                this._stencilClearTarget = renderTarget;
                this._stencilClearedForZIndex = -1;
            }

            // the second 3D alpha pass may overlap tiles ->
            // clear the stencil once per z-index layer so stale tile IDs cannot block or corrupt blending.
            if (buffer.needsAlphaDepthPass() && this.renderPass.type === PASS.ALPHA_COLOR && !buffer.isFlat()) {
                if (this._stencilClearedForZIndex < zIndex) {
                    // this.clearBuffers(ClearMask.STENCIL);
                    this.reservedStencils.clear();
                    this.device.clear(ClearMask.STENCIL);
                    this._stencilClearedForZIndex = zIndex;
                }
            }

            program.draw(buffer, isScaledTile);

            this._frameStats.drawCalls++;
            if (usesOffscreen) {
                this._frameStats.offscreenDrawCalls++;
            } else {
                this._frameStats.screenDrawCalls++;
            }

            if (passOverrides) {
                this.renderPass.reassertPassState(this.device);
            } else if (needsTileStencil) {
                // Restore the active RenderPass stencil defaults
                this.renderPass?.reassertStencilState(this.device);
            }
        } else console.warn('no program found', buffer.type);
    }

    /**
     * Computes the camera position relative to a local transformation matrix.
     * This is typically used for lighting or preview passes where camera position
     * must be expressed in the local coordinate system of a tile or object.
     * @internal
     * @hidden
     */
    private getLocalCameraPosition(localMatrix: Float32Array | Float64Array): Float64Array {
        const {localCamera, cameraWorld, zMeterToMapPixel} = this;
        // Transform cameraWorld into local tile space
        const invMatrix = invert([], localMatrix);
        transformMat4(localCamera, cameraWorld, invMatrix);
        // const tileScale = localMatrix[0];
        // localCamera[0] *= tileScale;
        // localCamera[1] *= tileScale;
        // localCamera[2] *= tileScale;
        return localCamera;
        // const {localCamera, cameraWorld} = this;
        // // Extract scale and translation from the local matrix.
        // // Assumes uniform scale in x and y and no rotation/shear.
        // const s = localMatrix[0];
        // const tx = localMatrix[12];
        // const ty = localMatrix[13];
        // // Transform the world-space camera position into local space.
        // // This is done by inverting the translation and scale of the local matrix.
        // localCamera[0] = (cameraWorld[0] - tx) / s;
        // localCamera[1] = (cameraWorld[1] - ty) / s;
        // localCamera[2] = cameraWorld[2] / s;
        // return localCamera;
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

    private reserveTileStencil(id: number): number {
        const {reservedStencils} = this;
        let refVal = reservedStencils.size + 1;
        if (refVal > 255) {
            refVal = 1;
            reservedStencils.clear();
            this.device.clear(ClearMask.STENCIL);
        }
        reservedStencils.set(id, refVal);
        return refVal;
    }

    private packTileStencilId(stencilVal: number, scale: number, x: number, y: number): number {
        // pack as 6bit signed exponent -32 -> +31 (representable scale: 2^-32...2^31)
        const s = Math.round(Math.log2(scale)) + 32;
        // const s = Math.trunc(scale);
        const xEnc = Math.trunc(x) + 8192;
        const yEnc = Math.trunc(y) + 8192;
        // optional guards in debug/dev
        // if (s < 0 || s > 63 || xEnc < 0 || xEnc > 16383 || yEnc < 0 || yEnc > 16383) debugger;
        // 9 + 6 + 14 + 14 = 43 bits (safe in Number)
        // stencilVal: 0..511, scale: 0..63, xi/yi: -8192..8191
        return (((stencilVal * 64 + s) * 16384 + xEnc) * 16384 + yEnc);
    }

    private drawStencil(x: number, y: number, scale: number, renderTile: RenderTile) {
        // return this.gl.stencilFunc(this.gl.ALWAYS, 0, 0);
        const zIndex = renderTile.z;
        const transform = renderTile.getTransform();
        const tileStencilId = this.packTileStencilId(this.stencilVal, transform.s, transform.tx, transform.ty);

        let refVal = this.reservedStencils.get(tileStencilId);
        if (refVal !== undefined) {
            // stencil already exists for this tile, no need to redraw
            return refVal;
        }
        refVal = this.reserveTileStencil(tileStencilId);

        const {gl, stencilTile, sharedUniforms} = this;

        stencilTile.z = zIndex;

        const stencilBuffer = stencilTile.buffer;
        const program: Program = this.getProgram(stencilBuffer);

        this.device.setStencilFunc(gl.ALWAYS, refVal, 0xff);
        this.device.setStencilOp(gl.REPLACE, gl.REPLACE, gl.REPLACE);
        this.device.setDepthTest(false);
        this.device.setDepthMask(false);
        this.device.setColorMask(false, false, false, false);
        // this.device.setColorMask(false, true, false, false);
        this.device.setStencilTest(true);

        for (let position of this.tileStencils) {
            sharedUniforms.u_tile[0] = x + position[0] * this.stencilSize;
            sharedUniforms.u_tile[1] = y + position[1] * this.stencilSize;
            stencilBuffer.uniforms.u_tileScale = this.stencilSize * position[2];
            this.initProgram(program, stencilTile, this.pass, stencilBuffer.uniforms as CompiledUniformMap);
            program.draw(stencilBuffer);
        }

        // restore the active RenderPass stencil defaults
        this.renderPass.reassertPassState(this.device);

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


    initBufferScissorBox(buffer: GeometryBuffer, screenTile: DisplayTile, preview?: RenderTile['data']['preview']) {
        if (buffer.clip) {
            let tileSize = screenTile.renderTileSize;
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

    draw(renderTile: RenderTile): void {
        const screenTile = renderTile.data.tile;
        const {preview} = renderTile.data;

        const dTile = <GLTile>screenTile.tile;
        const {layer, buffer} = renderTile;

        let {x, y, worldTileSize} = screenTile;
        const {tileSize} = layer;
        const distanceScale = worldTileSize / tileSize;

        // this.min3dZIndex = min3dZIndex;

        this.bufferLightUniforms = buffer.light ? this.processedLight[layer.index][buffer.light] : null;

        // make sure to reset stencil
        this.stencilVal = null;

        const usesOffscreen = renderTile.needsOffscreenPass();

        if (usesOffscreen) {
            const terrainLayer = layer.getTerrainLayer();
            const terrainTileSize = terrainLayer.tileSize;
            const dataQuadkey = screenTile.quadkey;
            const terrainQuadkey = renderTile.data.terrainTileQuadkey || dataQuadkey;

            // compute offset and scale to position data-tile vertices within the terrain FBO.
            let offsetX: number;
            let offsetY: number;
            let vertexScale: number;
            if (dataQuadkey.length >= terrainQuadkey.length) {
                // data is same level or child of terrain (normal case + zoom-in preview).
                // data tile maps into a sub-region of the terrain FBO.
                const [nx, ny, s] = tileUtils.getQuadkeyOffset(terrainQuadkey, dataQuadkey);
                offsetX = nx * terrainTileSize;
                offsetY = ny * terrainTileSize;
                vertexScale = (s * terrainTileSize) / tileSize;
            } else {
                // data is parent of terrain (zoom-out preview).
                // the data tile covers a larger area — crop and scale into the terrain FBO.
                const [nx, ny, s] = tileUtils.getQuadkeyOffset(dataQuadkey, terrainQuadkey);
                offsetX = -nx * tileSize * (terrainTileSize / (s * tileSize));
                offsetY = -ny * tileSize * (terrainTileSize / (s * tileSize));
                vertexScale = terrainTileSize / (s * tileSize);
            }

            if (preview) {
                const [, sx, sy, sWidth, , dx, dy, dWidth] = preview;
                const previewScale = dWidth / sWidth;
                renderTile.setTransform(
                    offsetX + (dx - sx * previewScale) * vertexScale,
                    offsetY + (dy - sy * previewScale) * vertexScale,
                    vertexScale * previewScale
                );
            } else {
                renderTile.setTransform(offsetX, offsetY, vertexScale);
            }

            this.initStencil(dTile.i, tileSize, preview ? renderTile.data.stencils : undefined);
            this.drawBuffer(renderTile, 0, 0, null, distanceScale);
        } else if (preview) {
            // const [, sx, sy, sWidth, , dx, dy, dWidth] = preview;
            // const previewScale = dWidth / sWidth;
            // const previewOffsetX = dx - sx * previewScale;
            // const previewOffsetY = dy - sy * previewScale;
            //
            // const tx = x + previewOffsetX * distanceScale;
            // const ty = y + previewOffsetY * distanceScale;
            // const scale = previewScale * distanceScale;
            // renderTile.setTransform(tx, ty, scale);

            const previewScale = preview[7] / preview[3];
            const scale = renderTile.applyViewportTileTransform();

            let clipPreview = false;
            if (previewScale > 1 && !buffer.needsAlphaDepthPass() && buffer.flat) {
                // Already clipped geometry is stenciled to match the dimensions of smaller preview tiles accurately when zoomed in.
                clipPreview = true;
            }

            this.initStencil(dTile.i, tileSize, renderTile.data.stencils);

            this.drawBuffer(renderTile, 0, 0, null, scale,
                // Ensure clipped geometry is stenciled when required
                clipPreview
            );
        } else {
            let matrix;
            // renderTile.setTransform(x, y, distanceScale);
            renderTile.applyViewportTileTransform();
            this.initStencil(dTile.i, tileSize);

            if (distanceScale !== 1) {
                // for scaled tiles (both zoomed in distanceScale>1 and terrain-boosted distanceScale<1),
                // use the model matrix (via setTransform) baked into the MVP for correct positioning and scaling.
                x = 0;
                y = 0;
            } else {
                matrix = buffer.pixelPerfect ? this.vPRasterMat : this.vPMat;
                // matrix = renderTile.updateMVPMatrix(buffer.pixelPerfect ? this.vPRasterMat : this.vPMat);
                // x = y = 0;
            }
            this.drawBuffer(renderTile, x, y, matrix, distanceScale);
        }
    }


    drawSky(horizonY: number, height: number, maxHorizonY: number) {
        if (!horizonY) return; // sky is not visible

        const {skyBuffer} = this;
        const horizon = skyBuffer.getUniform('u_horizon');
        horizon[0] = 2 * horizonY / height;
        horizon[1] = 2 * maxHorizonY; // pitch:85 (->) 0.4198
        // make sure uniforms are being updated...
        skyBuffer.clearUniformCache();

        this.device.setDepthMask(false);
        this.device.setDepthTest(false);

        this.drawBuffer(this.sky, 0, 0, this.skyMatrix);
        // this.device.setDepthMask(true);
    }

    destroy(): void {
        this.rtManager.destroy();
        for (const type in this.programVariantsByType) {
            for (const program of this.programVariantsByType[type].values()) {
                program.delete();
            }
        }
        this.renderStateMacroMasks = {};
        this.screenRenderTarget.destroy(this.device);
        this.device.destroy();
    }

    prepare(INSTRUCTIONS: any, tile: Tile, layer: TileLayer, display: any, dTile: BasicTile, cb: () => void): void {
    }

    drawCustom(layer: CustomLayer, zIndex: number) {
        const render = this;
        const {gl} = render;

        // render.prog = null;

        const zFar = this.getDepthForZIndex(zIndex);
        const zNear = layer.renderOptions.mode == '3d' ? 0 : zFar;

        this.device.setDepthRange(zNear, zFar);
        this.device.setScissorTest(false);
        this.device.setStencilTest(false);

        layer.render(gl, render.worldMatrix);

        // make sure vao gets unbound in case of being used to prevent possible side effects
        this.device.unbindVertexArray();
        this.screenRenderTarget.bind(this.device);

        this.device.invalidateState();
        this.device.resetStateToDefaults({keepViewport: true});
    }

    private getDepthForZIndex(zIndex: number): number {
        const lastZIndex = Z_INDEX_DEPTH_SLOTS - 1;
        const depthIndex = zIndex > lastZIndex ? lastZIndex : zIndex;
        return (lastZIndex - depthIndex) / Z_INDEX_DEPTH_SLOTS;
    }

    private getProgram(buffer: GeometryBuffer) {
        const type = buffer.type;
        const ProgramClass = this.programConfig[type]?.program;

        if (!ProgramClass) {
            return;
        }

        buffer.macroMask ??= ProgramClass.getBufferMacroMask(buffer);

        const renderStateMask = this.renderStateMacroMasks[type] ??= ProgramClass.getRenderMacroMask(
            this.mapContext,
            this.supportsTerrainOcclusion()
        );
        const mask = ProgramClass.resolveMacroMask(buffer.macroMask, renderStateMask);

        return this.programVariantsByType[type].get(mask) || this.createProgramVariant(type, mask);
    }

    private setResolution(width: number, height: number) {
        const {resolution} = this.mapContext;
        // if (resolution[0] != width || resolution[1] != height) {
        resolution[0] = width;
        resolution[1] = height;
        this.screenRenderTarget.resize(this.device, width * this.dpr, height * this.dpr);
        // }
    }

    private getDbgTile(tileSize: number) {
        return this.dbgTile[tileSize] ||= createGridTileBuffer(tileSize);
    }

    shouldDrawInPass(renderTile: RenderTile, renderPass?: RenderPass): boolean {
        const buffer: GeometryBuffer = renderTile.buffer;
        const pass = renderPass ? renderPass.type : this.pass;
        const program: Program = this.getProgram(buffer);
        return program?.isPassRequired(pass, renderTile.pass);
    }

    private beginPass(renderPass: RenderPass): void {
        renderPass.begin(this.device);
        this.renderPass = renderPass;
        this.pass = renderPass.type;
    }

    renderTargetPasses(
        renderItems: RenderData[],
        startIndex: number = 0,
        endIndex: number = renderItems.length
    ): void {
        const render = this;
        const {passes} = render;
        // let currentZ: number | null = null;
        let currentPass: RenderPass | null = null;

        for (let i = startIndex; i < endIndex; i++) {
            const renderItem = renderItems[i];
            if (!renderItem?.tiled) {
                this.drawCustom((renderItem as CustomRenderData).data, renderItem.z);
                currentPass = null;
                continue;
            }

            // let itemPass = renderItem.disableDepthTestOver3D ? PASS.ALPHA_COLOR : renderItem.pass;
            let itemPass = renderItem.pass;
            let renderPass: RenderPass = passes[itemPass];

            // pass switch
            if (renderPass !== currentPass) {
                this.beginPass(renderPass);
                currentPass = renderPass;
            }
            // // Optional Z layer tracking (if needed for stencil clears)
            // if (renderItem.z !== currentZ) currentZ = renderItem.z;

            if (this.shouldDrawInPass(renderItem, renderPass)) {
                this.draw(renderItem);
            }

            renderItem.buffer.acknowledgeRender();
        }
    }


    private _offscreenTileMatrix: { [tileSize: number]: Float32Array } = {};

    private getOffscreenTileMatrix(tileSize: number): Float32Array {
        return this._offscreenTileMatrix[tileSize] ||= mat4.ortho(
            mat4.create(),
            0, tileSize, tileSize, 0,
            -1000, 1000
        );
    }
}
