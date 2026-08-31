/*
 * Copyright (C) 2019-2026 HERE Europe B.V.
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
export type CameraTransaction = 'none' | 'pivot';


/**
 * Coordinates camera interaction and internal camera transactions.
 * This is intentionally independent from camera geometry and WebGL rendering.
 */
export class CameraUpdateState {
    private _gestureActive = false;
    private _animationCount = 0;
    private _pivotCommitDepth = 0;

    private isInteractionActive(): boolean {
        return this._gestureActive || this._animationCount > 0;
    }

    private transaction(): CameraTransaction {
        return this._pivotCommitDepth ? 'pivot' : 'none';
    }

    canCorrectTerrain(): boolean {
        return this.transaction() == 'none';
    }

    canUpdatePivot(): boolean {
        return this.transaction() == 'none' && !this.isInteractionActive();
    }

    canApplyTerrainZoomClamp(): boolean {
        return this.transaction() == 'none';
    }

    useFixedPointCorrection(): boolean {
        return this.transaction() == 'none';
    }

    beginGesture(): boolean {
        const wasActive = this._gestureActive;
        this._gestureActive = true;
        return !wasActive;
    }

    endGesture(): boolean {
        const wasActive = this._gestureActive;
        this._gestureActive = false;
        return wasActive;
    }

    beginAnimation(): void {
        this._animationCount++;
    }

    endAnimation(): void {
        if (this._animationCount) this._animationCount--;
    }

    withPivotCommit<T>(callback: () => T): T {
        this._pivotCommitDepth++;
        try {
            return callback();
        } finally {
            this._pivotCommitDepth--;
        }
    }
}
