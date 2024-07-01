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
import {Colors} from '../Color';
import toRGB = Colors.toRGB;

export class ZoomExpression extends Expression {
    static operator = 'zoom';

    dynamic() {
        return true;
    }

    eval(context) {
        return this.env.context.zoom;
        // return this.env.context.$zoom;
    }
}

const lerp = (x: number, y: number, a: number) => x + (y - x) * a;

export class InterpolateExpression extends Expression {
    static operator = 'interpolate';

    static supported = {'linear': lerp, 'discrete': (x) => x, 'exponential': lerp};

    dynamic(): boolean {
        for (let i = 2, len = this.json.length - 1; i < len; i += 2) {
            if (Expression.isDynamicExpression(this.compileOperand(i))) {
                return true;
            }
        }
        return false;
    }

    eval(context) {
        const {json} = this;
        const type = json[1]?.[0];
        const interpolate = InterpolateExpression.supported[type];
        if (!interpolate) {
            console.warn('unsupported interpolation expression:', type);
            return;
        }

        const value = this.operand(2, context);
        let int0;
        let int1;
        let value0;
        let value1;
        let i = 3;
        let len = json.length;

        for (; i < len; i += 2) {
            value1 = this.operand(i, context);
            if (value1 > value) {
                int1 = this.operand(i + 1, context);
                break;
            }
            value0 = value1;
        }

        if (i == 3) {
            // first step is already greater. we can simply return the first value.
            return int1;
        } else if (i == len) {
            // last step is still smaller. we can simply return the last value.
            return this.operand(len - 1, context);
        }
        let t;

        int0 = this.operand(i - 1, context);

        if (type == 'linear') {
            t = (value - value0) / (value1 - value0);
        } else if (type == 'exponential') {
            const base = json[1][1];
            t = base == 1
                ? (value - value0) / (value1 - value0)
                : (Math.pow(base, value - value0) - 1) / (Math.pow(base, value1 - value0) - 1);
        }
        let color = toRGB(int0, true);
        if (color != null) { // is color?
            if (typeof t == 'number') {
                int1 = toRGB(int1, true);
                return [
                    interpolate(color[0], int1[0], t),
                    interpolate(color[1], int1[1], t),
                    interpolate(color[2], int1[2], t),
                    interpolate(color[3], int1[3], t)
                ];
            }
            return color;
        }
        return interpolate(int0, int1, t);
    }
}

