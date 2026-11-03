import {describe, expect, it} from 'vitest';
import {GeometryBuffer} from '../../../display/src/displays/webgl/buffer/GeometryBuffer';
import {computeNormals, generateWireframeIndices} from '../../../display/src/displays/webgl/buffer/geometry/geometryUtils';

describe('Extracted geometry utilities', () => {
    it('retains direct function aliases without a forwarding call', () => {
        expect(GeometryBuffer.computeNormals).toBe(computeNormals);
        expect(GeometryBuffer.generateWireframeIndices).toBe(generateWireframeIndices);
    });

    it('preserves flat and indexed normal winding and quantization', () => {
        const vertices = [0, 0, 0, 1, 0, 0, 0, 1, 0];
        expect(computeNormals(vertices)).toStrictEqual(new Int8Array([0, 0, -127, 0, 0, -127, 0, 0, -127]));
        expect(computeNormals(vertices, [0, 1, 2])).toStrictEqual(new Int8Array([0, 0, 127, 0, 0, 127, 0, 0, 127]));
    });

    it('preserves zero normals for degenerate triangles', () => {
        expect(computeNormals(new Float32Array(9))).toStrictEqual(new Int8Array(9));
    });

    it('deduplicates shared undirected edges while retaining first-edge ordering', () => {
        expect(generateWireframeIndices(new Uint16Array([0, 1, 2, 2, 1, 3]))).toStrictEqual(
            new Uint16Array([0, 1, 1, 2, 2, 0, 1, 3, 3, 2]));
    });

    it('retains 32-bit indexed and non-indexed wireframe ranges', () => {
        const expected = new Uint32Array([65535, 65536, 65536, 65537, 65537, 65535]);
        expect(generateWireframeIndices(new Uint32Array([65535, 65536, 65537]))).toStrictEqual(expected);
        expect(generateWireframeIndices(65535, 3)).toStrictEqual(expected);
        expect(() => Reflect.apply(generateWireframeIndices, undefined, [0])).toThrow('requires a vertex count');
    });
});
