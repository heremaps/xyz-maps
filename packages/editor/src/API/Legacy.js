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

import Feature from '../features/feature/Feature';
import Marker from '../features/marker/Marker';
import Area from '../features/area/Area';
import Navlink from '../features/link/NavLink';

const CURRENT_CHANGE_STEP = 'currentChangeStep';
let UNDEF;


function HERE_GROUND() {
}
const HERE_GROUND_PROTOTYPE = HERE_GROUND.prototype;
HERE_GROUND_PROTOTYPE.type = 'Feature';
HERE_GROUND_PROTOTYPE.class = 'GROUND';
HERE_GROUND_PROTOTYPE.bbox = [-180, -90, 180, 90];
HERE_GROUND_PROTOTYPE.properties = {
    '@ns:com:here:editor': {

    }
};
HERE_GROUND_PROTOTYPE.geometry = {
    type: 'Polygon',
    coordinates: [[
        [-180, 90],
        [180, 90],
        [180, -90],
        [-180, -90],
        [-180, 90]
    ]]
};


function createCallbackMapper( map, createMapper, add, remove ) {
    function forEach( key, fnc ) {
        key = (''+key).split(' ');

        for ( let k = 0; k<key.length; k++ ) {
            fnc( key[k], map[key[k]] );
        }
    }

    return {
        // subscribe
        add: function( keys, callback, context ) {
            forEach( keys, (key, mapping) => {
                let cbfnc = callback;

                if ( mapping ) {
                    mapping[mapping.length] = callback;

                    cbfnc = mapping[mapping.length] = mapping[0]
                        ? createMapper(key, callback, context)
                        : context;

                    key = mapping[0];
                }

                if ( key ) {
                    add( key, cbfnc, context );
                }
            });
        },
        // unsubscribe
        remove: function(keys, callback, context) {
            forEach( keys, (key, mapping) => {
                if ( mapping ) {
                    const idx = mapping.indexOf(callback);

                    if (idx != -1) {
                        key = mapping[0];
                        callback = mapping[idx + 1];
                        mapping.splice(idx, 2);
                    }
                }

                if (key) {
                    remove(key, callback, context);
                }
            });
        }
    };
}


