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

class TypeOfExpressionError extends Error {
    constructor(message: string) {
        super(message);
        Object.setPrototypeOf(this, TypeOfExpressionError.prototype);
        this.name = this.constructor.name;
    }
}

class TypeOfExpression extends Expression {
    eval(context) {
        const {json} = this;
        const type = json[0];
        for (let i = 1, len = json.length; i <len; i++) {
            let value = this.operand(i, context);
            if (typeof value == type) return value;
        }
        throw new TypeOfExpressionError('expected type: ' + type);
    }
}

export class NumberExpression extends TypeOfExpression {
    static operator = 'number';
}

export class BooleanExpression extends TypeOfExpression {
    static operator = 'boolean';
}


class ToNumberExpressionError extends Error {
    constructor(message: string) {
        super(message);
        Object.setPrototypeOf(this, ToNumberExpressionError.prototype);
        this.name = this.constructor.name;
    }
}
export class ToNumberExpression extends Expression {
    static operator = 'to-number';

    eval(context) {
        const {json} = this;
        for (let i = 1; i < json.length; i++) {
            let value = this.operand(i, context);
            value = Number(value);
            if (!isNaN(value)) return value;
        }
        throw new ToNumberExpressionError('convert error: ' + json);
    }
}

export class ToBooleanExpression extends Expression {
    static operator = 'to-boolean';

    eval(context) {
        const {json} = this;
        let value = this.operand(1, context);
        return Boolean(value);
    }
}
