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
export class SliceExpression extends Expression {
    static operator = 'slice';

    eval(context) {
        const array = this.operand(1, context);
        const start = this.operand(2, context);
        const end = this.operand(3, context);

        return array.slice(start, end);
    }
}

export class AtArrayExpression extends Expression {
    static operator = 'at';

    eval(context) {
        const index = this.operand(1, context);
        const array = this.operand(2, context);
        return array[index];
    }
}

export class LengthExpression extends Expression {
    static operator = 'length';

    eval(context) {
        const stringOrArray = this.operand(1, context);
        return stringOrArray.length;
    }
}
