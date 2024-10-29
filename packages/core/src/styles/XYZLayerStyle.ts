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

import {Feature} from '../features/Feature';
import {
    AmbientLight, DirectionalLight,
    LayerStyle,
    Style,
    StyleGroup,
    StyleGroupMap,
    StyleValueFunction
} from '../styles/LayerStyle';
import {Expression, ExpressionMode, ExpressionParser} from '@here/xyz-maps-common';
import {TileLayer} from '../layers/TileLayer';

const isTypedArray = (() => {
    const TypedArray = Object.getPrototypeOf(Uint8Array);
    return (obj) => obj instanceof TypedArray;
})();

function mixin(to, from) {
    for (const f in from) {
        to[f] = from[f];
    }
    return to;
}

const EMPTY_STYLE = [];

let UNDEF;

const deepCopy = (src: any) => {
    if (typeof src !== 'object' || src === null) {
        return src;
    }
    let cpy;
    if (Array.isArray(src)) {
        cpy = new Array(src.length);
        for (let i = 0, len = src.length; i < len; i++) {
            cpy[i] = deepCopy(src[i]);
        }
    } else if (isTypedArray(src)) {
        cpy = src.slice();
    } else {
        cpy = {};
        for (let key in src) {
            cpy[key] = deepCopy(src[key]);
        }
    }
    return cpy;
};

/**
 * XYZLayerStyle
 * @hidden
 */
export class XYZLayerStyle implements LayerStyle {
    styleGroups = null;
    private _c: StyleGroupMap = null;
    /**
     * definitions
     * @hidden
     */
    definitions: LayerStyle['definitions'];

    backgroundColor?: LayerStyle['backgroundColor'];
    lights: LayerStyle['lights'] = {};

    protected expContext: {
        $geometryType: string;
        $layer: string;
        $zoom: number;
        $id: string | number;
        [$name: string]: any;
    } = {
            $geometryType: null,
            $layer: null,
            $zoom: 0,
            $id: null
        };
    private layer: TileLayer;
    /**
     * XYZLayerStyle
     * @protected
     * @hidden
     */
    protected expParser: ExpressionParser;
    private flatStyles?: Style[];
    private _filteredStyleGrp: StyleGroup;

    private _style: LayerStyle;

    /**
     *
     * @param styleJSON
     * @hidden
     */
    constructor(styleJSON: LayerStyle) {
        for (let p in styleJSON) {
            const property = styleJSON[p];
            this[p] = p == 'styleGroups' ? deepCopy(property) : property;
        }

        this.definitions ||= {};
        this.expParser = new ExpressionParser(this.definitions, this.expContext);

        if (!styleJSON.assign) {
            const flatStyles = [];
            for (let name in this.styleGroups) {
                let styleGrp = this.styleGroups[name];
                if (!Array.isArray(styleGrp)) {
                    styleGrp = [styleGrp];
                }
                for (let style of styleGrp) {
                    if (style.filter) {
                        if (ExpressionParser.isJSONExp(style.filter)) {
                            //     style.filter = this.createExpEvaluator(style.filter);
                            style.filter = this.expParser.parseJSON(style.filter);
                        }
                        flatStyles.push(style);
                    }
                }
            }
            this.flatStyles = flatStyles;

            this._filteredStyleGrp = [];
        }
        this._style = styleJSON;

        this.setBgColor(styleJSON.backgroundColor);

        if (styleJSON.lights) {
            this.setLights(styleJSON.lights);
        }
    }

    /**
     * setLights
     * @param lights
     * @hidden
     */
    setLights(lights: LayerStyle['lights']) {
        this.lights = {};
        for (let name in lights) {
            let validLights = [];
            const lightSet = lights[name];
            for (let light of lightSet) {
                if (light?.type && light.color) {
                    if (light.type == 'ambient' || Array.isArray((light as DirectionalLight).direction) ) {
                        validLights.push(light);
                    }
                }
            }
            if (validLights.length) {
                this.lights[name] = validLights;
            }
        }
    }

    getLights(name?: string): LayerStyle['lights'] | (AmbientLight | DirectionalLight)[] {
        return name ? this.lights[name] : this.lights;
    }

    /**
     * setBgColor
     * @param backgroundColor
     * @hidden
     */
    setBgColor(backgroundColor: LayerStyle['backgroundColor']) {
        if (ExpressionParser.isJSONExp(backgroundColor)) {
            const color = this.expParser.evaluate(<any>backgroundColor, this.expContext, ExpressionMode.dynamic);
            this.backgroundColor = color instanceof Expression ? () => color.resolve() : color;
        } else {
            this.backgroundColor = backgroundColor;
        }
    }

