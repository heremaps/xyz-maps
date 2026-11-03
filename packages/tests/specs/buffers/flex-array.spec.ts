import {describe, expect, it} from 'vitest';
import {FlexArray} from '../../../display/src/displays/webgl/buffer/FlexArray';
import {ModelBuffer} from '../../../display/src/displays/webgl/buffer/types/ModelBuffer';

describe('FlexArray capacity and writes', () => {
    it('does not grow while appends fit the existing capacity', () => {
        const array = new FlexArray(Float32Array, 128);
        const store = array.data;
        for (let i = 0; i < 8; i++) array.set(new Float32Array(16).fill(i), array.length);
        expect(array.length).toBe(128);
        expect(array.data).toBe(store);
        array.push(9);
        expect(array.size).toBe(256);
        expect(array.get(112)).toBe(7);
    });

    it('preserves length and the tail when overwriting or writing an empty array', () => {
        const array = new FlexArray(new Float32Array([1, 2, 3, 4]));
        array.set([9], 1);
        array.set([], 0);
        expect(array.length).toBe(4);
        expect(Array.from(array.trim())).toStrictEqual([1, 9, 3, 4]);
    });

    it('reserves gaps and large appends without losing existing values', () => {
        const array = new FlexArray(Float32Array, 4);
        array.push(1, 2);
        array.set([5, 6], 4);
        expect(Array.from(array.trim())).toStrictEqual([1, 2, 0, 0, 5, 6]);
        const large = new FlexArray(Float32Array, 4);
        large.set(new Float32Array(100).fill(7));
        expect(large.length).toBe(100);
        expect(large.size).toBe(100);
        expect(large.get(99)).toBe(7);
    });

    it('surfaces invalid offsets rather than accepting failed writes', () => {
        const array = new FlexArray(Float32Array);
        expect(() => array.set([1], -1)).toThrow(RangeError);
        expect(array.length).toBe(0);
    });
});

describe('Model instance matrix ownership', () => {
    it('copies scratch results and retains independent normal matrices', () => {
        const buffer = new ModelBuffer();
        const other = new ModelBuffer();
        const rotation = [0, 0, Math.PI / 2];
        const reference = [0, 0, 2, 0, -3, 0, 0, 0, 0, 4, 0, 0, 1, 3, 2, 1];
        buffer.addInstance(1, 2, 3, [2, 3, 4], [1, 2, 3], rotation);
        const normal = buffer.uniforms.u_normalMatrix;
        const retainedNormal = Array.from(normal);
        buffer.addInstance(4, 5, 6);
        other.addInstance(7, 8, 9, [5, 6, 7]);
        reference.forEach((value, index) => expect(buffer.flexAttributes.a_modelMatrix.data.get(index)).toBeCloseTo(value, 6));
        expect(buffer.uniforms.u_normalMatrix).not.toBe(normal);
        expect(Array.from(normal)).toStrictEqual(retainedNormal);
        expect(other.uniforms.u_normalMatrix).not.toBe(buffer.uniforms.u_normalMatrix);
    });
});
