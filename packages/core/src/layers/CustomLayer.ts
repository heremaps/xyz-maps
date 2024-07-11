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

import {Layer} from './Layer';
import {LayerStyle} from '../styles/LayerStyle';
import {LayerOptions} from './LayerOptions';

/**
 * Options to configure the CustomLayer.
 */
interface CustomLayerOptions extends LayerOptions {
    /**
     * Event Listener that will be called when the layer is added to the display.
     * @param ev - Event of type "layerAdd"
     */
    onLayerAdd?(ev: CustomEvent);
    /**
     * Event Listener that will be called when the layer is removed from the display.
     * @param ev - Event of type "layerRemove"
     */
    onLayerRemove?(ev: CustomEvent);

    /**
     * Options to configure the renderer.
     */
    renderOptions?: {
        /**
         * The used rendering mode.
         * Use '2d' for traditional flat map layers that are located on the ground-plane, otherwise '3d'.
         *
         * @DefaultValue: '2d'
         */
        mode?: '2d' | '3d' | string,
        /**
         * Indicates the drawing order within the layer.
         * Styles with larger zIndex value are rendered above those with smaller values.
         * The zIndex is defined relative to the "zLayer" property.
         * If "zLayer" is defined all zIndex values are relative to the "zLayer" value.
         */
        zIndex?: number,
        /**
         * Indicates drawing order across multiple layers.
         * Styles using zLayer with a high value are rendered on top of zLayers with a low value.
         * If no zLayer is defined the zLayer depends on the display layer order.
         * The first (lowest) layer has a zLayer value of 1.
         *
         * @example \{...zLayer: 2, zIndex: 5\} will be rendered on top of \{...zLayer: 1, zIndex: 10\}
         */
        zLayer?: number;
    }
    /**
     * The render function will be called each frame.
     * It enables seamless drawing into the rendering context of the map.
     * The context states are correctly set already to allow "simple" drawing at the respective zIndex/zLayer.
     * The camera matrix projects from the world coordinate system (WebMercator projected, topLeft [0,0] -> bottomRight [1,1]) to the clipspace.
     *
     * @param context - the rendering context of the map.
     * @param matrix - the camera matrix of the map.
     */
    render?(context: WebGLRenderingContext | CanvasRenderingContext2D, matrix: Float64Array);
};

/**
 * The CustomLayer can be used to integrate custom renderers to the map display.
 */
export class CustomLayer extends Layer {
    custom: boolean = true;

    style = {};
    /**
     * @internal
     * @hidden
     */
    tiled: boolean = false;
    /**
     * @internal
     * @hidden
     */
    flat: boolean;

    /**
     * Options to configure the renderer.
     */
    renderOptions: {
        /**
         * The used rendering mode.
         * Use '2d' for traditional flat map layers that are located on the ground-plane, otherwise '3d'.
         *
         * @DefaultValue: '2d'
         */
        mode?: '2d' | '3d' | string,
        /**
         * Indicates the drawing order within the layer.
         * Styles with larger zIndex value are rendered above those with smaller values.
         * The zIndex is defined relative to the "zLayer" property.
         * If "zLayer" is defined all zIndex values are relative to the "zLayer" value.
         */
        zIndex?: number,
        /**
         * Indicates drawing order across multiple layers.
         * Styles using zLayer with a high value are rendered on top of zLayers with a low value.
         * If no zLayer is defined the zLayer depends on the display layer order.
         * The first (lowest) layer has a zLayer value of 1.
         *
         * @example \{...zLayer: 2, zIndex: 5\} will be rendered on top of \{...zLayer: 1, zIndex: 10\}
         */
        zLayer?: number;
        /**
         * @internal
         * @hidden
         */
        alpha?: number;
    };

    /**
     * @param options - options to configure the CustomLayer
     */
    constructor(options?: CustomLayerOptions) {
        super(options || {});

        const layer = this;
        const onLayerAdd = layer.onLayerAdd;
        const onLayerRemove = layer.onLayerRemove;

        if (onLayerAdd) {
            layer.addEventListener('layerAdd', layer.onLayerAdd = (ev) => {
                layer.init();
                onLayerAdd.call(layer, ev);
            });
        }

        if (onLayerRemove) {
            layer.addEventListener('layerRemove', layer.onLayerRemove = onLayerRemove.bind(layer));
        }
    }

    private init() {
        const renderOptions = this.renderOptions ||= {};
        const mode = renderOptions.mode ||= '2d';
        this.flat = mode == '2d';
    }

    /**
     * Event Listener that will be called when the layer is added to the display.
     * @param ev - Event of type "layerAdd"
     */
    onLayerAdd(ev: CustomEvent) {

    };

    /**
     * Event Listener that will be called when the layer is removed from the display.
     * @param ev - Event of type "layerRemove"
     */
    onLayerRemove(ev: CustomEvent) {

    };

    /**
     * The render function will be called each frame.
     * It enables seamless drawing into the rendering context of the map.
     * The context states are correctly set already to allow "simple" drawing at the respective zIndex/zLayer.
     * The camera matrix projects from the world coordinate system (WebMercator projected, topLeft [0,0] -> bottomRight [1,1]) to the clipspace.
     *
     * @param context - the rendering context of the map.
     * @param matrix - the camera matrix of the map.
     */
    render(context: WebGLRenderingContext | CanvasRenderingContext2D, matrix: Float64Array) {

    };

    pointerEvents(active?: boolean): boolean {
        return false;
    };


    getCopyright() {

    }

    getStyle(): LayerStyle {
        return this.style as LayerStyle;
    }
}
