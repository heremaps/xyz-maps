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

type FeatureId = string | number;

interface FeatureBatch {
    data: object[];
    provider: {
        commit(
            changes: {put: object[]},
            onSuccess: (result: {inserted: FeatureId[]}) => void,
            onError: (error: unknown) => void
        ): unknown
    };
}

export default async function prepareFeatures(dataset: Record<string, FeatureBatch>): Promise<Record<string, FeatureId[]>> {
    const requests: Promise<FeatureId[]>[] = [];
    const layers: string[] = [];

    for (const layer in dataset) {
        const {data, provider} = dataset[layer];
        if (data.length) {
            requests.push(new Promise((resolve, reject) => {
                provider.commit({put: data}, (result) => resolve(result.inserted), reject);
            }));
            layers.push(layer);
        }
    }

    const inserted = await Promise.all(requests);
    const response: Record<string, FeatureId[]> = {};
    for (let i = 0; i < inserted.length; i++) {
        response[layers[i]] = inserted[i];
    }
    return response;
}
