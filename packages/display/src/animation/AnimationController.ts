/*
 * Copyright (C) 2019-2025 HERE Europe B.V.
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

import {Easing, linear} from './Easings';

export interface AnimationOptions {
    duration?: number; // Total animation duration in ms
    loop?: boolean; // Whether to loop after finishing
    easing?: Easing; // Easing function
}

/**
 * Abstract base class for animation controllers.
 *
 * Manages timing, easing, looping, and basic control functions such as start, pause, resume, and cancel.
 * This generic controller can be extended to support various animation types
 * (e\.g\., for paths, markers, or camera movements).
 *
 * The actual animation logic should be implemented in the `updateFrame\(t\)` method by subclasses.
 */
export class AnimationController {
    protected running = false;
    protected paused = false;
    protected pauseOffset = 0;
    protected startTime = 0;
    protected rafId: number | null = null;
    protected onCompleteCb?: () => void;

    protected duration: number;
    protected loop: boolean;
    protected easing: Easing;
    private pauseOffsetStart: DOMHighResTimeStamp;

    constructor(options: AnimationOptions = {}) {
        this.duration = options.duration ?? 1000;
        this.loop = options.loop ?? false;
        this.easing = options.easing ?? linear;
    }

    /**
     * Start or restart the animation.
     */
    start(): void {
        this.running = true;
        this.paused = false;
        this.pauseOffset = 0;
        this.startTime = performance.now();
        this.rafId = requestAnimationFrame(this.frame.bind(this));
    }

    /**
     * Pause the animation.
     */
    pause(): void {
        if (!this.running || this.paused) return;
        this.paused = true;
        this.pauseOffsetStart = performance.now();
    }

    /**
     * Resume a paused animation.
     */
    resume(): void {
        if (!this.running || !this.paused) return;
        this.paused = false;
        if (this.pauseOffsetStart != null) {
            this.pauseOffset += performance.now() - this.pauseOffsetStart;
            this.pauseOffsetStart = undefined;
        }
    }

    /**
     * Cancel the animation.
     */
    cancel(): void {
        this.running = false;
        if (this.rafId != null) cancelAnimationFrame(this.rafId);
    }

    /**
     * Check if the animation is running.
     */
    isRunning(): boolean {
        return this.running && !this.paused;
    }

    /**
     * Set a callback to be invoked when the animation completes.
     */
    onComplete(cb: () => void) {
        this.onCompleteCb = cb;
    }

    /**
     * Returns a promise that resolves when the animation completes.
     */
    complete(): Promise<void> {
        return new Promise((resolve) => {
            this.onComplete(() => resolve());
        });
    }

    /**
     * Internal frame handler.
     * Calls updateFrame(t) which should be implemented by subclasses.
     */
    protected frame(now: number) {
        if (!this.running) return;
        if (this.paused) {
            this.rafId = requestAnimationFrame(this.frame.bind(this));
            return;
        }

        const elapsed = now - this.startTime - this.pauseOffset;
        let t = Math.max(0, Math.min(1, elapsed / this.duration));
        t = this.easing(t);

        this.updateFrame(t);

        if (elapsed >= this.duration) {
            if (this.loop) {
                this.startTime = performance.now();
                this.pauseOffset = 0;
                this.rafId = requestAnimationFrame(this.frame.bind(this));
            } else {
                this.running = false;
                this.onCompleteCb?.();
            }
            return;
        }

        this.rafId = requestAnimationFrame(this.frame.bind(this));
    }

    /**
     * Override this in subclasses to implement animation logic.
     * @param t normalized time [0..1] after easing
     */
    protected updateFrame(t: number): void {
    }
}
