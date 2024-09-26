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

export type Feature = Uint16Array | Uint32Array;

export type FeatureLayerMap = { [fetureIndex: number]: Feature };

export type Layer = {
    offset: number,
    length: number,
    features: FeatureLayerMap
}

export type LayerData = {
    index: number,
    length?: number,
    features: { index: number, requires32Bit: boolean, data: number[] }[]
}[];

export class XYZBin {
    static BYTES_LAYER_INDEX = 4;
    static BYTES_LAYER_LENGTH = 4;

    static get BYTES_LAYER() {
        return this.BYTES_LAYER_INDEX + this.BYTES_LAYER_LENGTH;
    };

    static BYTES_FEATURE_METADATA = 4;
    static BYTES_TRIANGLES_LENGTH = 4;

    static fromLayers(layers: LayerData) {
        let bytes = 0;
        let contains32BitData = false;
        for (let layer of layers) {
            if (layer.features.length) {
                layer.length = layer.features.reduce((a, b) => {
                    const {requires32Bit} = b;
                    contains32BitData ||= requires32Bit;
                    const dataLength = b.data.length;
                    let dataBytes =
                        dataLength * (requires32Bit ? 4 : 2) +
                        XYZBin.BYTES_TRIANGLES_LENGTH +
                        XYZBin.BYTES_FEATURE_METADATA;

                    if (dataBytes % 4) {
                        dataBytes += 2;
                    }
                    return a + dataBytes;
                }, 0);

                bytes += layer.length + XYZBin.BYTES_LAYER;
            }
        }
        const xyzBin = new XYZBin(bytes, contains32BitData);
        xyzBin.setLayers(layers);
        return xyzBin;
    }

    private aB: ArrayBuffer;
    private dV: DataView;
    private bO: number = 0;
    private contains32BitData: boolean = false;

    constructor(bytes: number | ArrayBuffer, contains32BitData: boolean = false) {
        if (typeof bytes == 'number') {
            bytes = new ArrayBuffer(bytes);
        }
        this.dV = new DataView(bytes);
        this.aB = bytes;
        this.contains32BitData = contains32BitData;
    }

    private setLayers(layers: LayerData) {
        for (let layer of layers) {
            let {index, length, features} = layer;
            if (length) {
                this.setLayer(index, length);

                for (let feature of features) {
                    this.setFeature(feature.index, feature.data, feature.requires32Bit);
                }
            }
        }
    }

    setLayer(index: number | string, byteLength: number) {
        const dv = this.dV;

        dv.setUint16(this.bO, Number(index));
        this.bO += XYZBin.BYTES_LAYER_INDEX;

        dv.setUint32(this.bO, byteLength);
        this.bO += XYZBin.BYTES_LAYER_LENGTH;
    }

    private setFeatureMetaData(index: number, requires32Bit: 0 | 1) {
        this.dV.setUint32(this.bO, index << 1 | requires32Bit);
        this.bO += XYZBin.BYTES_FEATURE_METADATA;
    }

    private setFeatureData(arr: number[], requires32Bit: 0 | 1) {
        const length = arr.length;
        this.dV.setUint32(this.bO, length);
        this.bO += XYZBin.BYTES_TRIANGLES_LENGTH;

        const TypedArray = requires32Bit ? Uint32Array : Uint16Array;
        (new TypedArray(this.aB, this.bO, length)).set(arr);

        let byteOffset = (requires32Bit + 1) * 2 * length;
        this.bO += byteOffset;

        if (this.bO % 4) this.bO += 2;
    }

    setFeature(featureIndex: number, data: number[], requires32Bit: boolean) {
        const needs32Bit = Number(requires32Bit) as (0 | 1);
        this.setFeatureMetaData(featureIndex, needs32Bit);
        this.setFeatureData(data, needs32Bit);
    }

    getLayers(): { [layerindex: number]: Layer } {
        const dv = this.dV;
        let byteLength = dv.byteLength;
        let byteOffset = 0;
        const layers = {};

        while (byteOffset < byteLength) {
            // readLayer infos
            let index = dv.getUint16(byteOffset);
            byteOffset += XYZBin.BYTES_LAYER_INDEX;

            let layerByteLength = dv.getUint32(byteOffset);
            byteOffset += XYZBin.BYTES_LAYER_LENGTH;

            layers[index] = {
                offset: byteOffset,
                length: layerByteLength,
                features: null
            };
            byteOffset += layerByteLength;
        }
        return layers;
    }

    getFeatures(layer: Layer): FeatureLayerMap {
        const features = {};
        const dv = this.dV;
        const buffer = this.aB;
        let byteOffset = layer.offset;
        let layerByteOffsetEnd = byteOffset + layer.length;

        // read feature infos in layer
        while (byteOffset < layerByteOffsetEnd) {
            const metadata = dv.getUint32(byteOffset);
            const index = metadata >> 1;
            const uses32Bit: 0 | 1 = (metadata & 1) as (0 | 1);
            byteOffset += XYZBin.BYTES_FEATURE_METADATA;

            let length = dv.getUint32(byteOffset);
            byteOffset += XYZBin.BYTES_TRIANGLES_LENGTH;

            const TypedArray = uses32Bit ? Uint32Array : Uint16Array;
            features[index] = new TypedArray(buffer, byteOffset, length);
            byteOffset += length * (uses32Bit + 1) * 2;

            if (byteOffset % 4) byteOffset += 2;
        }

        return features;
    }

    getBuffer() {
        return this.aB;
    }
}
