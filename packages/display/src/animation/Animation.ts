/*
 * Copyright (C) 2019-2020 HERE Europe B.V.
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
import * as Easings from './Easings';

type Animator = (v: number | number[]) => void;

export class Animation {
    from: number[];
    to: number[];

    private ts: number = 0;
    private duration: number;

    private af: number;
    private animator: Animator;
    private done;
    private easing;

    constructor(from: number | number[], to: number | number[], duration: number, easing: string | Animator, animator?: Animator) {
        this.from = typeof from == 'number' ? [from] : from;
        this.to = typeof to == 'number' ? [to] : to;
        this.duration = duration;

        if (typeof easing == 'function') {
            animator = easing;
            easing = 'linear';
        }

        this.easing = Easings[easing] || Easings.linear;

        this.animator = animator;

        this.animate = this.animate.bind(this);
    }

    private animate() {
        const {duration} = this;
        const current = Math.min(Date.now() - this.ts, duration);

        let curValues = this.from.map((v, i) => {
            const to = this.to[i];
            return v + this.easing(current / duration) * (to - v);
        });

        this.animator(curValues.length == 1 ? curValues[0] : curValues);

        if (current < duration) {
            this.af = requestAnimationFrame(this.animate);
        } else {
            this.done();
        }
    }

    async start() {
        return new Promise((resolve) => {
            this.done = resolve;
            if (!this.ts) {
                this.ts = Date.now();
                this.animate();
            } else {
                resolve();
            }
        });
    }

    stop() {
        cancelAnimationFrame(this.af);
        this.af = null;
    }
}

