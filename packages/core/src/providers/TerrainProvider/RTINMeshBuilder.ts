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

export type RTINMesh = {
    vertices: Float32Array;
    indices: Uint32Array | Uint16Array;
    stride: number;
    /**
     * Maps skirt vertex indices to their corresponding main mesh vertex indices.
     * Used to identify and process skirt vertices (extra geometry along tile borders to hide cracks).
     * Key: skirt vertex index (number)
     * Value: main mesh vertex index (number)
     */
    skirtToMainVertexMap?: Map<number, number>;
};

/**
 * RTIN (Right-Triangulated Irregular Network) mesh builder for terrain tiles.
 *
 * This class generates a triangulated mesh from a heightmap using the RTIN algorithm
 * (https://www.cs.ubc.ca/~will/papers/rtin.pdf), which adaptively subdivides triangles based on
 * a maximum error threshold to efficiently represent terrain with fewer triangles where possible.
 *
 * Features:
 * - Supports variable grid sizes (must be 2^n + 1).
 * - Computes per-vertex error metrics for adaptive mesh simplification.
 * - Optionally generates skirts (extra geometry along tile borders) to hide cracks between tiles.
 * - Can force maximum detail along tile edges using the `maxEdgeDetails` option to avoid visible seams.
 * - Outputs mesh data as flat vertex and index arrays, with optional mapping for skirt vertices.
 *
 * Usage:
 *   const rtin = new RTIN(257, 3);
 *   const mesh = rtin.triangulate(heightmap, { maxError: 5, enableSkirts: true, maxEdgeDetails: true });
 */
export class RTINMeshBuilder {
    size: number; // width and height of the square grid (must be 2^n + 1)
    vertexStride: number;
    // precomputed triangle base coordinates (ax, ay, bx, by)å
    private triangleTree: Uint16Array;
    private totalLeafNodes: number;
    private totalNodes: number;
    private totalBranchNodes: number;
    // private Map: Map<number, number> = new Map();
    // private vertexIndexMap: Int32Array;
    private vertexIndexMap: Int32Array;
    private errorsLUT: Float32Array;

    private curMeshVertexIndex: number;
    private meshVertices: Float32Array;
    private curMeshIndex: number;
    private meshIndices: Uint32Array;
    /**
     * Maps skirt vertex indices to their corresponding main mesh vertex indices.
     * Used to identify and process skirt vertices (extra geometry along tile borders to hide cracks).
     * Key: skirt vertex index (number)
     * Value: main mesh vertex index (number)
     */
    private skirtToMainVertexMap: Map<number, number> = new Map();

    constructor(gridSize: number = 257, stride: number = 2) {
        this.size = gridSize;
        this.vertexStride = stride;

        const tileSize = gridSize - 1;
        if (tileSize & (tileSize - 1)) {
            throw new Error(`Expected grid size to be 2^n+1, got ${gridSize}.`);
        }
        // total number of leaf nodes (smallest triangles at the bottom level)
        this.totalLeafNodes = tileSize * tileSize;
        // total number of nodes in the entire RTIN structure (including both leaf and internal nodes)
        this.totalNodes = this.totalLeafNodes * 2 - 2;
        // total number of branch nodes (internal nodes without leaf nodes)
        this.totalBranchNodes = this.totalNodes - this.totalLeafNodes;
        // each Node(triangle) is represented by 4 coordinates: ax, ay, bx, by
        this.triangleTree = new Uint16Array(this.totalNodes * 4);
        const heightmapLength = gridSize * gridSize;
        this.errorsLUT = new Float32Array(heightmapLength);
        this.vertexIndexMap = new Int32Array(heightmapLength);// .fill(-1);
        // skirt vertices
        const extraSkirtVertices = 4 * tileSize * 2;
        this.meshVertices = new Float32Array(heightmapLength * this.vertexStride + extraSkirtVertices * 3);
        this.meshIndices = new Uint32Array(3 * this.totalLeafNodes * 2 + 3 * extraSkirtVertices);
        this.initTree();
    }

