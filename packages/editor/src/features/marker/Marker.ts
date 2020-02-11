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

import Feature from '../feature/Feature';

/**
 *  @class
 *  @expose
 *  @public
 *  @extends here.xyz.maps.editor.features.Feature
 *  @name here.xyz.maps.editor.features.Marker
 *
 *  @constructor
 *  @param {(String|Number)=} id of the Marker
 *  @param {here.xyz.maps.editor.GeoCoordinate|here.xyz.maps.editor.PixelCoordinate} coord
 *      Coordinate of the object
 *  @param {here.xyz.maps.editor.features.Feature.Properties=} properties
 *      Properties of the marker feature.
 */
class MARKER extends Feature {
    // constructor() {
    //     BasicFeature.apply(this, arguments);
    // }
}


// JSUtils.inheritClass(BasicFeature, MARKER);


const MARKER_PROTO = MARKER.prototype;

/**
 *  Feature class of this feature, the value is "MARKER".
 *
 *  @public
 *  @expose
 *  @readonly
 *  @name here.xyz.maps.editor.features.Marker#class
 *  @type string
 */
MARKER_PROTO.class = 'MARKER';


/**
 *  Get deep copy of all properties of the feature
 *
 *  @public
 *  @expose
 *  @return {here.xyz.maps.editor.features.Address.Properties}
 *      return properties of the object
 *  @function
 *  @name here.xyz.maps.editor.features.Marker#prop
 *
 *
 * @also
 *
 *  Get the value of an specific property
 *
 *  @public
 *  @expose
 *  @param {string} property
 *      property name
 *  @return {number|string|Array.<string>|object}
 *      value of the specific property
 *  @function
 *  @name here.xyz.maps.editor.features.Marker#prop
 *
 * @also
 *
 *  Set the value for an specific property
 *
 *  @public
 *  @expose
 *  @param {string} property
 *      property name
 *  @param {number|string|Array.<string>|object} value
 *      value of the specific property
 *  @function
 *  @name here.xyz.maps.editor.features.Marker#prop
 *
 *
 * @also
 *
 *  Set one or more properties of the object.
 *
 *  @public
 *  @expose
 *  @param {here.xyz.maps.editor.features.Address.Properties} properties
 *      properties of the feature
 *  @function
 *  @name here.xyz.maps.editor.features.Marker#prop
 *
 */

/**
 *  Get default or current style of the feature.
 *
 *  @public
 *  @expose
 *  @param {string=} [style="default"]
 *      a string indicating which style to return, either "default" or "current".
 *  @return {Array<here.xyz.maps.layers.TileLayer.Style>} styles
 *      style of this feature
 *  @function
 *  @name here.xyz.maps.editor.features.Marker#style
 *
 * @also
 *  Apply style to the feature.
 *
 *  @public
 *  @expose
 *  @param {Array<here.xyz.maps.layers.TileLayer.Style>} style
 *      the style to set for the feature
 *  @function
 *  @name here.xyz.maps.editor.features.Marker#style
 */


/**
 *  Get coordinate of the feature.
 *
 *  @public
 *  @expose
 *  @return {Array.<number>}
 *      coordinate of the feature: [longitude, latitude, z]
 *  @function
 *  @name here.xyz.maps.editor.features.Marker#coord
 *
 * @also
 *  Set coordinate of the feature.
 *
 *  @public
 *  @param {Array.<number>} coords
 *  coordinate of the feature: [longitude, latitude, z]
 *  @expose
 *
 *  @function
 *  @name here.xyz.maps.editor.features.Marker#coord
 */
// MARKER_PROTO.getCoordinates = function()
// {
//     return this.geometry.coordinates;
// };


