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

import {Feature} from '../features/Feature';
import {ILayerStyle, StyleGroup, StyleGroupMap} from './ILayerStyle';
/**
 *  This is an interface to represent feature styles.
 *
 *  Feature style is an array with two elements:
 *  -First element: zIndex(type: integer) indicates rending hierarchy, symbolizer with bigger value is rendered on top of those with smaller values.
 *  -Second element: style(type: {{@link here.xyz.maps.layers.TileLayer.FeatureStyle.Style|here.xyz.maps.layers.TileLayer.FeatureStyle.Style}}) represents style details.
 *
 *  Features always need array of feature styles to show the shapes:
 * [
 *  -[zIndex, {@link here.xyz.maps.layers.TileLayer.FeatureStyle.Style|style}],
 *  -[zIndex, {@link here.xyz.maps.layers.TileLayer.FeatureStyle.Style|style}],
 *  -...
 * ]
 *
 *  @interface
 *  @class here.xyz.maps.layers.TileLayer.FeatureStyle
 */
// var IFeatureStyle = {
// }


/**
 *  This is an interface to represent Style for rendering features in this layer.
 *
 *  @example
 *{
 * styleGroups: {
 *   lineStyle: [
 *     {zIndex: 0, type: "Line", opacity:1, stroke: "#BE6B65", "strokeLinecap": "round", "strokeLinejoin": "round", "strokeWidth":16},
 *     {zIndex: 1, type: "Line", opacity:1, stroke: "#E6A08C", "strokeLinecap": "round", "strokeLinejoin": "round", "strokeWidth":12},
 *     {zIndex: 2, type: "Text", fill: "#000000", "textRef": "properties.name"}
 *   ]
 * },
 * assign: function(feature, zoomlevel){
 *   return "lineStyle";
 * }
 *}
 *
 *  @expose
 *  @public
 *  @interface
 *  @class here.xyz.maps.layers.TileLayer.TileLayerStyle
 */
// var ILayerStyle = {

/**
 *  This object contains key/style group pairs. A style group is an array of {@link here.xyz.maps.layers.TileLayer.Style}, it defines how a feature should be rendered.
 *
 *  @public
 *  @expose
 *  @name here.xyz.maps.layers.TileLayer.TileLayerStyle#styleGroups
 *  @type {Object}
 */
// styleGroups: null,

/**
 *  The function returns a key that is defined in styleGroups. This function will be called for each feature being rendered by the display.
 *  The display expects this method to return the key of how the feature should be rendered for the respective zoomlevel.
 *
 *  @public
 *  @expose
 *  @function
 *  @name here.xyz.maps.layers.TileLayer.TileLayerStyle#assign
 *  @param {here.xyz.maps.providers.FeatureProvider.Feature} feature the feature to which style is applied
 *  @param {number} zoomlevel current zoomlevel of map display
 *  @return {String} a key which is defined in styleGroups
 */
// assign: null,


// }


/**
 *  Style object represents supported style attributes of Features. It indicates how a symbolizer in feature should be rendered.
 *
 * A style object should always include "zIndex" and "type" attributes, and each type of symbolizer should include its own type-specific attributes:
 * -Circle:  "radius" must be included and either "fill" or "stroke" should be included.
 * -Rect:  "width" must be included and "height" will be set with the same value as "width" if only "width" is present. Either "fill" or "stroke" should be included
 * -Text:  "text" or "textRef" should be included and "fill" or "stroke" shoule also be included for text color
 * -Image:  "src" and "width" must be included. "height" will be set with the same value as "width" if only "width" is present.
 * -Line:  "stroke" must be included.
 * -Polygon:  "fill" or "stroke" must be included.
 *
 * @example
 * //example of Circle:
 * {zIndex:0, type:"Circle", radius:16, fill:"#FFFF00"}
 *
 * @example
 * //example of Rect:
 * {zIndex:0, type:"Rect", fill:"#4C9EEF", stroke:"#0156BB", width:20, height:20}
 *
 * @example
 * //example of Text:
 * {zIndex:1, type:"Text", fill:"#FFFFFF", text:"HERE", font:"normal 12px Arial"}
 *
 * @example
 * //example of Image:
 * {zIndex:0, type:"Image", src:"./here.png", width:20, height:20}
 *
 * @example
 * //example of Line:
 * {zIndex:0, type:"Line", opacity:0.5, stroke:"#BE6B65", strokeLinecap:"round", strokeLinejoin:"round", strokeWidth:16}
 *
 * @example
 * //example of Polygon:
 * {zIndex:0, type:"Polygon", opacity:0.5, stroke:"#BE6B65", fill:"#FFFFFF"}
 * @expose
 *  @public
 *  @interface
 *  @class here.xyz.maps.layers.TileLayer.Style
 */