    assign(feature: Feature, level?: number): string | null | undefined {
        // return <string><unknown> this.flatStyles;
        // let filteredStyleGroups = this.flatStyles.filter((style) => {
        //     const {filter} = style;
        //     return typeof filter === 'function'
        //         ? style.filter(feature, level)
        //         : ExpressionParser.isJSONExp(filter)
        //             ? this.expParser.evaluate(filter, feature.properties)
        //             : filter;
        // });
        // return filteredStyleGroups.length && <string><unknown>filteredStyleGroups;
        let filteredStyleGroups = this._filteredStyleGrp;
        let i = 0;
        for (let style of this.flatStyles) {
            const {filter} = style;

            const filtered = filter instanceof Expression
                ? filter.resolve(feature.properties)
                : typeof filter === 'function'
                    ? (style.filter as StyleValueFunction<boolean>)(feature, level)
                    : filter;

            if (filtered) {
                filteredStyleGroups[i++] = style;
            }
        }

        if (i > 0) {
            filteredStyleGroups.length = i;
            return <string><unknown>filteredStyleGroups;
        }
        // return feature.geometry.type;
    };

    getDefinitions() {
        return this.definitions;
    }

    getExpressionParser() {
        return this.expParser;
    }

    /**
     * getExpressionContext
     * @hidden
     */
    getExpressionContext() {
        return this.expContext;
    }

    getCustomStyles() {
        return this._c;
    }

    getCustomStyleGroup(feature: Feature) {
        return this._c[feature.id];
    }

    /**
     * initMapContext
     * @param feature
     * @param zoom
     * @protected
     * @hidden
     */
    protected initMapContext(feature: Feature, zoom: number): XYZLayerStyle['expContext'] {
        const geometryType = feature.geometry.type;
        const {expContext} = this;
        expContext.$geometryType = (geometryType == 'Point' || geometryType == 'MultiPoint')
            ? 'point'
            : (geometryType == 'LineString' || geometryType == 'MultiLineString')
                ? 'line'
                : 'polygon';

        expContext.$id = feature.properties.$id ?? feature.id;
        expContext.$layer = feature.getDataSourceLayer(this.layer);
        expContext.$zoom = zoom;

        this.expParser.clearResultCache();
        return expContext;
    }

    getStyleGroup(feature: Feature, level?: number, getDefault?: boolean): (readonly Style[]) {
        let style = this._c[feature.id];
        // initialize the map context
        this.initMapContext(feature, level);

        if (style == UNDEF || getDefault) {
            (<{}>style) = this.assign(feature, level);

            if (typeof style != 'object') {
                style = this.styleGroups[style];
            }
        }
        return style;
    };

    setStyleGroup(feature: Feature, group: StyleGroup | false | null, merge?: boolean) {
        const id = feature.id;
        const custom = this._c;

        this.expParser.clearResultCache();

        if (
            group && (merge /* || merge == UNDEF*/)
        ) {
            group = this.merge(this.getStyleGroup(feature), group);
        }

        if (group) {
            custom[id] = group;
        } else {
            if (group === null || group === false) {
                group = custom[id] = EMPTY_STYLE;
            } else if (custom[id]) {
                delete custom[id];
            }
        }

        return group;
    };

    merge(grp1: readonly Style[], grp2: StyleGroup | false) {
        if (grp2 === null || grp2 === false) {
            return null;
        }
        const mergedGroups = [];
        let group;

        for (let i = 0, len = grp1.length; i < len; i++) {
            group = mixin({}, grp1[i]);
            if (grp2[i]) {
                mixin(group, grp2[i]);
            }
            mergedGroups[i] = group;
        }

        return mergedGroups;
    }

    init(layer: TileLayer, _customFeatureStyles?: StyleGroupMap) {
        this.layer = layer;
        // custom styles
        this._c = _customFeatureStyles || {};
    }

    clearCache() {
        this.expParser.clearCache?.();
    }

    getLayerStyle(): LayerStyle {
        return this._style;
    }

    /**
     * initZoom
     * @param zoomlevel
     * @hidden
     */
    initZoom(zoomlevel: number): boolean {
        const {expParser, expContext} = this;
        if (expContext.zoom != zoomlevel) {
            expContext.zoom = zoomlevel;
            expContext.$zoom = zoomlevel ^ 0;
            expParser.clearDynamicResultCache();
            return true;
        }
    }
}
