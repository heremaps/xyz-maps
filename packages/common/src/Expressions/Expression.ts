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


let expId =0;
export abstract class Expression implements IExpression {
    static operator: string;
    id?: number;
    static isExpression(exp) {
        return exp instanceof Expression;
    }

    static isDynamicExpression(exp: Expression) {
        // return false;
        // return this.isExpression(exp) && false;
        return this.isExpression(exp) && exp.dynamic();
    }

    protected env: ExpressionParser;

    json: JSONExpression;

    supportsPartialEval: boolean = false;
    constructor(json: JSONExpression, env: ExpressionParser) {
        // this.id = expId++;
        this.json = json;
        this.env = env;
    }

    // compute(context);
    abstract eval(context);

    dynamic(): boolean {
        for (let i = 1, {json} = this, len = json.length; i < len; i++) {
            let exp = this.compileOperand(i);
            if (Expression.isDynamicExpression(exp)) {
                return true;
            }
        }
        return false;
    }

    protected compileOperand(index: number) {
        return this.json[index] = this.env.parseJSON(this.json[index]);
    }

    operand(index: number, context?) {
        return this.env.evaluateParsed(this.compileOperand(index), context);
    }

    toJSON() {
        return this.json.map((v)=>Expression.isExpression(v) ? v.toJSON(): v);
    }

    resolve(context=this.env.context, mode?: ExpressionMode) {
        const {env} = this;
        env.setMode(mode);
        const result = env.evaluate(this, context);
        env.setMode(ExpressionMode.static);
        return result;
    }
}
