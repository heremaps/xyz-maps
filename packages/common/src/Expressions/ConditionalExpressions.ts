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

import {Context, Expression, ExpressionMode, JSONExpression} from './Expression';

class CaseExpressionError extends Error {
    constructor(message: string) {
        super(message);
        Object.setPrototypeOf(this, CaseExpressionError.prototype);
        this.name = this.constructor.name;
    }
}

export class CaseExpression extends Expression {
    static operator = 'case';
    private conditionIndex: number;

    constructor(json, env) {
        if (json.length < 4) {
            throw new CaseExpressionError('invalid arguments');
        }
        if (json.length % 2) {
            throw new CaseExpressionError('missing fallback');
        }
        super(json, env);
    }

    dynamic(context: Context): false | Expression {
        const operands: JSONExpression = [this.json[0]];
        let partial = false;
        let dynamic: false | Expression = false;
        this.conditionIndex = 1;
        for (let i = 1, branch = 2, {json} = this, len = json.length, fbIndex = len - 1; i < len; i++) {
            let exp = this.compileOperand(i);
            const isCondition = Boolean(i % 2);
            const isFallback = i == fbIndex;
            if (Expression.isExpression(exp)) {
                let dynamicExpression = exp.dynamic(context);
                if (dynamicExpression) {
                    let isClonedExpression = typeof dynamicExpression === 'object' && dynamicExpression != exp;
                    if (isClonedExpression) {
                        partial = true;
                        exp = dynamicExpression;
                    }
                    if (!dynamic && (!isCondition || isFallback)) {
                        return dynamicExpression;
                    }
                    dynamic = <Expression> this;
                }
            } else if (isCondition) {
                // make sure it's not fallback
                if (!isFallback) {
                    // unreachable -> we can skip statement;
                    i++;
                    this.conditionIndex = i + 1;
                    continue;
                }
            }
            operands[i] = exp;
        }
        if (partial) {
            return this.clone(operands);
            // return this.clone(operands).eval(context);
        }
        return dynamic;
    }

    eval(context) {
        const {json} = this;
        let len = json.length - 1;
        for (let i = this.conditionIndex || 1; i < len; i += 2) {
            let condition = this.operand(i, context);
            if (condition) {
                return this.operand(i + 1, context);
            }
        }
        // result or fallback
        return this.operand(len, context);
    }
}

export class StepExpression extends Expression {
    static operator = 'step';

    // dynamic(context): boolean {
    //     return super.dynamic(context, 1, 1, 4);
    // }

    eval(context) {
        let input = this.operand(1, context);
        let defaultValue = this.operand(2, context);
        let step = this.operand(3, context);

        if (input < step) return defaultValue;

        const {json} = this;
        for (let i = json.length - 2; i > 2; i -= 2) {
            if (input >= json[i]) {
                return json[i + 1];
            }
        }
    }
}

export class MatchExpression extends Expression {
    static operator = 'match';

    dynamic(context: Context): false|Expression {
        for (let i = 1, len = this.json.length - 2; i < len; i += 2) {
            if (Expression.isDynamicExpression(this.compileOperand(i), context)) {
                return this;
            }
        }
        if (Expression.isDynamicExpression(this.compileOperand(this.json.length - 1), context)) {
            return this;
        }
        return false;
    }

    eval(context) {
        const {json} = this;
        const value = this.operand(1, context);
        const len = json.length - 2;

        for (let i = 2; i < len; i += 2) {
            let labels = json[i];
            if (!Array.isArray(labels)) labels = [labels];
            for (let label of labels) {
                if (label == value) {
                    return this.operand(i + 1, context);
                }
            }
        }
        return this.operand(json.length - 1, context);
    }
}