function extendFeature( editor, display ) {
    const FeatureProtoype = Feature.prototype;
    const MarkerPrototype = Marker.prototype;
    const AreaPrototype = Area.prototype;
    const NavlinkPrototype = Navlink.prototype;


    // MarkerPrototype.type  = 'NVT_MARKER';
    // NavlinkPrototype.type = 'NVT_LINK';
    // AreaPrototype.type    = 'NVT_AREA';

    // require('../objects/location/POI').prototype.type     = 'NVT_POI';
    // require('../objects/location/Address').prototype.type = 'NVT_ADDRESS';


    // /**
    //  *  Moves the object to top of drawing hierarchy so it is the closest to the viewer’s eyes, on top of other elements.
    //  *
    //  *  @public
    //  *  @expose
    //  *  @deprecated
    //  *  @function
    //  *  @name here.xyz.maps.editor.features.Marker#toFront
    //  */
    MarkerPrototype.toFront = () => {
    };


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
    MarkerPrototype.setIcon = function( iconUrl, width, height, offset, animation ) {
        if ( typeof iconUrl == 'object' ) {
            offset = iconUrl['offset'];
            height = iconUrl['height'];
            width = iconUrl['width'];
            animation = iconUrl['animation'];
            iconUrl = iconUrl['icon'];
        }

        let style;

        if ( iconUrl || width !== UNDEF || height !== UNDEF ) {
            style = FeatureProtoype.style.call( this );

            if ( iconUrl ) {
                style[0][1]['src'] = iconUrl;
            }

            if ( width !== UNDEF && height !== UNDEF ) {
                style[0][1]['width'] = width;
                style[0][1]['height'] = height;
            }
            FeatureProtoype.style.call( this, style );
        }
    };
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
    MarkerPrototype.style = function( styles ) {
        if ( typeof styles == 'string' || !arguments.length ) {
            // act as getter!
            return FeatureProtoype.style.apply( this, arguments )[0][1];
        }

        const s = FeatureProtoype.style.call( this );
        s[0][1] = styles;

        FeatureProtoype.style.call( this, s );
    };


    // /**
    //  *  Get style of this object.
    //  *  @public
    //  *  @expose
    //  *  @return {Object}
    //  *      current active styles
    //  *  @function
    //  *  @name here.xyz.maps.editor.objects.Area#style
    //  *
    //  *  @also
    //  *  Apply a style to this object.
    //  *
    //  *  @public
    //  *  @expose
    //  *  @param {here.xyz.maps.layers.TileLayer.IFeatureStyle.IStyle} style reset to default style if style is "default"
    //  *    @function
    //  *    @name here.xyz.maps.editor.features.Area#style
    //  */
    AreaPrototype.style = function( styles ) {
        if ( styles ) {
            if ( styles === 'default' ) {
                styles = FeatureProtoype.style.call( this, styles );
            } else if ( typeof styles == 'object' ) {
                const _styles = FeatureProtoype.style.call( this );
                _styles[0][1] = styles;
                styles = _styles;
            }

            FeatureProtoype.style.call( this, styles );
        } else {
            return FeatureProtoype.style.call( this )[0][1];
        }
    };

    // /**
    //  *  Get style of this object.
    //  *  @public
    //  *  @expose
    //  *  @param {string=} style
    //  *      return default style if style is string "default", otherwise return current style.
    //  *  @return {Object}
    //  *      default or current active styles for inline and outline
    //  *  @function
    //  *  @name here.xyz.maps.editor.objects.Link#style
    //  *
    //  *  @also
    //  *
    //  *  Apply a style to this object.
    //  *  @public
    //  *  @expose
    //  *  @param {Object} style
    //  *  @param {Object=} style.inline
    //  *  @param {string=} style.inline.stroke stroke color
    //  *  @param {string=} style.inline.stroke-dasharray possible values: “”, “”, “.”, “.”, “..”, “. ”, “- ”, “-”, “- .”, “.”, “-..”
    //  *  @param {string=} style.inline.stroke-linecap possible values: “butt”, “square”, “round”
    //  *  @param {string=} style.inline.stroke-linejoin possible values: “bevel”, “round”, “miter”
    //  *  @param {number=} style.inline.stroke-opacity
    //  *  @param {number=} style.inline.stroke-width stroke width in pixels
    //  *  @param {Object=} style.outline this style object is the same as inline style
    //  *  @return {Object} styles
    //  *      the current active styles for inline and outline
    //  *
    //  *  @function
    //  *  @name here.xyz.maps.editor.features.Navlink#style
    //  */
    NavlinkPrototype.style = function( styles ) {
        let styleContainer;

        if ( typeof styles == 'string' || !arguments.length ) {
            // act as getter!
            styles = FeatureProtoype.style.apply( this, arguments );

            styleContainer = {};

            if ( styles[0] ) {
                styleContainer['outline'] = styles[0][1];
            }
            if ( styles[1] ) {
                styleContainer['inline'] = styles[1][1];
            }

            return styleContainer;
        }

        styleContainer = [];

        if ( styles['outline'] ) {
            styleContainer[0] = [0, styles['outline']];
        }

        if ( styles['inline'] ) {
            styleContainer[1] = [1, styles['inline']];
        }

        FeatureProtoype.style.call( this, styleContainer );
        // EDITOR.setStyle( this, styleContainer, true );
    };


    const GeoCoordinate = here.xyz.maps.editor.GeoCoordinate;
    // var PixelCoordinate = here.xyz.maps.editor.PixelCoordinate;


    /**
     //  *  Get wgs coordinates.
     //  *
     //  *  @public
     //  *  @deprecated
     //  *  @expose
     //  *  @return {Array.<here.xyz.maps.editor.GeoCoordinate>|here.xyz.maps.editor.GeoCoordinate}
     //  *      An object representing an WGS coordinate.
     //  *
     //  *  @function
     //  *  @name here.xyz.maps.editor.features.Feature#getGeoCoordinates
     //  */
    FeatureProtoype.getGeoCoordinates = function() {
        const geoType = this.geometry.type;
        const coords = this.coord();
        const len = coords.length;
        let coord;

        if ( geoType == 'Point' ) {
            return new GeoCoordinate( coords[0], coords[1], coords[2] );
        } else {
            var geoCoords = [];

            if ( geoType == 'LineString' ) {
                for ( let c = 0; c < len; c++) {
                    coord = coords[c];
                    geoCoords[c] = new GeoCoordinate( coord[0], coord[1], coord[2] );
                }
            } else {
                for ( let p = 0; p < coords.length; p++ ) {
                    const poly = coords[p];
                    const g = geoCoords[p] = [];

                    for ( let l = 0; l < poly.length; l++ ) {
                        const linestring = poly[l];
                        const ls = g[g.length] = [];

                        for ( let i = 0; i < linestring.length; i++ ) {
                            coord = linestring[i];
                            ls[i] = new GeoCoordinate( coord[0], coord[1], coord[2] );
                        }
                    }
                }
            }
        }


        return geoCoords;
    };

    // /**
    //  *  Get screen coordinate of this object in pixel.
    //  *
    //  *  @public
    //  *  @deprecated
    //  *  @expose
    //  *  @return {Array.<here.xyz.maps.editor.PixelCoordinate>|here.xyz.maps.editor.PixelCoordinate}
    //  *
    //  *  @function
    //  *  @name here.xyz.maps.editor.features.Feature#getPixelCoordinates
    //  */
    FeatureProtoype.getPixelCoordinates = function() {
        const geoType = this.geometry.type;
        const coords = this.coord();
        let pixelCoords; let coord; let z;

        if ( geoType == 'Point' ) {
            z = coords[2];
            pixelCoords = display.geoToPixel( coords[0], coords[1] );

            pixelCoords['z'] = z;
        } else {
            pixelCoords = [];

            if ( geoType == 'LineString' ) {
                const len = coords.length;

                for ( let c = 0; c < len; c++ ) {
                    coord = coords[c];
                    z = coord[2];
                    pixelCoords[c] = display.geoToPixel( coord[0], coord[1] );
                    pixelCoords[c]['z'] = z;
                }
            } else {
                for ( let p = 0; p < coords.length; p++ ) {
                    const poly = coords[p];
                    const g = pixelCoords[p] = [];

                    for ( let l = 0; l < poly.length; l++ ) {
                        const linestring = poly[l];
                        const ls = g[g.length] = [];

                        for ( let i = 0; i < linestring.length; i++ ) {
                            coord = linestring[i];
                            z = coord[2];
                            ls[i] = display.geoToPixel( coord[0], coord[1] );
                            ls[i]['z'] = z;
                        }
                    }
                }
            }
        }

        return pixelCoords;
    };


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
    // /**
    //  *  Set wgs coordinates.
    //  *
    //  *  @public
    //  *  @expose
    //  *  @param {Array.<here.xyz.maps.editor.PixelCoordinate|here.xyz.maps.editor.GeoCoordinate>} coords
    //  *      Array of coordinates. Either pixel or WGS coordinates or mixed.
    //  *
    //  *  @function
    //  *  @name here.xyz.maps.editor.features.Navlink#setCoordinates
    //  */
    FeatureProtoype.setCoordinates = function( coords ) {
        const feature = this;
        let path = [];
        let _point = [];
        let point;
        let error;

        function validateCoord( point ) {
            point = this._e().map.getGeoCoord( point );

            const lon = point[0];
            const lat = point[1];
            let z = point[2];

            // if the point is no valid pixel coordinate
            if ( typeof lon != 'number' || typeof lat != 'number' ) {
                return 'Point is neither valid pixel nor valid WGS coordinate!';
            }

            if ( lat>90 || lat<-90 || lon>180 || lon<-180 ) {
                return 'Coordinates out of bounds! Defective coordinate: ['+lon+', '+lat+']';
            }

            // filter out duplicates
            if ( _point[1] != lat || _point[0] != lon || _point[2] != point[2] ) {
                _point = point;

                z = +z;
                // z!==z tests for NaN
                // z!==~~z tests if z is an integer
                if (z!==z || z < -4 || z > 5 || z!==~~z) {
                    return 'invalid zLevel: '+z+' ,the value must be an integer between -4 and +5 and is ';
                }
                // set link path
                return [lon, lat, z||0];
            }
        }

        if ( feature.class == 'NAVLINK' ) {
            for ( let i = 0; i < coords.length; i++ ) {
                error = null;
                point = coords[i];

                point = validateCoord( point );

                if ( typeof point == 'string' ) {
                    error = point;
                    break;
                }

                if ( point ) {
                    path.push( point );
                }
            }

            if ( !error ) {
                if ( path.length<2 ) {
                    error = 'Coordinates should be an array, A line needs to have at least two coordinates!';
                }
            }
        } else if ( feature.geometry.type == 'Point' ) {
            path = validateCoord( coords );

            if ( typeof path == 'string' ) {
                error = path;
            }
        } else {
            path = coords;
        }


        // trigger an error and refuse the modification
        if ( error ) {
            this._e().listeners.trigger( 'error', {
                name: 'InvalidCoordinates',
                message: error
            });
        } else {
            feature.coord( path );
        }
    };

    // /**
    //  *  Get attributes of this object.
    //  *  @deprecated
    //  *  @param {String=} attribute name
    //  *  @public
    //  *  @expose
    //  *  @return {here.xyz.maps.editor.features.Navlink.Properties|here.xyz.maps.editor.features.Place.Properties|here.xyz.maps.editor.features.Address.Properties|here.xyz.maps.editor.features.Area.Properties}
    //  *
    //  *  @function
    //  *  @name here.xyz.maps.editor.features.Feature#getAttributes
    //  */
    FeatureProtoype.getAttributes = function(key) {
        return key && this.prop( key ) || this.prop();
    };

    // /**
    //  *  Set attributes of the Marker, it takes attribute object as parameter.
    //  *
    //  *  @public
    //  *  @deprecated
    //  *  @expose
    //  *  @param {here.xyz.maps.editor.features.Navlink.Properties|here.xyz.maps.editor.features.Place.Properties|here.xyz.maps.editor.features.Address.Properties|here.xyz.maps.editor.features.Area.Properties} attributes
    //  *      The attributes to be set.
    //  *
    //  *  @function
    //  *  @name here.xyz.maps.editor.features.Feature#setAttributes
    //  */
    FeatureProtoype.setAttributes = function(key, value) {
        return this.prop.apply( this, arguments );
    };


    FeatureProtoype.attr = FeatureProtoype.prop;
}


