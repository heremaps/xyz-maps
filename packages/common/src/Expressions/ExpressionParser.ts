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

import {Expression, ExpressionMode, IExpression, JSONExpression} from './Expression';
import * as Expressions from './Expressions';
import * as InterpolateExpressions from './InterpolateExpression';
import {JSUtils} from '@here/xyz-maps-common';

type ResultCache = Map<Expression, any> & { hits?: number };


class DynamicExpressionInterrupt extends Error {
    exp: Expression;

    constructor() {
        super('DynamicExpressionInterrupt');
        Object.setPrototypeOf(this, DynamicExpressionInterrupt.prototype);
        this.name = this.constructor.name;
    }
}

export class ExpressionParser {
    static DYNAMIC_EXPRESSION_INTERRUPT: DynamicExpressionInterrupt = new DynamicExpressionInterrupt();
    static Mode = ExpressionMode;
    static Expressions: {
        [op: string]: new (e: JSONExpression, p: ExpressionParser) => Expression & { [K in keyof typeof Expression]: typeof Expression[K] }
    };

    private definitions: {};
    private cache = new Map();
    context: { [name: string]: any };
    private _cacheHits: number = 0;
    private defaultResultCache: ResultCache = new Map();
    private resultCache: ResultCache;
    private _mode: ExpressionMode;
    private dynamicResultCache: ResultCache = new Map();

    static {
        let expressions = {};
        for (let Exp of ([...Object.values(Expressions), ...Object.values(InterpolateExpressions)] as (typeof Expression)[])) {
            expressions[Exp.operator] = Exp;
        }
        this.Expressions = expressions;
    }

    constructor(definitions = {}, context = {}) {
        this.definitions = definitions;
        this.context = context;
        this.setMode(ExpressionMode.static);
        // console.time('clone definitions');
        // this.definitions = JSUtils.clone(definitions);
        // console.timeEnd('clone definitions');

        // this.cache.get = this.cache.set =()=>undefined;
        // this.defaultResultCache.get = this.defaultResultCache.set =()=>undefined;
        // this.dynamicResultCache.get = this.defaultResultCache.set =()=>undefined;
    }

    init(def, mapContext) {
        this.clearCache();
        this.setDefinitions(def);
        this.context = mapContext;
    }

    setDefinitions(def) {
        this.definitions = def;
    }

    clearCache() {
        this._cacheHits = 0;
        this.cache.clear();
    }

    evaluate(exp, context) {
        exp = this.parseJSON(exp);
        let result;
        try {
            result = this.evaluateParsed(exp, context);
        } catch (e) {
            if (e.message === 'DynamicExpressionInterrupt') {
                return e.exp;
            } else {
                throw e;
            }
        }
        return result;
    }

    evaluateParsed(exp: Expression, context) {
        if (exp instanceof Expression) {
            if (this.getMode() == ExpressionParser.Mode.dynamic && exp.dynamic() && !exp.supportsPartialEval) {
                const DYNAMIC_EXPRESSION_INTERRUPT = ExpressionParser.DYNAMIC_EXPRESSION_INTERRUPT;
                DYNAMIC_EXPRESSION_INTERRUPT.exp = exp;
                throw DYNAMIC_EXPRESSION_INTERRUPT;
            }
            // return exp.eval(context);
            let result = this.resultCache.get(exp);
            if (result !== undefined) {
                this.resultCache.hits = (this.resultCache.hits || 0) + 1;
                return result;
            }
            result = exp.eval(context);

            this.resultCache.set(exp, result);
            return result;
        }
        return exp;
    }


    resolveReference(exp: JSONExpression, definitions = this.definitions) {
        let key = exp?.[1];
        let value = definitions[key];
        if (value != null) {
            if (value.value != null) {
                value = value.value;
            }
            while (ExpressionParser.isJSONExp(value) && value[0] == 'ref') {
                value = definitions[value[1]];
                if (value.value !== undefined) {
                    value = value.value;
                }
            }
        }
        return value;
    }

    parseJSON(expression: Expression | JSONExpression, throwUnsupportedExpError?: boolean) {
        const isJSONExp = ExpressionParser.isJSONExp(expression);
        if (!isJSONExp) return expression;

        let operator = expression[0];
        const isReferenceExp = operator == 'ref';
        let cacheKey = isReferenceExp ? expression[1] : expression;
        let exp = this.cache.get(cacheKey);
        if (exp != undefined) {
            this._cacheHits++;
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

    static isJSONExp(exp) {
        return Array.isArray(exp) && typeof exp[0] == 'string';
    }

    clearResultCache() {
        this.defaultResultCache.clear();
        this.dynamicResultCache.clear();
    }

    isSupported(exp: JSONExpression) {
        return Boolean(ExpressionParser.Expressions[exp[0]]);
    }

    setMode(mode: ExpressionMode) {
        if (mode != this._mode) {
            this._mode = mode;
            this.context.mode = mode;
            this.resultCache = mode === ExpressionMode.static ? this.defaultResultCache : this.dynamicResultCache;
        }
    }

    getMode() {
        return this._mode;
    }
}
