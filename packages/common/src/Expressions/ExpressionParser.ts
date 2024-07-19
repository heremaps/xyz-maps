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

import {Expression, Context, ExpressionMode, JSONExpression} from './Expression';
import * as Expressions from './Expressions';
import * as InterpolateExpressions from './InterpolateExpression';

// type Cache = Map<Expression, any> & { hits?: number };
interface Cache {
    hits?: number;

    get(key);

    set(key, value);

    clear();
}

type Def = JSONExpression | Expression | boolean | number | string | null | any[];
type Value = { value: Def };
type Definitions = { [name: string]: Def | Value };


class SimpleLinkCache implements Cache {
    hits = 0;
    clear() {
    }
    get(key) {
        return key._c;
    }
    set(key, value) {
        key._c = value;
    }
}

export class ExpressionParser {
    static isJSONExp(exp: any) {
        return Array.isArray(exp) && typeof exp[0] == 'string';
    }

    static Mode = ExpressionMode;
    static Expressions: {
        [op: string]: new (e: JSONExpression, p: ExpressionParser) => Expression & { [K in keyof typeof Expression]: typeof Expression[K] }
    };

    private definitions: Definitions;
    private cache: Cache = new Map();
    // private cache: Cache = new SimpleLinkCache();
    context: Context;
    private defaultResultCache: Cache = new Map();
    private resultCache: Cache;
    private _mode: ExpressionMode;
    dynamicResultCache: Cache = new Map();

    static {
        let expressions = {};
        for (let Exp of ([...Object.values(Expressions), ...Object.values(InterpolateExpressions)] as (typeof Expression)[])) {
            expressions[Exp.operator] = Exp;
        }
        this.Expressions = expressions;
    }

    constructor(definitions: Definitions = {}, context: Context = {}) {
        this.definitions = definitions;
        this.context = context;
        this.setMode(ExpressionMode.static);

        this.defaultResultCache.hits = 0;
        this.dynamicResultCache.hits = 0;
        this.cache.hits = 0;

        // console.time('clone definitions');
        // this.definitions = JSUtils.clone(definitions);
        // console.timeEnd('clone definitions');
        // this.cache.get = this.cache.set =()=>undefined;
        // this.defaultResultCache.get = this.defaultResultCache.set =()=>undefined;
        // this.dynamicResultCache.get = this.dynamicResultCache.set =()=>undefined;
    }

    init(def: Definitions, mapContext: Context) {
        this.clearCache();
        this.setDefinitions(def);
        this.context = mapContext;
    }

    setDefinitions(def: Definitions) {
        this.definitions = def;
    }

    clearCache() {
        this.cache.hits = 0;
        this.cache.clear();
    }

    evaluate(exp: Expression | JSONExpression, context: Context, mode: ExpressionMode = ExpressionMode.static, cache?) {
        let result;
        exp = this.parseJSON(exp);
        try {
            this.setMode(mode, cache);
            result = this.evaluateParsed(exp as Expression, context);
        } catch (e) {
            throw e;
        }
        return result;
    }

    evaluateParsed(exp: Expression, context: Context) {
        if (exp instanceof Expression) {
            if (this.getMode() === ExpressionParser.Mode.dynamic) {
                let dynamicResult = exp.dynamic(context);
                if (dynamicResult) {
                    return dynamicResult;
                }
            }

            let result = this.resultCache.get(exp);
            if (result !== undefined) {
                this.resultCache.hits++;
                return result;
            }

            result = exp.eval(context);

            this.resultCache.set(exp, result);
            return result;
        }
        return exp;
    }


    resolveReference(exp: JSONExpression, definitions: Definitions = this.definitions) {
        let key = exp?.[1];
        let value = definitions[key];
        if (value != null) {
            if ((value as Value).value != null) {
                value = (value as Value).value;
            }
            while (ExpressionParser.isJSONExp(value) && value[0] == 'ref') {
                value = definitions[value[1]];
                if ((value as Value).value !== undefined) {
                    value = (value as Value).value;
                }
            }
        }
        return value;
    }

    parseJSON(expression: Expression | JSONExpression, throwUnsupportedExpError?: boolean) {
        const isJSONExp = ExpressionParser.isJSONExp(expression);
        if (!isJSONExp) return expression;

        // let cacheKey = expression;
        let operator = expression[0];
        const isReferenceExp = operator == 'ref';
        let cacheKey = isReferenceExp ? expression[1] : expression;
        let exp = this.cache.get(cacheKey);
        if (exp != undefined) {
            this.cache.hits++;
            return exp;
        }
        if (isReferenceExp) {
            exp = this.resolveReference(expression as JSONExpression);
            if (!ExpressionParser.isJSONExp(exp)) {
                this.cache.set(cacheKey, exp);
                return exp;
            }
            expression = exp;
            [operator] = exp;
        }
        const Expression = ExpressionParser.Expressions[operator];

        if (Expression) {
            exp = new Expression(expression as JSONExpression, this);
        } else if (throwUnsupportedExpError !== false) {
            throw new Error(`Expression ${operator} unsupported`);
        } else {
            return;
        }

        this.cache.set(cacheKey, exp);
        return exp;
    }

    createExpression(jsonExp: JSONExpression) {
        const Expression = ExpressionParser.Expressions[jsonExp[0]];
        return Expression && new Expression(jsonExp, this);
    }

    clearResultCache() {
        this.defaultResultCache.clear();
    }

    clearDynamicResultCache() {
        this.dynamicResultCache.clear();
    }

    isSupported(exp: JSONExpression): boolean {
        return Boolean(ExpressionParser.Expressions[exp[0]]);
    }

    setMode(mode: ExpressionMode, cache?: Cache) {
        // if (mode != this._mode) {
        this._mode = mode;
        this.context.mode = mode;
        this.resultCache = cache || this.defaultResultCache;
        // this.resultCache = cache || (mode === ExpressionMode.static ? this.defaultResultCache : this.dynamicResultCache);
        // }
    }

    getMode(): ExpressionMode {
        return this._mode;
    }
}
