/*
 * Copyright (C) 2019-2025 HERE Europe B.V.
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

enum Neighbor {
    LEFT = 'left',
    RIGHT = 'right',
    TOP = 'top',
    BOTTOM = 'bottom'
}
export const stitchHeightmapBorders = (
    heightMap: Float32Array,
    neighbor: Float32Array,
    side: Neighbor,
    offset: number = 0,
    edgeCopySize: number = 1
): Float32Array => {
    const size = Math.sqrt(heightMap.length);
    const lastIndex = size - 1;
    const getHeight = (x: number, y: number): number => {
        return neighbor[y * size + x];
    };
    const setHeight = (x: number, y: number, value: number) => {
        heightMap[y * size + x] = value;
    };

    if (side === Neighbor.BOTTOM) { // bottom
        for (let y = 0; y < edgeCopySize; y++) {
            for (let x = 0; x < size; x++) {
                setHeight(x, lastIndex - y, getHeight(x, edgeCopySize - 1 + offset - y));
            }
        }
    } else if (side === Neighbor.TOP) { // top
        for (let y = 0; y < edgeCopySize; y++) {
            for (let x = 0; x < size; x++) {
                setHeight(x, y, getHeight(x, size - edgeCopySize - offset + y));
            }
        }
    }
    if (side === Neighbor.RIGHT) { // right
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < edgeCopySize; x++) {
                setHeight(lastIndex - x, y, getHeight(edgeCopySize - 1 + offset - x, y));
            }
        }
    } else if (side === Neighbor.LEFT) { // left
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < edgeCopySize; x++) {
                setHeight(edgeCopySize - 1 - x, y, getHeight(lastIndex - offset - x, y));
            }
        }
    }
    return heightMap;
};

export const extendHeightMapWithFullClamping = (heightMap: ArrayLike<number> ) => {
    const size = Math.sqrt(heightMap.length);
    const paddedSize = size + 2;
    const result = new Float32Array(paddedSize * paddedSize);
    const get = (x: number, y: number) => heightMap[y * size + x];
    const set = (x: number, y, value: number) => result[y * paddedSize + x] = value;
    // copy "center"
    for (let y = 0; y < size; y++) {
        const srcRow = y * size;
        const dstRow = (y + 1) * paddedSize + 1;
        for (let x = 0; x < size; x++) {
            result[dstRow + x] = heightMap[srcRow + x];
        }
    }
    for (let x = 0; x < size; x++) {
        result[0 * paddedSize + (x + 1)] = get(x, 0); // top
        result[(paddedSize - 1) * paddedSize + (x + 1)] = get(x, size - 1); // bottom
    }
    for (let y = 0; y < size; y++) {
        result[(y + 1) * paddedSize + 0] = get(0, y); // left
        result[(y + 1) * paddedSize + (paddedSize - 1)] = get(size - 1, y); // right
    }
    set(0, 0, get(0, 0)); // top-left
    set(paddedSize - 1, 0, get(size - 1, 0)); // top-right
    set(0, paddedSize - 1, get(0, size - 1)); // bottom-left
    set(paddedSize - 1, paddedSize - 1, get(size - 1, size - 1)); // bottom-right

    return result;
};

export function computeNormals(
    heights: Float32Array,
    scaleXZ: number = 1,
    scaleY: number = 1
): Float32Array {
    const size = Math.sqrt(heights.length);
    const normals = new Float32Array(size * size * 3);

    const getHeight = (x: number, y: number) => {
        x = Math.max(0, Math.min(size - 1, x));
        y = Math.max(0, Math.min(size - 1, y));
        return heights[y * size + x];
    };

    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const hl = getHeight(x - 1, y);
            const hr = getHeight(x + 1, y);
            const hd = getHeight(x, y - 1);
            const hu = getHeight(x, y + 1);
            const dx = (hr - hl) * 0.5 * scaleY / scaleXZ;
            const dy = (hu - hd) * 0.5 * scaleY / scaleXZ;
            // Normal = cross product of (1, 0, dx) and (0, 1, dy)
            let nx = -dx;
            let ny = -dy;
            let nz = 1.0;
            // Normalize
            const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
            nx /= len;
            ny /= len;
            nz /= len;
            const i = (y * size + x) * 3;
            normals[i + 0] = nx;
            normals[i + 1] = ny;
            normals[i + 2] = nz;
        }
    }
    return normals;
}

export function extrapolateTileEdges(tile: Float32Array, size: number): Float32Array {
    const last = size - 1;
    // right edge
    for (let y = 0; y < size; y++) {
        const i1 = y * size + (last - 1); // inner edge
        const i2 = y * size + (last - 2); // one before
        const e = y * size + last; // edge to extrapolate
        tile[e] = 2 * tile[i1] - tile[i2];
    }
    // bottom edge
    for (let x = 0; x < size; x++) {
        const i1 = (last - 1) * size + x;
        const i2 = (last - 2) * size + x;
        const e = last * size + x;
        tile[e] = 2 * tile[i1] - tile[i2];
    }
    return tile;
}

export const backfillHeightmapBorders = (terrain: Float32Array) => {
    const gridSize = Math.sqrt(terrain.length);
    const lastIndex = gridSize - 1;
    const lastRowStart = gridSize * lastIndex;

    // Backfill bottom border and right border in one pass
    for (let i = 0; i < gridSize; i++) {
        terrain[lastRowStart + i] = terrain[lastRowStart - gridSize + i]; // Bottom
        terrain[i * gridSize + lastIndex] = terrain[i * gridSize + lastIndex - 1]; // Right
    }
    return terrain;
};

export function extractHeightmapBorders(
    heightmap: Float32Array,
    size: number
): {
    left: Float32Array;
    right: Float32Array;
    top: Float32Array;
    bottom: Float32Array;
} {
    const top = new Float32Array(size);
    const bottom = new Float32Array(size);
    const left = new Float32Array(size);
    const right = new Float32Array(size);

    for (let i = 0; i < size; i++) {
        top[i] = heightmap[i]; // first row
        bottom[i] = heightmap[(size - 1) * size + i]; // last row
        left[i] = heightmap[i * size]; // first column of each row
        right[i] = heightmap[i * size + (size - 1)]; // last column of each row
    }
    return {left, right, top, bottom};
}

const isPowerOfTwoPlusOne = (n: number): boolean => {
    const v = n - 1;
    return (v & (v - 1)) === 0;
};

export function decodeHeights(imgData: ImageData, encoding: string, fillStrategy: string = 'extrapolate', decodeScale: number = 1, decodeOffset: number = 1) {
    const {width, height, data} = imgData;
    const gridSize = width + Number(!isPowerOfTwoPlusOne(width));
    const terrain = new Float32Array(gridSize * gridSize);

    const decode = ({
        'terrarium': (r: number, g: number, b: number, a: number) => (r * 256 + g + b / 256) - 32768,
        'mtk': (r: number, g: number, b: number, a: number) => (r * 256 * 256 + g * 256 + b) * 0.03 - 10000,
        'mapboxrgb': (r: number, g: number, b: number, a: number) => (r * 256 * 256 + g * 256 + b) / 10 - 10000,
        'xyztrn': (r: number, g: number, b: number, a: number) => ((r << 16) | (g << 8) | b) * (9500 / 16777215) - 500
        // 'Normal': (r: number, g: number, b: number, a: number) => decodeNormalElevation(a)
    })[encoding.toLowerCase()];

    if (!decode) throw new Error(`Unsupported Terrain encoding: ${encoding}`);

    // decode terrain values
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const k = (y * width + x) * 4;
            terrain[y * gridSize + x] = decode(
                data[k],
                data[k + 1],
                data[k + 2],
                data[k + 3]
            ) * decodeScale + decodeOffset;
        }
    }

    return gridSize === width
        ? terrain
        : fillStrategy === 'extrapolate'
            ? extrapolateTileEdges(terrain, Math.sqrt(terrain.length))
            : backfillHeightmapBorders(terrain);
}
