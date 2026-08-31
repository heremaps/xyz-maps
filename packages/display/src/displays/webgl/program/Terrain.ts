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
import ModelProgram from './Model';
import {GeometryBuffer} from '../buffer/GeometryBuffer';
import Program, {CompiledUniformMap, PROGRAM_MACRO, ProgramInitOptions} from './Program';
import {RenderTile} from '../RenderTile';
import {Texture} from '../Texture';
import {IRenderTarget, ScreenRenderTarget} from '../RenderTarget';
import {PASS} from '../RenderPass';
import {BufferCache, ProgramContext} from '../GLRender';
import {RenderTargetManager} from '../RenderTargetManager';


class TerrainProgram extends ModelProgram {
    name = 'Terrain';

    static dbgGrid: boolean;
    static terrainLightingInFragment: boolean = false;
    private terrainColor: [number, number, number] = [-1, -1, -1];
    private _emptyTexture: Texture;
    private tileOffscreenTextures: RenderTargetManager;

    static getMacros(buffer: GeometryBuffer) {
        let macros = super.getMacros(buffer);
        if (buffer.heightMap || buffer.heightMapRef) {
            macros ||= {};
            delete macros.USE_HEIGHTMAP;
            macros.TERRAIN_MODEL_HM = PROGRAM_MACRO.TERRAIN_MODEL_HM;
            if (TerrainProgram.terrainLightingInFragment) {
                macros.TERRAIN_LIGHTING_FRAGMENT = PROGRAM_MACRO.TERRAIN_LIGHTING_FRAGMENT;
            }
        }
        macros ||= {};
        macros.OVERLAY_MAP = PROGRAM_MACRO.OVERLAY_MAP;

        if (TerrainProgram.dbgGrid) {
            macros.DBG_GRID = PROGRAM_MACRO.DBG_GRID;
        }
        return macros;
    }

    init(options: ProgramInitOptions & { tileOffscreenTextures: RenderTargetManager }) {
        super.init(options);

        this.tileOffscreenTextures = options.tileOffscreenTextures;

        const diffuseUnifromSetter = this.uniformSetters.diffuse;
        this.uniformSetters.diffuse = (color) => {
            const terrainColor = this.terrainColor[0] === -1 ? color : this.terrainColor;
            diffuseUnifromSetter(terrainColor);
            // this.gl.uniform3fv(location, v);
        };
    }

    protected override ensureExtensions() {
        if (!this.device.isWebGL2) {
            this.device.extensions.getExtension('OES_standard_derivatives');
        }
    }

    private getEmptyTexture(): Texture {
        return (this._emptyTexture ||= new Texture(
            this.device,
            new ImageData(new Uint8ClampedArray([0, 0, 0, 0]), 1, 1))
        );
    }

    setContext(context: ProgramContext) {
        const terrainColor = context.features.terrainColor;

        if (terrainColor) {
            this.terrainColor[0] = terrainColor[0];
            this.terrainColor[1] = terrainColor[1];
            this.terrainColor[2] = terrainColor[2];
        } else {
            this.terrainColor[0] = -1;
            this.terrainColor[1] = -1;
            this.terrainColor[2] = -1;
        }
    }


    private overlayUVTransform: [number, number, number] = [0, 0, 1];

    preparePass(pass: PASS, renderTile: RenderTile, renderTarget: IRenderTarget) {
        const screenQuadkey = renderTile.data.tile.quadkey;
        const terrainQuadkey = renderTile.data.terrainTileQuadkey || screenQuadkey;
        const terrainOverlayTexture = this.tileOffscreenTextures.getOverlayTexture(terrainQuadkey);

        this.initUniform('u_overlayMap', terrainOverlayTexture || this.getEmptyTexture());

        // map mesh UVs to the correct region of the shared overlay FBO.
        // child meshes use the ancestor sub-region. previews use their source area.
        // loaded meshes use their own tile area.
        const meshQuadkey = (renderTile.data.preview?.[0] as string) || screenQuadkey;
        const fboLevel = terrainQuadkey.length;
        const deltaLevel = meshQuadkey.length - fboLevel;

        if (deltaLevel > 0) {
            let ox = 0; let oy = 0; let s = 1;
            for (let i = 0; i < deltaLevel; i++) {
                s *= 0.5;
                const digit = Number(meshQuadkey.charAt(fboLevel + i));
                ox += (digit % 2) * s;
                oy += Number(digit > 1) * s;
            }
            this.overlayUVTransform[0] = ox;
            this.overlayUVTransform[1] = oy;
            this.overlayUVTransform[2] = s;
        } else {
            this.overlayUVTransform[0] = 0;
            this.overlayUVTransform[1] = 0;
            this.overlayUVTransform[2] = 1;
        }
        this.initUniform('u_overlayUVTransform', this.overlayUVTransform);

        super.preparePass(pass, renderTile, renderTarget);
    }
}

export default TerrainProgram;