// var styleAttributes = {

/**
 *  Indecates type of the symbolizer.
 *  Its value shoule be one of the following: "Circle", "Rect", "Text", "Image", "Line" or "Polygon".
 *
 *  @public
 *  @expose
 *  @name here.xyz.maps.layers.TileLayer.Style#type
 *  @type {String}
 */
// type: null,

/**
 *  Indecates rending hierarchy, symbolizer with bigger value is rendered above those with smaller values.
 *
 *  @public
 *  @expose
 *  @name here.xyz.maps.layers.TileLayer.Style#zIndex
 *  @type {number}
 */
// zIndex: null,

/**
 *  Sets the color inside the symbolizer. This attribute is valid for Circle, Rect and Polygon.
 *
 *  @public
 *  @expose
 *  @optional
 *  @name here.xyz.maps.layers.TileLayer.Style#fill
 *  @type {string}
 */
// fill: null,

/**
 *  Sets the color of the line drawn around the symbolizer. This attribute is valid for Circle, Rect, Line and Polygon.
 *
 *  @public
 *  @expose
 *  @optional
 *  @name here.xyz.maps.layers.TileLayer.Style#stroke
 *  @type {string}
 */
// stroke: null,

/**
 *  Sets the width of the line drawn around the symbolizer. This attribute is valid for symbolizers with stroke.
 *
 *  @public
 *  @expose
 *  @optional
 *  @name here.xyz.maps.layers.TileLayer.Style#strokeWidth
 *  @type number
 */
// "strokeWidth": null,

/**
 *  This controls the shape of the ends of lines. there are three possible values for strokeLinecap:
 *  -"butt" closes the line off with a straight edge that's normal (at 90 degrees) to the direction of the stroke and crosses its end.
 *  -"square" has essentially the same appearance, but stretches the stroke slightly beyond the actual path. The distance that the stroke goes beyond the path is half the strokeWidth.
 *  -"round" produces a rounded effect on the end of the stroke. The radius of this curve is also controlled by the strokeWidth.
 *  This attribute is valid for symbolizers with stroke.
 *
 *  @public
 *  @expose
 *  @optional
 *  @name here.xyz.maps.layers.TileLayer.Style#strokeLinecap
 *  @type string
 */
// "strokeLinecap": null,

/**
 *  The joint where the two segments in a line meet is controlled by the strokeLinejoin attribute, There are three possible values for this attribute:
 *  -"miter" extends the line slightly beyond its normal width to create a square corner where only one angle is used.
 *  -"round" creates a rounded line segment.
 *  -"bevel" creates a new angle to aid in the transition between the two segments.
 *  This attribute is valid for symbolizers with stroke.
 *
 *  @public
 *  @expose
 *  @optional
 *  @name here.xyz.maps.layers.TileLayer.Style#strokeLinejoin
 *  @type string
 */
// "strokeLinejoin": null,

/**
 *  The strokeDasharray attribute controls the pattern of dashes and gaps used to stroke paths.
 *  It's an array of <length>s that specify the lengths of alternating dashes and gaps. If an odd number of values is provided,
 *  then the list of values is repeated to yield an even number of values. Thus, 5,3,2 is equivalent to 5,3,2,5,3,2.
 *  This attribute is valid for symbolizers with stroke.
 *
 *  @public
 *  @expose
 *  @optional
 *  @name here.xyz.maps.layers.TileLayer.Style#strokeDasharray
 *  @type Array.<number>
 */
// "strokeDasharray": null,

/**
 *  Opacity of the symbolizer. It is valid for all symbolizer types.
 *
 *  @public
 *  @expose
 *  @optional
 *  @name here.xyz.maps.layers.TileLayer.Style#opacity
 *  @type number
 */
// opacity: null,