export default function LegacyAPI( editor, display ) {
    extendFeature(editor, display);

    const globalNs = here.xyz.maps.editor['objects']
        = here.xyz.maps.editor['features'];

    globalNs['POI'] = globalNs['Place'];
    globalNs['Link'] = globalNs['Navlink'];

    /** **************************** .zoneSelector ******************************/

    editor.zoneSelector = editor.getZoneSelector();

    /** *************************** .drawingManager *****************************/

    editor.drawingManager = editor.getDrawingBoard();

    /** ****************************** .changes ********************************/

    const changes = editor.changes = {

        undo: editor.undo,

        redo: editor.redo,

        info: editor.info,

        import: editor.import,

        export: editor.export,

        revert: editor.revert,

        submit: editor.submit,

        length: 0,

        currentStep: 0,

        totalSteps: 0
    };

    editor.addObserver( 'history.current', function updateChanges(type, value, old) {
        changes.currentStep = value;
        changes.length = editor.get('changes.length'); // editor.changes.info().length
        changes.totalSteps = editor.get('history.length');

        const obs = observerMapping[CURRENT_CHANGE_STEP];

        for ( let i=1; i<obs.length; i+=2 ) {
            obs[i].call( obs[i+1], CURRENT_CHANGE_STEP, value, old );
        }
    });

    /** ****************************** .layers ********************************/

    editor.layers = {

        add: editor.addLayer,

        remove: editor.removeLayer,

        get: editor.getLayers

    };

    /** ****************************** .listeners ********************************/


    editor.listeners = createCallbackMapper(
        {
            'dblclick': ['dbltap'],
            'click': ['pointerup'],
            'mouseover': ['pointerenter'],
            'mouseout': ['pointerenter']
        },
        (type, observer, context) => (ev) => {
            const event = {};

            for ( const a in ev ) {
                event[a] = ev[a];
            }

            if ( event.target == null ) {
                event.target = new HERE_GROUND();
            }

            // console.warn(ev.type,'->',type);
            event.type = type;

            observer.call( context, event );
        },

        editor.addEventListener,

        editor.removeEventListener
    );
    /** ****************************** .observers ********************************/


    var observerMapping = {
        'sync': ['ready'],
        'totalSteps': ['history.length'],
        'zoomLevel': [null],
        'currentChangeStep': [null]
    };
    let prevZoomlevel = display.getZoomlevel();

    function onZoomLevelChange( key, zl, oldZl ) {
        zl = Math.round( zl );

        if ( prevZoomlevel != zl ) {
            const zlo = observerMapping['zoomLevel'];

            for ( let i=1; i<zlo.length; i+=2 ) {
                zlo[i].call( zlo[i+1], 'zoomLevel', zl, prevZoomlevel );
            }
            prevZoomlevel = zl;
        }
    }

    display.addObserver( 'zoomlevel', onZoomLevelChange );

    editor.observers = createCallbackMapper(
        observerMapping,
        (key, observer, context) => key == 'sync'
            // sync is basicly an inverted ready event
            ? (_key, newValue, oldValue) => {
                observer.call( context, key, oldValue, newValue );
            }
            : (_key, newValue, oldValue) => {
                observer.call( context, key, newValue, oldValue );
            },
        editor.addObserver,
        editor.removeObserver
    );

    const omap = {
        'currentChangeStep': 'history.current',
        'totalSteps': 'history.length'
    };
    editor.observers.get = (key) => {
        if ( key == 'sync' ) {
            return !editor.get('ready');
        }

        return editor.get(omap[key]||key);
    };

    /** ****************************** .objects ********************************/

    editor.objects = {

        add: editor.addFeature,

        get: editor.getFeature,

        createContainer: editor.createFeatureContainer,

        clearSelection: editor.clearObjectSelection
    };

    /** ****************************** .viewport ********************************/

    let blocked = false;

    // /**
    //  *  The interface to the current viewport.
    //  *
    //  *  @expose
    //  *  @public
    //  *  @constructor
    //  *  @name here.xyz.maps.editor.Editor.viewport
    //  */
    const viewport = editor.viewport = {

        // /**
        //  *  Center of the viewport.
        //  *
        //  *  @public
        //  *  @expose
        //  *  @readonly
        //  *  @type {here.xyz.maps.editor.GeoCoordinate}
        //  *  @name here.xyz.maps.editor.Editor.viewport#center
        //  */
        center: null,
        // /**
        //  *  TopLeft corner of the viewport.
        //  *
        //  *  @public
        //  *  @expose
        //  *  @readonly
        //  *  @type {here.xyz.maps.editor.GeoCoordinate}
        //  *  @name here.xyz.maps.editor.Editor.viewport#topLeft
        //  */
        topLeft: null,
        // /**
        //  *  BottomRight corner of the viewport.
        //  *
        //  *  @public
        //  *  @expose
        //  *  @readonly
        //  *  @type {here.xyz.maps.editor.GeoCoordinate}
        //  *  @name here.xyz.maps.editor.Editor.viewport#bottomRight
        //  */
        bottomRight: null,
        // /**
        //  *  Block viewport change.
        //  *
        //  *  @public
        //  *  @expose
        //  *  @function
        //  *  @param {boolean|number} toggle
        //  *      true to block viewport, false to unblock viewport.
        //  *      If an integer value is passed, zoomlevel is not possible to be set smaller than this value.
        //  *
        //  *  @name here.xyz.maps.editor.Editor.viewport#block
        //  */
        block: function( lock ) {
            let panLock = false;
            let minLevelLock = false;

            // act as setter
            if ( lock !== UNDEF ) {
                blocked = lock;

                if ( typeof lock == 'number' ) {
                    minLevelLock = lock;
                } else {
                    if ( panLock = lock ) {
                        minLevelLock = !lock;
                    } else {
                        minLevelLock = lock;
                    }
                }
                display.lockViewport({
                    pan: panLock,
                    minLevel: minLevelLock
                });
            }

            return !( typeof blocked == 'number' || blocked === false );
        },
        // /**
        //  *  Get all objects in viewport.
        //  *  bounding box and an array of types can be defined to reduce the result.
        //  *  If the bounding box is partially outside the view, the bounding box will be clipped to view bounds. The
        //  *  bounding box must not be located completely outside the view.
        //  *
        //  *  @public
        //  *  @expose
        //  *  @function
        //  *  @param {here.xyz.maps.editor.GeoCoordinate=} p1
        //  *      First coordinate which starts the bounding box.
        //  *  @param {here.xyz.maps.editor.GeoCoordinate=} p2
        //  *      Second coordinate which closes the bounding box.
        //  *  @param {Array.<string>=} types
        //  *      Array of object types to look for, possible types: "NAVLINK", "ADDRESS", "PLACE", "AREA".
        //  *  @return {here.xyz.maps.editor.features.Container}
        //  *      Array-like container containing the found objects
        //  *  @name here.xyz.maps.editor.Editor.viewport#getObjects
        //  */
        getObjects: function( p1, p2, types ) {
            let rect = {
                minLon: Infinity,
                maxLon: -Infinity,
                minLat: Infinity,
                maxLat: -Infinity
            };
            let pnts = 0;
            let filter;


            for ( let a = 0, arg; a < arguments.length; a++ ) {
                arg = arguments[a];

                if ( arg instanceof Array ) {
                    filter = arg;
                } else if ( typeof arg == 'string' ) {
                    filter = [arg];
                } else if ( typeof arg == 'object' ) {
                    if ( arg.x != UNDEF && arg.y != UNDEF ) {
                        arg = display.pixelToGeo(arg);
                    }

                    pnts++;

                    const lon = arg.longitude;
                    const lat = arg.latitude;

                    if ( lon < rect.minLon ) {
                        rect.minLon = lon;
                    }

                    if ( lon > rect.maxLon ) {
                        rect.maxLon = lon;
                    }

                    if ( lat < rect.minLat ) {
                        rect.minLat = lat;
                    }

                    if ( lat > rect.maxLat ) {
                        rect.maxLat = lat;
                    }
                }
            }

            if ( !pnts ) {
                rect = display.getViewBounds();
            }

            const result = editor.search({
                rect: rect,
                // return filter.indexOf( feature.type ) != -1
                filter: filter && ((feature) => filter.indexOf( feature._provider.detectFeatureClass( feature ) ) != -1)
            });

            return editor.createFeatureContainer.apply(editor, result);
        }
    };

    editor.addObserver('ready', function updateViewportInfo() {
        const cvp = display.getViewBounds();

        viewport.topLeft = {
            longitude: cvp.minLon,
            latitude: cvp.maxLat
        };

        viewport.bottomRight = {
            longitude: cvp.maxLon,
            latitude: cvp.minLat
        };

        viewport.center = display.getCenter();
    });


    /** ****************************** general ********************************/

    editor['show'] = () => {
        console.warn('%c.show() is depricated.. use: .active(true)', 'background-color:yellow;');
        editor['active'](true);
        return editor;
    };

    editor['hide'] = () => {
        console.warn('%c.hide() is depricated.. use: .active(false)', 'background-color:yellow;');
        editor['active'](false);
        return editor;
    };


    editor.legacy = true;
};