    private initTree() {
        const subdivide = (ax: number, ay: number, bx: number, by: number, triIndex: number = 0) => {
            // Stop condition: if the triangle is too small or if we reached the maximum depth
            // if ((Math.abs(ax - bx) <= 1) && (Math.abs(ay - by) <= 1)) return;
            // if ((Math.abs(ax - bx) > 1) || (Math.abs(ay - by) > 1)) {
            if (triIndex < this.totalNodes) {
                const k = triIndex * 4;
                this.triangleTree[k] = ax;
                this.triangleTree[k + 1] = ay;
                this.triangleTree[k + 2] = bx;
                this.triangleTree[k + 3] = by;

                const mx = (ax + bx) >> 1;
                const my = (ay + by) >> 1;
                const cx = mx + my - ay;
                const cy = my + ax - mx;
                const childIndexA = (triIndex + 1) * 2;
                const childIndexB = childIndexA + 1;
                subdivide(bx, by, cx, cy, childIndexA);
                subdivide(cx, cy, ax, ay, childIndexB);
            }
        };
        const size = this.size - 1;
        // Starte mit zwei Wurzel-Dreiecken (ganze Fläche)
        subdivide(0, 0, size, size, 0);
        subdivide(size, size, 0, 0, 1);
    }

    private computeError(a: number, b: number, actual: number): number {
        const interpolated = (a + b) / 2;
        const absError = Math.abs(actual - interpolated);
        return absError;
        // const gradient = Math.abs(a - b); // local gradient used to emphasize detail (optional)
        // Weighting: strong gradient → error is considered more significant
        // const weightedError = absError * (1 + gradient * 0.1); // adjustable weighting factor
        // return weightedError;
    }

    /**
     * Computes the maximum error for each vertex in the heightmap
     * by comparing actual height to interpolated height along long edges.
     */
    private calculateErrors(terrain: ArrayLike<number>, forceEdges: boolean = false, errors?: Float32Array): Float32Array {
        const {totalNodes, totalBranchNodes, triangleTree} = this;
        errors ||= this.errorsLUT.fill(0);

        const minEdge = forceEdges ? 0 : -1e9;
        const maxEdge = forceEdges ? this.size - 1 : 1e9;
        const lastBranchNodeIndex = totalBranchNodes - 1;

        for (let i = totalNodes - 1; i >= 0; i--) {
            const k = i * 4;
            const ax = triangleTree[k];
            const ay = triangleTree[k + 1];
            const bx = triangleTree[k + 2];
            const by = triangleTree[k + 3];
            const mx = (ax + bx) >> 1;
            const my = (ay + by) >> 1;
            const index = this.index(mx, my);

            const isOnTileEdge = +(mx === minEdge) | +(mx === maxEdge) | +(my === minEdge) | +(my === maxEdge);
            errors[index] = isOnTileEdge ? 1e9 :
                Math.max(errors[index],
                    this.computeError(terrain[this.index(ax, ay)], terrain[this.index(bx, by)], terrain[index])
                );

            if (i > lastBranchNodeIndex) continue;

            const cx = mx + my - ay;
            const cy = my + ax - mx;
            const childAIndex = this.index((ax + cx) >> 1, (ay + cy) >> 1);
            const childBIndex = this.index((bx + cx) >> 1, (by + cy) >> 1);
            errors[index] = Math.max(errors[index], errors[childAIndex], errors[childBIndex]);
        }
        return errors;
    }

    private index(x: number, y: number): number {
        return y * this.size + x;
    }

    private resetTmpMesh() {
        this.curMeshIndex = 0;
        this.vertexIndexMap.fill(-1);
        this.curMeshVertexIndex = 0;
        this.skirtToMainVertexMap.clear();
    }

    private isBorderEdge(x1: number, y1: number, x2: number, y2: number): boolean {
        const max = this.size - 1;
        return (
            (x1 === 0 && x2 === 0) || (x1 === max && x2 === max) ||
            (y1 === 0 && y2 === 0) || (y1 === max && y2 === max)
        );
    };

    private addMeshVertex(x: number, y: number, terrain): number {
        const key = this.index(x, y);
        const {vertexStride, vertexIndexMap, meshVertices} = this;
        let index = vertexIndexMap[key];
        if (index == -1) {
            index = this.curMeshVertexIndex++;
            vertexIndexMap[key] = index;
            // vertices.push(x, y, terrain[key]);
            const i = vertexStride * index;
            meshVertices[i] = x;
            meshVertices[i + 1] = y;
            if (vertexStride == 3) {
                meshVertices[i + 2] = terrain[key];
            }
        }
        return index;
    };