/**
 *  Rotate the symbolizer to the angle in degree. This attribute is validate for Rect and Image.
 *
 *  @public
 *  @expose
 *  @optional
 *  @name here.xyz.maps.layers.TileLayer.Style#rotation
 *  @type number
 */
// rotation: null,

/**
 *  Width of symbolizer in pixel. It is only required by Rect and Image.
 *
 *  @public
 *  @expose
 *  @optional
 *  @name here.xyz.maps.layers.TileLayer.Style#width
 *  @type number
 */
// width: null,

/**
 *  Height of symbolizer in pixel. It is only required by Rect and Image.
 *
 *  @public
 *  @expose
 *  @optional
 *  @name here.xyz.maps.layers.TileLayer.Style#height
 *  @type number
 */
// height: null,

/**
 *  @type string
 */
// "text-anchor": null,

/**
 *  CSS font for texts. default font for texts: “normal 12px Arial”. It is only valid for Text.
 *
 *  @public
 *  @expose
 *  @optional
 *  @name here.xyz.maps.layers.TileLayer.Style#font
 *  @type string
 */
// "font": null,

/**
 *  Text is either a string or a function that generates a string. It is only required by Text.
 *
 *  @public
 *  @expose
 *  @optional
 *  @name here.xyz.maps.layers.TileLayer.Style#text
 *  @type {string|Function}
 *  @example
 * {text: function(feature){
 *     // Display uppercased street name
 *     return feature.properties.name.toUpperCase();
 * }}
 */
// "text": null,


/**
 *  "textRef" points to features, its value is the reference path which points to the feature attribute that is displayed on object. If both "text" and "textRef" are set, "text" prevails.
 *  e.g. for Address object style, if "textRef" is set to "properties.address", the address value in properties of the address object will be displayed.
 *  It is only required by Text.
 *
 *  @public
 *  @expose
 *  @optional
 *  @name here.xyz.maps.layers.TileLayer.Style#textRef
 *  @type string
 */
// "textRef": ’properties.name’,

/**
 *  Specifies the URL of an image. It can be either absolute or relative path. It is only required by Image.
 *
 *  @public
 *  @expose
 *  @optional
 *  @name here.xyz.maps.layers.TileLayer.Style#src
 *  @type string
 */
// src: null,

/**
 *  Offset value on X axis. It is valid for Circle, Rect, Text and Image.
 *
 *  @public
 *  @expose
 *  @optional
 *  @name here.xyz.maps.layers.TileLayer.Style#offsetX
 *  @type number
 */
// offsetX: null,

/**
 *  Offset value on Y axis. It is valid for Circle, Rect, Text and Image.
 *
 *  @public
 *  @expose
 *  @optional
 *  @name here.xyz.maps.layers.TileLayer.Style#offsetY
 *  @type number
 */

// offsetY: null

/**
 *  Radius of symbolizer in pixel. It is only required by Circle.
 *
 *  @public
 *  @expose
 *  @optional
 *  @name here.xyz.maps.layers.TileLayer.Style#radius
 *  @type number
 */
// radius: null
// }

function mixin(to, from) {
    for (const f in from) {
        to[f] = from[f];
    }
    return to;
}

const EMPTY_STYLE = [];

let UNDEF;


class LayerStyle implements ILayerStyle {
    styleGroups = null;
    private _c: StyleGroupMap = null;

    constructor(styleCfg, customStyles?: StyleGroupMap) {
        const layerStyle = this;


        if (styleCfg['assign']) {
            layerStyle.assign = styleCfg.assign;
        }

        for (const cfg in styleCfg) {
            layerStyle[cfg] = styleCfg[cfg];
        }


        // custom styles
        layerStyle._c = customStyles || {};

        // layerStyle._l = layer;
    }

    // default: simple assignment based on geometryType.
    assign(feature: Feature, level?: number) {
        return feature.geometry.type;
    };

    // get : function( feature, level )
    // {
    //     return this.styleGroups[
    //         this.assign( feature, level )
    //     ];
    // },


    getStyleGroup(feature: Feature, level?: number, getDefault?: boolean) {
        let style = this._c[feature.id];
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

    merge(grp1: StyleGroup, grp2: StyleGroup | false) {
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
}

export default LayerStyle;
