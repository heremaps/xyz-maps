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
import {Context, Expression, JSONExpression} from './Expression';
import {ExpressionParser} from './ExpressionParser';

export * from './MathExpressions';
export * from './LogicalExpressions';
export * from './StringExpressions';
export * from './ArrayExpressions';
export * from './ConditionalExpressions';
export * from './LookupExpression';
export * from './TypeExpressions';

export class ReferenceExpression extends Expression {
    static operator = 'ref';

    dynamic(context: Context): false | Expression {
        return false;
    }

    eval(context) {
        return this.env.evaluate(this.env.resolveReference(this.json), context, this.env.getMode());
    }
}


class GetExpressionError extends Error {
    constructor(message: string) {
        super(message);
        Object.setPrototypeOf(this, GetExpressionError.prototype);
        this.name = this.constructor.name;
    }
}

export class GetExpression extends Expression {
    static operator = 'get';

    constructor(json: JSONExpression, expressions: ExpressionParser) {
        if (typeof json[1] != 'string') {
            throw new GetExpressionError('Name parameter must be of type string');
        }
        super(json, expressions);
    }

    dynamic(context: Context): false | Expression {
        return false;
    }

    eval(context) {
        let ctx = this.json[2];
        if (ctx) {
            context = this.operand(2, context);
        }
        // const name = this.operand(1, context);
        const name = this.json[1];
        let value = context?.[name];
        if (value === undefined) {
            value = this.env.context[name];
        }
        return value ?? null;
    }
}
