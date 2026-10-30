/*
 * Copyright (C) 2019-2026 HERE Europe B.V.
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
import prepareFeatures from '@test/network/prepare-features';
import {describe, expect, it, vi} from 'vitest';

type Commit = Parameters<typeof prepareFeatures>[0][string]['provider']['commit'];

describe('Feature preparation commits', () => {
    it('returns an empty result without committing empty batches', async () => {
        const commit = vi.fn<Commit>();
        await expect(prepareFeatures({})).resolves.toEqual({});
        await expect(prepareFeatures({empty: {data: [], provider: {commit}}})).resolves.toEqual({});
        expect(commit).not.toHaveBeenCalled();
    });

    it('preserves layer association when commits finish in reverse order', async () => {
        const first = {id: 'first'};
        const second = {id: 'second'};
        let finishFirst: Parameters<Commit>[1];
        let finishSecond: Parameters<Commit>[1];
        const firstCommit = vi.fn<Commit>((changes, success) => {
            finishFirst = success;
        });
        const secondCommit = vi.fn<Commit>((changes, success) => {
            finishSecond = success;
        });
        const pending = prepareFeatures({
            first: {data: [first], provider: {commit: firstCommit}},
            second: {data: [second], provider: {commit: secondCommit}}
        });
        finishSecond({inserted: [42]});
        finishFirst({inserted: ['first-id']});
        await expect(pending).resolves.toEqual({first: ['first-id'], second: [42]});
        expect(firstCommit).toHaveBeenCalledWith({put: [first]}, expect.any(Function), expect.any(Function));
        expect(secondCommit).toHaveBeenCalledWith({put: [second]}, expect.any(Function), expect.any(Function));
    });

    it('rejects with the original asynchronous provider error', async () => {
        const error = new Error('Commit failed');
        let fail: Parameters<Commit>[2];
        const commit = vi.fn<Commit>((changes, success, failure) => {
            fail = failure;
        });
        const pending = prepareFeatures({layer: {data: [{}], provider: {commit}}});
        const rejected = expect(pending).rejects.toBe(error);
        fail(error);
        await rejected;
    });

    it('rejects when a provider throws while committing', async () => {
        const error = new Error('Commit threw');
        const commit = vi.fn<Commit>(() => {
            throw error;
        });
        await expect(prepareFeatures({layer: {data: [{}], provider: {commit}}})).rejects.toBe(error);
    });
});
