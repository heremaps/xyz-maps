/*
 * Copyright (C) 2019-2022 HERE Europe B.V.
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

import {JSUtils} from '@here/xyz-maps-common';
import {Animation} from './Animation';

const {isFunction} = JSUtils;

interface AnimatorOptions {
    onStart?: () => void;
    onStop?: () => void;
    easing?: Easing;

    [option: string]: any;
}

type Easing = string | ((t: number) => number);

abstract class Animator {
    private active: boolean;

    private animation: Animation = null;
    private easing: Easing;

    constructor(options: AnimatorOptions = {}) {
        let handler = this;

        this.easing = options.easing;

        if (isFunction(options.onStart)) {
            handler.onStart = options.onStart;
        }
        if (isFunction(options.onStop)) {
            handler.onStop = options.onStop;
        }
    }

    private onStart() {
    }

    private onStop() {
    }

    protected async animate(
        from: number | number[],
        to: number | number[],
        duration?: number,
        animate?: (value: number | number[]) => void
    ) {
        const animator = this;

        if (!animator.active) {
            animator.active = true;
            animator.onStart();

            animator.animation = new Animation(from, to, duration, this.easing, animate);

            await animator.animation.start();

            animator.onStop();
            animator.active = false;
            animator.animation = null;
        }
    };

    abstract start(...args: any);

    stop() {
        this.animation?.stop();
        this.active = false;
    }
}

export {Animator, AnimatorOptions};
