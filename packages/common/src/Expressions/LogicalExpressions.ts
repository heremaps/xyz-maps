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

export class AllExpression extends Expression {
    static operator = 'all';

    eval(context) {
        const {json} = this;
        for (let i = 1, {length} = json; i < length; i++) {
            if (!Boolean(this.operand(i, context))) return false;
        }
        return true;
    }
}

export class AnyExpression extends Expression {
    static operator = 'any';

    eval(context) {
        const {json} = this;
        for (let i = 1, {length} = json; i < length; i++) {
            if (Boolean(this.operand(i, context))) return true;
        }
        return false;
    }
}

export class isFalseExpression extends Expression {
    static operator = '!';
    eval(context) {
        let val = this.operand(1, context);
        return !val;
    }
}

export class HasNotExpression extends Expression {
    static operator = '!has';

    eval(context) {
        const {json} = this;
        const property = json[1];
        let object = this.operand(2, context);
        return !(object ?? context)?.hasOwnProperty(property);
    }
}

export class NotInExpression extends HasNotExpression {
    static operator = '!has';
}

export class HasExpression extends Expression {
    static operator = 'has';

    dynamic(): boolean {
        return false;
    }

    eval(context) {
        const {json} = this;
        const property = json[1];
        let object = this.operand(2, context);
        return (object ?? context)?.hasOwnProperty(property) || false;
    }
}


export class NoneExpression extends Expression {
    static operator = 'none';

    eval(context) {
        const {json} = this;
        for (let i = 1, {length} = json; i < length; i++) {
            let val = this.operand(1, context);
            if (val) return false;
        }
        return true;
    }
}


class CompareExpression extends Expression {
    dynamic(): boolean {
        const a = this.compileOperand(1);
        if (Expression.isDynamicExpression(a)) {
            return true;
        }
        const b = this.compileOperand(2);
        if (Expression.isDynamicExpression(b)) {
            return true;
        }
        return false;
    }

    eval(context) {
    }
}

export class EqualsExpression extends CompareExpression {
    static operator = '==';

    eval(context) {
        const a = this.operand(1, context);
        const b = this.operand(2, context);
        return a == b;
    }
}

export class NotEqualsExpression extends CompareExpression {
    static operator = '!=';

    eval(context) {
        const a = this.operand(1, context);
        const b = this.operand(2, context);
        return a != b;
    }
}

export class GreaterExpression extends CompareExpression {
    static operator = '>';

    eval(context) {
        const a = this.operand(1, context);
        const b = this.operand(2, context);
        return a > b;
    }
}

export class GreaterOrEqualExpression extends CompareExpression {
    static operator = '>=';

    eval(context) {
        const a = this.operand(1, context);
        const b = this.operand(2, context);
        return a >= b;
    }
}


export class SmallerOrEqualExpression extends CompareExpression {
    static operator = '<=';

    eval(context) {
        const a = this.operand(1, context);
        const b = this.operand(2, context);
        return a <= b;
    }
}

export class SmallerExpression extends CompareExpression {
    static operator = '<';

    eval(context) {
        const a = this.operand(1, context);
        const b = this.operand(2, context);
        return a < b;
    }
}
