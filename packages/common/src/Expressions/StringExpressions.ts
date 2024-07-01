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

export class StartsWithExpression extends Expression {
    static operator = '^=';

    eval(context) {
        const {json} = this;
        let string = this.operand(1, context);
        let searchString = this.operand(2, context);

        if (typeof string != 'string' || typeof searchString != 'string') {
            return false;
        }
        return string.startsWith(searchString);
    }
}

export class EndsWithExpression extends Expression {
    static operator = '$=';

    eval(context) {
        const {json} = this;
        let string = this.operand(1, context);
        let searchString = this.operand(2, context);

        if (typeof string != 'string' || typeof searchString != 'string') {
            return false;
        }
        return string.endsWith(searchString);
    }
}

export class SplitExpression extends Expression {
    static operator = 'split';

    eval(context) {
        let string = this.operand(1, context);
        let separator = this.operand(2, context);
        return string.split(separator);
    }
}

export class ToStringExpression extends Expression {
    static operator = 'to-string';

    eval(context) {
        let value = this.operand(1, context);
        return String(value);
    }
}

export class ConcatExpression extends Expression {
    static operator = 'concat';

    eval(context) {
        const {json} = this;
        let str = '';
        for (let i = 1, length = json.length; i < length; i++) {
            str += String(this.operand(i, context));
        }
        return str;
    }
}

export class RegexReplaceExpression extends Expression {
    static operator = 'regex-replace';

    eval(context) {
        let input = this.operand(1, context);
        if (typeof input != 'string') {
            return input;
        }

        let pattern = this.operand(2, context);
        if (typeof pattern != 'string') {
            return input;
        }

        let replacement = this.operand(3, context);
        if (typeof replacement != 'string') {
            return input;
        }
        return input.replace(new RegExp(pattern, 'g'), replacement);
    }
}
