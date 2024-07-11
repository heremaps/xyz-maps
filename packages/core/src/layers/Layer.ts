/*
 * Copyright (C) 2019-2022 HERE Europe B.V.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
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

import {Listener as Listeners} from '@here/xyz-maps-common';
import {LayerOptions} from './LayerOptions';


enum LAYER_EVENT {
    REMOVE = 'layerRemove',
    ADD = 'layerAdd',
    VISIBILITY_CHANGE = 'layerVisibilityChange',
}

let UNDEF;

/**
 * TileLayer
 */
export class Layer {
    /**
     * The name of the Layer
     */
    public name: string = '';

    protected _l: Listeners;

    protected __type = 'Layer';

    public tiled: boolean;

    /**
     * The identifier of the Layer.
     */
    public readonly id: string;

    /**
     * minimum zoom level at which data from the Layer is displayed.
     */
    public min: number;

    /**
     * maximum zoom level at which data from the Layer will be displayed.
     */
    public max: number;

    private visible: boolean;

    /**
     * @param options - options to configure the Layer
     */
    constructor(options: LayerOptions) {
        const layer = this;

        options = {visible: true, ...options};

        for (const c in options) {
            layer[c] = options[c];
        }

        if (layer.id == UNDEF) {
            (<any>layer).id = 'L-' + (Math.random() * 1e8 ^ 0);
        }

        layer._l = new Listeners(Object.values(LAYER_EVENT));
    };

    addEventListener(type: string, listener: (event: CustomEvent) => void, _c?) {
        const listeners = this._l;

        if (listeners.isDefined(type)) {
            return listeners.add(type, listener, _c);
        }
    };

    removeEventListener(type: string, listener: (event: CustomEvent) => void, _c?) {
        const listeners = this._l;

        if (listeners.isDefined(type)) {
            return listeners.remove(type, listener, _c);
        }
    };


    /**
     * Dispatch Layer event.
     *
     * @hidden
     * @internal
     *
     * @param type
     * @param detail
     */
    dispatchEvent(type: string, detail: { [name: string]: any, layer?: Layer }, async: boolean = false) {
        detail.layer = this;
        const event = new CustomEvent(type, {detail});
        this._l.trigger(type, event, !async);
    }

    /**
     * Sets the visibility of the Layer.
     *
     * This function controls whether the tile layer is currently displayed or hidden.
     *
     * @param {boolean} [isVisible] - A boolean value indicating whether the tile layer should be visible (true) or hidden (false).
     *
     * @returns {boolean} - The current visibility state of the tile layer.
     *
     * @example
     * ```
     * // Create a new tile layer
     * let tileLayer = new XYZMapsTileLayer();
     *
     * // Hide the tile layer
     * tileLayer.visible(false);
     *
     * // Show the tile layer
     * tileLayer.visible(true);
     * ```
     */
    setVisible(isVisible?: boolean) {
        if (typeof isVisible == 'boolean') {
            const {visible} = this;
            this.visible = !!isVisible;

            if (visible != isVisible) {
                this._l.trigger(LAYER_EVENT.VISIBILITY_CHANGE, new CustomEvent(LAYER_EVENT.VISIBILITY_CHANGE, {
                    detail: {
                        visible: isVisible,
                        layer: this
                    }
                }), false);
            }
        }
    }

    /**
     * Checks whether the xyz-maps tile layer is currently visible.
     *
     * @returns {boolean} - Returns `true` if the layer is visible, otherwise `false`.
     *
     * @example
     * ```
     * if (layer.isVisible()) {
     *   console.log("Layer is visible");
     * } else {
     *   console.log("Layer is not visible");
     * }
     * ```
     */
    isVisible(): boolean;
    isVisible(zoomLevel?: number): boolean;
    isVisible(zoomLevel?: number): boolean {
        return (!this.visible || zoomLevel == UNDEF)
            ? this.visible
            : zoomLevel >= this.min && zoomLevel <= this.max;
    }
}
