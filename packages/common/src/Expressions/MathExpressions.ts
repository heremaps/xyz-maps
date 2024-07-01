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

class SimpleOperatorExpression extends Expression {
    dynamic(): boolean {
        return Expression.isDynamicExpression(this.compileOperand(1)) ||
            Expression.isDynamicExpression(this.compileOperand(2));
    }

    eval(context) {
    }
}

export class SumExpression extends SimpleOperatorExpression {
    static operator = '+';
    eval(context) {
        const {json} = this;
        // this.env._expressionRequiresLiveMode ||= this;
        let sum = 0;
        // max 17.5ms
        for (let i = 1, {length} = json; i < length; i++) {
            sum += Number(this.operand(i, context)) || 0;
        }
        // this.env._expressionRequiresLiveMode = null;
        return sum;
    }
}

export class SubtractExpression extends SimpleOperatorExpression {
    static operator = '-';

    eval(context) {
        let a = this.operand(1, context);
        let b = this.operand(2, context);
        return Number(a) - Number(b);
    }
}

export class MultiplyExpression extends SimpleOperatorExpression {
    static operator = '*';

    eval(context) {
        let a = this.operand(1, context);
        let b = this.operand(2, context);
        return Number(a) * Number(b);
    }
}

export class DevideExpression extends SimpleOperatorExpression {
    static operator = '/';

    eval(context) {
        let a = this.operand(1, context);
        let b = this.operand(2, context);
        return Number(a) / Number(b);
    }
}

export class ModulusExpression extends SimpleOperatorExpression {
    static operator = '%';

    eval(context) {
        let a = this.operand(1, context);
        let b = this.operand(2, context);
        return Number(a) % Number(b);
    }
}


class FloorExpressionError extends Error {
    constructor(message: string) {
        super(message);
        Object.setPrototypeOf(this, FloorExpressionError.prototype);
        this.name = this.constructor.name;
    }
}
export class FloorExpression extends Expression {
    static operator = 'floor';

    eval(context) {
        const val = this.operand(1, context);
        if (typeof val != 'number') {
            throw new FloorExpressionError('invalid operand type ' + this.json);
        }
        return Math.floor(val);
    }
}

export class MinExpression extends Expression {
    static operator = 'min';

    eval(context) {
        const {json} = this;
        let min = Infinity;
        for (let i = 1, {length} = json; i < length; i++) {
            let val = this.operand(i, context);
            if (val < min) min = val;
        }
        return min;
    }
}

export class MaxExpression extends Expression {
    static operator = 'max';

    eval(context) {
        const {json} = this;
        let max = -Infinity;
        for (let i = 1, {length} = json; i < length; i++) {
            let val = this.operand(i, context);
            if (val > max) max = val;
        }
        return max;
    }
}