// /**
//  *  Change the icon of the object to the supplied URL and optionally change its size.
//  *
//  *  @public
//  *  @expose
//  *  @param {string} url
//  *      The icon url to be set.
//  *  @param {number=} width
//  *      The icon's width.
//  *  @param {number=} height
//  *      The icon's height.
//  *  @param {here.xyz.maps.editor.PixelCoordinate=} offset
//  *      Offset to the middle point of the icon.
//  *  @param {boolean} animation
//  *      Fading animation for iconchange. default false
//  *  @function
//  *  @name here.xyz.maps.editor.features.Marker#setIcon
//  */
// MARKER_PROTO.setIcon = function( iconUrl, width, height, offset, animation )
// {
//     if( typeof iconUrl == 'object' )
//     {
//         offset    = iconUrl['offset'];
//         height    = iconUrl['height'];
//         width     = iconUrl['width'];
//         animation = iconUrl['animation'];
//         iconUrl   = iconUrl['icon'];
//     }
//
//     var style;
//
//     if( iconUrl || width !== UNDEF || height !== UNDEF )
//     {
//         style = EDITOR.getStyle( this );
//
//         if( iconUrl )
//         {
//             style[0][1]['src'] = iconUrl;
//         }
//
//         if( width !== UNDEF && height !== UNDEF )
//         {
//             style[0][1]['width']  = width;
//             style[0][1]['height'] = height;
//         }
//
//         EDITOR.setStyle( this, style, true );
//     }
//
// };
//
//
// /**
//  *  Apply a style to this object.
//  *
//  *  @public
//  *  @expose
//  *  @param {string|Object=} [style]
//  *      function returns the 'default' or 'current' used style of object if parameter style is a string.
//  *      Otherwise it is object of key value pairs for {@link here.xyz.maps.providers.IStyle|Style}.
//  *
//  *  @return {Object} styles
//  *      the current active styles for highlighting circle, streetLine and navigationPoint position
//  *
//  *  @function
//  *  @name here.xyz.maps.editor.features.Marker#style
//  */
// MARKER_PROTO.style = function(styles)
// {
//     if( typeof styles == 'string' || arguments.length == 0 )// act as getter!
//     {
//         styles = EDITOR.getStyle( this, styles == 'default' )[0][1];
//
//         delete styles.rotate;
//
//         return styles;
//     }
//     EDITOR.setStyle( this, styles, true );
// };


// /**
//  *  Moves the object to top of drawing hierarchy so it is the closest to the viewer’s eyes, on top of other elements.
//  *
//  *  @public
//  *  @expose
//  *  @deprecated
//  *  @function
//  *  @name here.xyz.maps.editor.features.Marker#toFront
//  */
// MARKER_PROTO.toFront = function(){
//     //EDITOR.map.toFront(obj);
// };


// /**
//  *   Set attributes of the Marker, it takes attribute object as parameter.
//  *
//  *   @public
//  *  @deprecated
//  *   @expose
//  *   @param {mapedit.objects.Area.Properties} attributes
//  *       The attributes to be set.
//  *
//  *   @function
//  *   @name mapedit.objects.Marker#setAttributes
//  */
// this.setAttributes = function(attributes, skipSaving){};


// /**
//  * Set wgs coordinates.
//  *
//  *  @public
//  *  @expose
//  *  @param {here.xyz.maps.editor.PixelCoordinate|here.xyz.maps.editor.GeoCoordinate} coord
//  *      display coordinate of the object. Either pixel or WGS coordinates or mixed.
//  *
//  *  @function
//  *  @name here.xyz.maps.editor.features.Marker#setCoordinates
//  */
// MARKER_PROTO.setCoordinates = function(coord)
// {
//     var obj = this;
//
//     coord = EDITOR.map.getGeoCoord( coord );
//
//
//     //trigger an error and refuse the modification
//     if( coord[0] == UNDEF || coord[1] == UNDEF )
//     {
//         EDITOR.listeners.trigger( 'error', {
//             name: "InvalidCoordinates",
//             message: 'Given coordinate is not defined correctly.'
//         })
//     }
//     else
//     {
//         oTools.deHighlight( obj );
//         oTools._setCoords( obj, coord );
//         oTools.markAsModified( obj );
//     }
// }


// /**
//  *  Get screen coordinate of this object in pixel.
//  *
//  *  @public
//  *  @deprecated
//  *  @expose
//  *  @return {Array.<here.xyz.maps.editor.PixelCoordinate>|here.xyz.maps.editor.PixelCoordinate}
//  *
//  *  @function
//  *  @name here.xyz.maps.editor.features.Marker#getPixelCoordinates
//  */
// MARKER_PROTO.getPixelCoordinates = function()
// {
//     var pixel = EDITOR.map.getPixelCoord(
//         this.coord()
//     );
//     return {
//         x: pixel[0],
//         y: pixel[1],
//         z: pixel[2]^0
//     }
// };


// /**
//  *  Get wgs coordinates.
//  *
//  *  @public
//  *  @deprecated
//  *  @expose
//  *  @return {Array.<here.xyz.maps.editor.GeoCoordinate>|here.xyz.maps.editor.GeoCoordinate}
//  *      An object representing an WGS coordinate.
//  *
//  *  @function
//  *  @name here.xyz.maps.editor.features.Marker#getGeoCoordinates
//  */
// MARKER_PROTO.getGeoCoordinates = function()
// {
//     var geoCoord = this.coord();
//
//     return {
//         longitude: geoCoord[0],
//         latitude:  geoCoord[1],
//         z:          geoCoord[2]^0
//     }
// };


export default MARKER;