    private addSkirtForEdge(i1: number, i2: number) {
        const addSkirtVertex = (index: number): number => {
            const vertices = this.meshVertices;
            // const skirtMap = this.skirtMap||=new Map();
            // if (skirtMap.has(index)) return skirtMap.get(index)!;
            const i3 = index * 3;
            const skirtIndex = this.curMeshVertexIndex++;
            const i = skirtIndex * 3;

            vertices[i] = vertices[i3];
            vertices[i + 1] = vertices[i3 + 1];
            const z = vertices[i3 + 2];
            // vertices[i + 2] = 0; // skirtHeight;
            vertices[i + 2] = z - z * .2; // skirtHeight;
            // skirtMap.set(index, skirtIndex);
            return skirtIndex;
        };
        const addSkirtIndices = (i1: number, i2: number, i3: number) => {
            const meshIndex1 = this.curMeshIndex++;
            const meshIndex2 = this.curMeshIndex++;
            const meshIndex3 = this.curMeshIndex++;
            this.meshIndices[meshIndex1] = i1;
            this.meshIndices[meshIndex2] = i2;
            this.meshIndices[meshIndex3] = i3;
            // this.skirtIndices.push(meshIndex1, meshIndex2, meshIndex3);
        };
        const s1 = addSkirtVertex(i1);
        const s2 = addSkirtVertex(i2);

        this.skirtToMainVertexMap.set(s1, i1);
        this.skirtToMainVertexMap.set(s2, i2);

        addSkirtIndices(i2, i1, s2);
        addSkirtIndices(i1, s1, s2);
    };

    triangulate(terrain: ArrayLike<number>, options: {
        maxError?: number,
        enableSkirts?: boolean,
        maxEdgeDetails?: boolean,
        errors?: Float32Array
    } = {}): RTINMesh {
        const maxError = options.maxError ?? 1;
        const enableSkirts = options.enableSkirts && this.vertexStride == 3;
        const maxEdgeDetails = options.maxEdgeDetails || false;
        const errors = options.errors || this.calculateErrors(terrain, maxEdgeDetails /* new Float32Array(this.size * this.size)*/);
        const maxXY = this.size - 1;
        const meshIndices: Uint32Array | Uint16Array = this.meshIndices;

        this.resetTmpMesh();

        const processTriangle = (ax: number, ay: number, bx: number, by: number, cx: number, cy: number) => {
            const mx = (ax + bx) >> 1;
            const my = (ay + by) >> 1;
            const shouldSubdivide = errors[this.index(mx, my)] > maxError;
            // || mx == 0 || mx == maxXY || my == 0 || my == maxXY || cx == 0 || cx == maxXY || cy == 0 || cy == maxXY;
            // const triangleIsSmall = Math.abs(ax - cx) <= 1 && Math.abs(ay - cy) <= 1;
            // const shouldSubdivide = errors[this.index(mx, my)] > maxError && !triangleIsSmall;
            // const shouldSubdivide = errors[this.index(mx, my)] > maxError && (Math.abs(ax - cx) + Math.abs(ay - cy) > 1);
            if (shouldSubdivide && (Math.abs(ax - cx) + Math.abs(ay - cy) > 1)) {
                processTriangle(cx, cy, ax, ay, mx, my);
                processTriangle(bx, by, cx, cy, mx, my);
            } else {
                const ia = meshIndices[this.curMeshIndex++] = this.addMeshVertex(ax, ay, terrain);
                const ib = meshIndices[this.curMeshIndex++] = this.addMeshVertex(bx, by, terrain);
                const ic = meshIndices[this.curMeshIndex++] = this.addMeshVertex(cx, cy, terrain);

                if (enableSkirts) {
                    if (this.isBorderEdge(ax, ay, bx, by)) this.addSkirtForEdge(ia, ib);
                    if (this.isBorderEdge(bx, by, cx, cy)) this.addSkirtForEdge(ib, ic);
                    if (this.isBorderEdge(cx, cy, ax, ay)) this.addSkirtForEdge(ic, ia);
                }
            }
        };

        // A ---- B
        // |  \   |
        // |   \  |
        // D ---- C
        processTriangle(0, 0, maxXY, maxXY, 0, maxXY); // A->C->D (CW)
        processTriangle(maxXY, maxXY, 0, 0, maxXY, 0); // C->A->B (CW)
        // processTriangle(maxXY, maxXY, 0, 0, 0, maxXY); // C->A->D (CCW)
        // processTriangle(0, 0, maxXY, maxXY, maxXY, 0); // A->C->B (CCW)

        const mesh: RTINMesh = {
            vertices: this.meshVertices.slice(0, this.curMeshVertexIndex * this.vertexStride),
            indices: meshIndices.slice(0, this.curMeshIndex),
            stride: this.vertexStride
        };
        if (enableSkirts) {
            mesh.skirtToMainVertexMap = this.skirtToMainVertexMap;
        }
        return mesh;
    }
}
