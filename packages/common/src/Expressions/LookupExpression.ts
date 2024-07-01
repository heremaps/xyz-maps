/*
 * Copyright (C) 2019-2024 HERE Europe B.V.
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

import {Expression} from './Expression';

export class LiteralExpression extends Expression {
    static operator = 'literal';

    dynamic(): boolean {
        return false;
    }

    eval(context) {
        return this.json[1];
    }
}

class LookupExpressionError extends Error {
    constructor(message: string) {
        super(message);
        Object.setPrototypeOf(this, LookupExpressionError.prototype);
        this.name = this.constructor.name;
    }
}
export class LookupExpression extends Expression {
    static operator = 'lookup';

    static _lookupSearchKeyCache = new Map();
    static _lookupTableCache = new Map();


    private getLookupTable(table: any) {
        let map = LookupExpression._lookupTableCache.get(table);

        if (map && !Array.isArray(map)) {
            return map;
        }

        map = new Map();

        for (const item of table) {
            if (!(item?.keys && item?.attributes)) throw new LookupExpressionError('invalid lookup table');
            const keys = Object.getOwnPropertyNames(item.keys).sort();
            for (let i = 0, length = keys.length; i < length; i++) {
                const key = keys[i];
                keys[i] = `${key}=${item.keys[key]}`;
            }
            map.set(keys.join(';'), item.attributes);
        }

        LookupExpression._lookupTableCache.set(table, map);
        return map;
    }


    private getCombinations<T>(arr: T[]): T[][] {
        const n = arr.length;
        const combinations: T[][] = [];
        for (let i = 0; i < 1 << n; i++) {
            const currentCombination: T[] = [];
            for (let j = 0; j < n; j++) {
                if (i & (1 << j)) {
                    currentCombination.push(arr[j]);
                }
            }
            combinations.push(currentCombination);
        }
        return combinations;
    }

    private getLookupMapSearchKeys(exp) {
        let searchKeys: string[] = [];

        for (let i = 0, len = exp.length; i < len; i += 2) {
            searchKeys.push(exp[i] + '=' + exp[i + 1]);
        }
        const id = searchKeys.join(';');

        let combinations = LookupExpression._lookupSearchKeyCache.get(id);

        if (!combinations) {
            searchKeys.sort();
            combinations = this.getCombinations(searchKeys).sort((a, b) => b.length - a.length);
            for (let i = 0, len = combinations.length; i < len; i++) {
                combinations[i] = combinations[i].join(';');
            }
            LookupExpression._lookupSearchKeyCache.set(id, combinations);
        }

        return combinations;
    }

    eval(context) {
        const {json} = this;
        let table = this.operand(1, context);
        const keyValues: string[] = [];
        for (let i = 2; i < json.length; i++) {
            keyValues.push(this.operand(i, context));
        }

        let map = this.getLookupTable(table);
        let keys = this.getLookupMapSearchKeys(keyValues);
        for (let key of keys) {
            let val = map.get(key);
            if (val) {
                return val;
            }
        }
        return null;
    }
}
