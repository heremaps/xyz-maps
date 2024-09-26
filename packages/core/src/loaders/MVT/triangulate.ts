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

// experimental class.
// TODO: clean generic implementation

import Protobuf from 'pbf';
import earcut from 'earcut';
import {VectorTile} from '@mapbox/vector-tile';
import {LayerData, XYZBin} from './XYZBin';

// based on @mapbox/vector-tile
const loadGeometry = (feature) => {
    var pbf = feature._pbf;
    pbf.pos = feature._geometry;

    var end = pbf.readVarint() + pbf.pos;
    var cmd = 1;
    var length = 0;
    var x = 0;
    var y = 0;
    var lines = [];
    var line;

    while (pbf.pos < end) {
        if (length <= 0) {
            var cmdLen = pbf.readVarint();
            cmd = cmdLen & 0x7;
            length = cmdLen >> 3;
        }

        length--;

        if (cmd === 1 || cmd === 2) {
            x += pbf.readSVarint();
            y += pbf.readSVarint();

            if (cmd === 1) { // moveTo
                if (line) lines.push(line);
                line = [];
            }

            line.push([x, y]);
        } else if (cmd === 7) {
            // Workaround for https://github.com/mapbox/mapnik-vector-tile/issues/90
            if (line) {
                line.push(line[0].slice()); // closePolygon
            }
        } else {
            throw new Error('unknown command ' + cmd);
        }
    }

    if (line) lines.push(line);

    return lines;
};

// based on @mapbox/vector-tile
function classifyRings(rings) {
    var len = rings.length;
    if (len <= 1) return [rings];
    var polygons = [];
    var polygon;
    var ccw;

    for (var i = 0; i < len; i++) {
        var area = signedArea(rings[i]);
        if (area === 0) continue;
        if (ccw === undefined) ccw = area < 0;
        if (ccw === area < 0) {
            if (polygon) polygons.push(polygon);
            polygon = [rings[i]];
        } else {
            polygon.push(rings[i]);
        }
    }
    if (polygon) polygons.push(polygon);

    return polygons;
};

// based on @mapbox/vector-tile
function signedArea(ring) {
    let sum = 0;
    for (var i = 0, len = ring.length, j = len - 1, p1, p2; i < len; j = i++) {
        p1 = ring[i];
        p2 = ring[j];
        sum += (p2[0] - p1[0]) * (p1[1] + p2[1]);
    }
    return sum;
}


// const classifyRings = (rings) => {
//     if (rings.length < 1) return [rings];
//     let polygons = [];
//     let polygon;
//     let extWindingOrder = null;
//
//     for (let ring of rings) {
//         let isCw = isClockwise(ring);
//
//         if (extWindingOrder == null) {
//             extWindingOrder = isCw;
//         }
//
//         if (extWindingOrder == isCw) {
//             polygons.push(polygon = []);
//         }
//         polygon.push(ring);
//     }
//     return polygons;
// };
//
// const isClockwise = (poly, start = 0, stop = poly.length) => {
//     let area = 0;
//     for (let i = start, p1, p2, len = stop - 1; i < len; i++) {
//         p1 = poly[i];
//         p2 = poly[(i + 1) % len];
//         area += p1[0] * p2[1] - p2[0] * p1[1];
//     }
//
//     if (area == 0) debugger;
//
//     // return area < 0;
//     return area > 0; // y axis flipped
// };


const flatten = (data: [number, number, number?][][], vertices = []) => {
    // const vertices = [];
    const holes = [];
    let holeIndex = 0;

    for (let i = 0; i < data.length; i++) {
        for (let j = 0; j < data[i].length; j++) {
            vertices[vertices.length] = data[i][j][0];
            vertices[vertices.length] = data[i][j][1];
        }
        if (i > 0) {
            holeIndex += data[i - 1].length;
            holes[holes.length] = holeIndex;
        }
    }

    return {
        vertices,
        holes,
        dimensions: data[0][0].length
    };
};


// const isClockwise2 = (poly, start = 0) => {
//     let area = 0;
//     let p1x;
//     let p1y;
//     let p2x;
//     let p2y;
//     for (let i = start, j, len = poly.length - 2; i < len; i += 2) {
//         j = (i + 2) % len;
//         p1x = poly[i];
//         p1y = poly[i + 1];
//         p2x = poly[j];
//         p2y = poly[j + 1];
//         area += p1x * p2y - p2x * p1y;
//     }
//
//     if (area == 0) debugger;
//
//     // return area < 0;
//     return area > 0; // y axis flipped
// };
// const parseGeom = (feature) => {
//     var pbf = feature._pbf;
//     pbf.pos = feature._geometry;
//
//     const end = pbf.readVarint() + pbf.pos;
//     let length = 0;
//     let x = 0;
//     let y = 0;
//     let coordinates = [];
//     let i = -1;
//     let lineStart = 0; // prev start line index
//     const lineIndices = [0];
//     const holeIndices = [];
//     let cmd;
//     let sx;
//     let sy;
//
//     while (pbf.pos < end) {
//         if (length <= 0) {
//             const cmdLen = pbf.readVarint();
//             cmd = cmdLen & 0x7;
//             length = cmdLen >> 3;
//         }
//         length--;
//         i++;
//         if (cmd == 7) { // ClosePath
//             coordinates.push(sx, sy);
//         } else {
//             x += pbf.readSVarint();
//             y += pbf.readSVarint();
//
//             if (cmd == 1) { // MoveTo
//                 sx = x;
//                 sy = y;
//                 if (i > 1) {
//                     if (isClockwise2(coordinates, 2 * lineStart)) {
//                         lineStart = i;
//                         lineIndices.push(i);
//                     } else {
//                         holeIndices.push(i);
//                     }
//                 }
//             } // else {} // cmd==2 -> LineTo
//             coordinates.push(x, y);
//         }
//     }
//     return {
//         lines: lineIndices,
//         holes: holeIndices,
//         coordinates: coordinates
//     };
// };


export default (arraybuffer, x: number, y: number, z: number) => {
    const mvt = new VectorTile(new Protobuf(arraybuffer));
    let layers: LayerData = [];
    let layerIndex = 0;

    for (let name in mvt.layers) {
        let mvtLayer = mvt.layers[name];
        let f = 0;
        const layer = {
            index: layerIndex++,
            features: []
        };

        while (f < mvtLayer.length) {
            const feature = mvtLayer.feature(f);

            if (feature.type == 3) { // Polygon
                const coordinates = loadGeometry(feature);
                const polygons = [];
                let prevPolysLength = 0;
                let requires32Bit = false;

                for (let polygon of classifyRings(coordinates)) {
                    let data = flatten(polygon);
                    let triangles = earcut(data.vertices, data.holes, data.dimensions);

                    for (let t of triangles) {
                        const index = prevPolysLength + t;
                        requires32Bit ||= index > 0xffff;
                        polygons[polygons.length] = index;
                    }
                    prevPolysLength += data.vertices.length / data.dimensions;
                }
                layer.features.push({index: f, data: polygons, requires32Bit});
            }
            f++;
        }

        const features = layer.features.length;

        if (features) {
            layers.push(layer);
        }
    }

    return XYZBin.fromLayers(layers).getBuffer();
};
