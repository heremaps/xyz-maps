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

export type Feature = any;

export type Layer = {
    offset: number,
    length: number,
    features: { [fetureIndex: number]: Feature }
}

export class XYZBin {
    private aB: ArrayBuffer;
    private dV: DataView;
    private bO: number = 0;

    private setUint16Array(arr: number[]) {
        const byteOffset = this.bO;
        const length = arr.length;
        this.dV.setUint32(byteOffset, length);
        (new Uint16Array(this.aB, byteOffset + 4, length)).set(arr);
        this.bO += 4 + 2 * length;
    }

    constructor(bytes: number | ArrayBuffer) {
        if (typeof bytes == 'number') {
            bytes = new ArrayBuffer(bytes);
        }
        this.dV = new DataView(bytes);
        this.aB = bytes;
    }

    setLayer(index: number|string, layerLength16) {
        const dv = this.dV;
        const byteOffset = this.bO;
        dv.setUint16(byteOffset, Number(index));
        dv.setUint32(byteOffset + 2, layerLength16);
        this.bO += 6;
    }

    setFeature(featureIndex: number, triangles: number[]) {
        this.dV.setUint16(this.bO, featureIndex);
        this.bO += 2;
        this.setUint16Array(triangles);
    }

    getLayers(): { [layerindex: number]: Layer } {
        const dv = this.dV;
        let byteLength = dv.byteLength;
        let byteOffset = 0;

        const layers = {};

        while (byteOffset < byteLength) {
            // readLayer infos
            let index = dv.getUint16(byteOffset);
            let layerLength = dv.getUint32(byteOffset + 2) * 2;
            byteOffset += 6;
            layers[index] = {
                offset: byteOffset,
                length: layerLength,
                features: null
            };
            byteOffset += layerLength;
        }
        return layers;
    }

    getFeatures(layer: Layer) {
        if (layer.features) {
            return layer.features;
        }
        const features = layer.features = {};
        const dv = this.dV;
        const buffer = this.aB;
        let byteOffset = layer.offset;
        let layerByteOffsetEnd = byteOffset + layer.length;

        // read feature infos in layer
        while (byteOffset < layerByteOffsetEnd) {
            let fi = dv.getUint16(byteOffset);
            let length = dv.getUint32(byteOffset + 2);
            byteOffset += 6;
            features[fi] = new Uint16Array(buffer, byteOffset, length);
            byteOffset += length * 2;
            // byteOffset += 4 + 2 * dv.getUint32(byteOffset);
        }
    }

    getBuffer() {
        return this.aB;
    }
}


// export const writeFeature = () => {
//
//
//     let triangles = feature.tris;
//
//     let dataLength = triangles.length;
//
//     dv.setUint16(byteOffset, Number(fi));
//     dv.setUint32(byteOffset + 2, dataLength);
//
//     let tdata = new Uint16Array(buffer, 6 + byteOffset, dataLength);
//     tdata.set(triangles);
//     byteOffset += 6 + 2 * dataLength;
//
//     // const verts = feature.verts;
//     // const vLength = verts.length;
//     // // const vdata = new Uint16Array(buffer, byteOffset, vLength);
//     // dv.setUint32(byteOffset, vLength);
//     // // vdata.set(verts);
//     // byteOffset += 4 + 2 * vLength;
//
// }
