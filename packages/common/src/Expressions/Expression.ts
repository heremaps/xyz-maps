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
import {ExpressionParser} from './ExpressionParser';

export enum ExpressionMode {
    static,
    dynamic
};

export interface IExpression {
    json: any[];

    eval(context: any);
}

export type JSONExpression = [string, ...any[]];

export type Context = { [name: string]: any };

let expId = 0;

export abstract class Expression implements IExpression {
    static operator: string;
    protected id?: string | number;

    static isExpression(exp) {
        return exp instanceof Expression;
    }

    static isDynamicExpression(exp: Expression, context: Context): false | Expression {
        return this.isExpression(exp) && exp.dynamic(context);
    }

    protected env: ExpressionParser;

    json: JSONExpression;

    constructor(json: JSONExpression, env: ExpressionParser) {
        // this.id = ++expId;
        this.json = json;
        this.env = env;
    }

    clone(jsonExp?: JSONExpression) {
        return new (<any> this).constructor(jsonExp || this.toJSON(), this.env);
    }

    // compute(context);
    abstract eval(context);

    dynamic(context: Context, start = 1, step = 1, stop?: number): false | Expression {
        const operands: JSONExpression = [this.json[0]];
        let partial = false;
        let dynamic: false | Expression = false;
        for (let i = start, {json} = this, len = stop || json.length; i < len; i += step) {
            let o = this.compileOperand(i);
            if (Expression.isExpression(o)) {
                let isDynamic = o.dynamic(context);
                if (isDynamic) {
                    dynamic = this;
                    let isClonedExpression = typeof isDynamic === 'object' && isDynamic != o;
                    if (isClonedExpression) {
                        partial = true;
                        o = isDynamic;
                    }
                }
            }
            operands[i] = o;
        }
        return partial ? this.clone(operands) : dynamic;
    }

    protected compileOperand(index: number) {
        return this.json[index] = this.env.parseJSON(this.json[index]);
    }

    operand(index: number, context?) {
        return this.env.evaluateParsed(this.compileOperand(index), context);
    }

    toJSON() {
        return this.json.map((v) => Expression.isExpression(v) ? v.toJSON() : v);
    }

    resolve(context?, mode?: ExpressionMode) {
        const {env} = this;
        let cache;
        if (context === undefined) {
            // resolve dynamic expression
            context = this.env.context;
            cache = env.dynamicResultCache;
        }
        return env.evaluate(this, context, mode, cache);
    }

    private getId() {
        return this.id ||= ++expId;
    }
}
