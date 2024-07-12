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
import {Color, LayerStyle, Style, StyleGroup, StyleGroupMap, StyleValueFunction, StyleZoomRange} from '../styles/LayerStyle';
import {ExpressionParser, JSONExpression} from '@here/xyz-maps-common';
import {TileLayer} from '../layers/TileLayer';
// import {JsonExpression} from '@here/xyz-maps-common';

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
 * StyleManager
 */
export class XYZLayerStyle implements LayerStyle {
    styleGroups = null;
    private _c: StyleGroupMap = null;
    definitions: LayerStyle['definitions'];

    backgroundColor?: Color | StyleZoomRange<Color> | ((zoomlevel: number) => Color);

    protected exprContext: {
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
    private expParser: ExpressionParser;
    private flatStyles?: Style[];
    private _filteredStyleGrp: StyleGroup;

    private _style: LayerStyle;

    constructor(styleJSON: LayerStyle) {
        for (let p in styleJSON) {
            const property = styleJSON[p];
            this[p] = p == 'styleGroups' ? deepCopy(property) : property;
        }
        // layerStyle._l = layer;
        this.definitions ||= {};

        this.expParser = new ExpressionParser(this.definitions, this.exprContext);

        if (!styleJSON.assign) {
            const flatStyles = [];
            for (let name in this.styleGroups) {
                let styleGrp = this.styleGroups[name];
                if (!Array.isArray(styleGrp)) {
                    styleGrp = [styleGrp];
                }
                for (let style of styleGrp) {
                    // for (let prop in style) {
                    //     if ( ExpressionParser.isJSONExp(style[prop])) {
                    //         style[prop] = this.createExpEvaluator(style[prop]);
                    //     }
                    // }
                    if (style.filter) {
                        if (ExpressionParser.isJSONExp(style.filter)) {
                            style.filter = this.createExpEvaluator(style.filter);
                        }
                        flatStyles.push(style);
                    }
                }
            }
            this.flatStyles = flatStyles;

            this._filteredStyleGrp = [];
        }

        this._style = styleJSON;
    }

    private createExpEvaluator(expr: JSONExpression) {
        return (feature) => {
            return this.expParser.evaluate(expr, feature.properties);
            // window._measure.count('filter-calls');
            // window._measure.start('filter-eval');
            // let filtered = this.expParser.evaluate(expr, feature.properties);
            // window._measure.stop('filter-eval');
            // return filtered;
        };
    };

    // default: simple assignment based on geometryType.
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

            const filtered =
                typeof filter === 'function' ? (style.filter as StyleValueFunction<boolean>)(feature, level)
                    // : ExpressionParser.isJSONExp(filter) ? this.expParser.evaluate(filter, feature.properties)
                    : filter;

            if (filtered) {
                filteredStyleGroups[i++] = style;
            }
        }

        if (i > 0) {
            filteredStyleGroups.length = i;
            // filteredStyleGroups.__p = false;
            return <string><unknown>filteredStyleGroups;
        }
        // return feature.geometry.type;
    };

    // get : function( feature, level )
    // {
    //     return this.styleGroups[
    //         this.assign( feature, level )
    //     ];
    // },

    getDefinitions() {
        return this.definitions;
    }

    getExpressionParser() {
        return this.expParser;
    }

    getExpressionContext() {
        return this.exprContext;
    }

    getCustomStyles() {
        return this._c;
    }

    getCustomStyleGroup(feature: Feature) {
        return this._c[feature.id];
    }

    protected initMapContext(feature: Feature, zoom: number): XYZLayerStyle['exprContext'] {
        const geometryType = feature.geometry.type;
        const {exprContext} = this;
        exprContext.$geometryType = (geometryType == 'Point' || geometryType == 'MultiPoint')
            ? 'point'
            : (geometryType == 'LineString' || geometryType == 'MultiLineString')
                ? 'line'
                : 'polygon';

        exprContext.$id = feature.properties.$id ?? feature.id;
        exprContext.$layer = feature.getDataSourceLayer(this.layer);

        let z = exprContext.$zoom;
        exprContext.$zoom = zoom;

        this.expParser.clearResultCache();
        return exprContext;
    }

    getStyleGroup(feature: Feature, level?: number, getDefault?: boolean): (readonly Style[]) {
        let style = this._c[feature.id];
        if (style == UNDEF || getDefault) {
            // initialize the map context
            this.initMapContext(feature, level);

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

        // if( layer = this._l )
        // {
        //     layer._l.trigger( 'style', [ feature, group, layer ], true );
        // }
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
}
