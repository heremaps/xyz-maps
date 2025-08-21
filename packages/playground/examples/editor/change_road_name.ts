import {MVTLayer, TileLayer, SpaceProvider} from '@here/xyz-maps-core';
import {Map} from '@here/xyz-maps-display';
import {Editor, Navlink} from '@here/xyz-maps-editor';

/** setup the Map **/
// Create a custom provider.
class MyProvider extends SpaceProvider {
    // In this exmaple, all data does already contain desired feature class in the property 'featureClass'.
    detectFeatureClass(feature) {
        return feature.properties.featureClass;
    }


    // ########################       Navlink      ########################
    // Following functions are only necessary if you want to edit Navlink.


    // In addition to Lines, Navlinks have navigation information and are connected to each other to form a road network.
    // Implementing following functions enables you to easily edit Navlinks.


    // This function returns a boolean value to indicate if turn from from-link's shape point to to-link's shape point
    // is restricted.
    // It takes two arguments ('from' and 'to' in this example), they have the same data structure:
    // {
    //     'link': Navlink,
    //     'index': Number
    // }
    // 'link': Navlink to turn from and into.
    // 'index': index of Navlink's shape point, it specifies the shape point where turn takes place.
    // In this example, turn restriction information is stored in from-link, we read this information and determin if the
    // turn is restricted.
    readTurnRestriction(from, to) {
        let turn = from.link.prop('turnRestriction') || {};
        // first shape point is 'start' and the last one is 'end'
        let restrictions = turn[from.index ? 'end' : 'start'] || [];

        return restrictions.indexOf(to.link.id) >= 0;
    };

    // This function stores turn restriction information for turn from from-link to to-link.
    // It takes arguments ('restricted', 'from' and 'to' in this example) similar to that of above function, but its first
    // argument is a boolean value for indicating the turn is (or is not) restricted.
    // In this example, we store turn restriction information as following object in from-link:
    // {
    //     'start': Array<String>  // Array of Navlink id
    //     'end': Array<String>    // Array of Navlink id
    // }
    // 'start' and 'end' refer to first and last shape point of from-link.
    // Their values are array of Navlink ids, you are not allowed to turn from from-link's start (or end) shape point into
    // any Navlink that is in this array.
    writeTurnRestriction(restricted, from, to) {
        let turn = from.link.prop('turnRestriction') || {};
        let node = from.index ? 'end' : 'start';
        let restrictions = turn[node] = turn[node] || [];
        let index = restrictions.indexOf(to.link.id);

        if (restricted) {
            if (index == -1) {
                restrictions.push(to.link.id);
            }
        } else if (index >= 0) {
            restrictions.splice(index, 1);
        }

        from.link.prop('turnRestriction', turn);
    }

    // Indicate if the Navlink is pedestrian only, it's not allowed to turn into a pedestrian only Navlink.
    readPedestrianOnly(feature) {
        return Boolean(feature.prop('pedestrianOnly'));
    }

    // Navlink's direction indicates if the Navlink is a one-way road.
    // Valid values are:
    // 'BOTH': the Navlink is a two-way road.
    // 'START_TO_END': the Navlink is a one-way road with travel direction from its first to last shape point.
    // 'END_TO_START': the Navlink is a one-way road with travel direction from its last to first shape point.
    // It's not allowed to turn into one Navlink with direction 'END_TO_START' at its start (first) shape point or turn into
    // one Navlink with direction 'START_TO_END' at its end (last) shape point.
    readDirection(feature) {
        return feature.prop('direction') || 'BOTH';
    }

    readZLevels(navlink) {
        return navlink.prop('zLevels') || navlink.geometry.coordinates.map((c) => 0);
    }

    writeZLevels(navlink, zLevel) {
        navlink.prop('zLevels', zLevel);
    }
    // ########################   Address, Place   ########################
    // Following functions are only necessary if you want to edit Address or Place.

    // In addition to a simple Marker, a Place CAN, while an Address MUST have a routing point.
    // A routing point of a Place or Address is a geo position (routingPosition) intended for routing purposes and references
    // to a navlink (routingLink).
    // In this example, we get routingPosition from features's properties 'routingPoint' and routingLink from 'routingLink'.

    // Get coordinate of routing point, its format is: [longitude, latitude, altitude].
    // This position should always be on the geometry of referenced Navlink.
    readRoutingPosition(feature) {
        return feature.prop('routingPoint');
    }
    // Get id of referenced Navlink for Address or Place. Place becomes floating if this function does not return a Navlink id properly.
    readRoutingLink(feature) {
        return feature.prop('routingLink');
    }
    // This function is called to write updated coordinate on referenced Navlink when routing position is changed.
    // Format of routing position: [longitude, latitude, altitude].
    writeRoutingPosition(feature, position) {
        feature.prop('routingPoint', position);
    }
    // This function is called to write new Navlink reference when routingLink is changed.
    // For example, drag routing point from one Navlink to another will change routingLink.
    // In this example, Navlink id is updated when routingLink changes.
    writeRoutingLink(feature, navlink) {
        feature.prop('routingLink', navlink ? navlink.id : navlink);
    }
    // This function is called by editor API to get the provider in which referenced Navlink of Address/Place is located.
    // A map/provider setup where all features (Place/Address and referenced Navlink) are provided by the same provider
    // (single-provider-setup), this function just needs to return id of the provider itself.
    // However, in case of multi-provider-setup, Navlinks can be separated from Address/Place data and distributed across
    // multiple providers, this function needs to return id of provider which contains the referenced Navlink.
    readRoutingProvider(location) {
        return this.id;
    }
    // ####################       Buildings/Extruded Polygons      ####################
    // Following functions are only necessary if you want to edit Buildings (Extruded Polygons).

    // to obtain the height of a Building the respective attribute reader must be implemented.
    readFeatureHeight(feature) {
        return feature.properties.height;
    }
    // the Attribute writer stores the modified height and must be implemented to enable height-editing of the building.
    writeFeatureHeight(feature, heightMeter) {
        feature.properties.height = heightMeter;
    }
}

let backgroundLayer = new MVTLayer({
    min: 1,
    max: 20,
    remote: {
        url: 'https://vector.hereapi.com/v2/vectortiles/base/mc/{z}/{x}/{y}/omv?apikey=' + YOUR_API_KEY
    }
});
let navlinkLayer = new TileLayer({
    min: 14,
    max: 20,
    // Customized provider to provide features
    provider: new MyProvider({
        space: '6HMU19KY',
        credentials: {
            access_token: YOUR_ACCESS_TOKEN
        },
        level: 14
    }),
    // customize layer style
    style: {
        // define a set of styles by navlink feature attributes
        styleGroups: {
            // highway
            highway: [
                {zIndex: 0, type: 'Line', stroke: '#AA84A4', strokeWidth: 18},
                {zIndex: 1, type: 'Line', stroke: '#C799E8', strokeWidth: 16},
                {
                    zIndex: 2,
                    type: 'Text',
                    textRef: 'properties.name',
                    fill: '#d6abf5',
                    strokeWidth: 5,
                    stroke: '#51414f',
                    font: '14px sans-serif'
                }
            ],
            // primary road
            primary: [
                {zIndex: 0, type: 'Line', stroke: '#AA84A4', strokeWidth: 18},
                {zIndex: 1, type: 'Line', stroke: '#C799E8', strokeWidth: 14},
                {
                    zIndex: 2,
                    type: 'Text',
                    textRef: 'properties.name',
                    fill: '#d6abf5',
                    strokeWidth: 5,
                    stroke: '#51414f',
                    font: '14px sans-serif'
                }
            ],
            // Residential road
            residential: [
                {zIndex: 0, type: 'Line', stroke: '#F4F288', strokeWidth: 11},
                {zIndex: 1, type: 'Line', stroke: '#CD8353', strokeWidth: 8},
                {
                    zIndex: 2,
                    type: 'Text',
                    textRef: 'properties.name',
                    fill: '#CD8353',
                    strokeWidth: 5,
                    stroke: '#F4F288',
                    font: '14px sans-serif'
                }
            ],
            // Trail
            path: [
                {zIndex: 0, type: 'Line', stroke: '#FFFFFF', strokeWidth: 8},
                {
                    zIndex: 2,
                    type: 'Text',
                    textRef: 'properties.name',
                    fill: 'black',
                    strokeWidth: 5,
                    stroke: 'white',
                    font: '14px sans-serif'
                }
            ]
        },

        assign: function(feature, zoomlevel) {
            let prop = feature.properties;
            return prop.type;
        }
    }
});

// setup the Map Display
const display = new Map(document.getElementById('map'), {
    zoomlevel: 18,
    center: {longitude: -122.2281, latitude: 37.778747},
    // add layers to the display
    layers: [backgroundLayer, navlinkLayer]
});

// setup the editor
const editor = new Editor(display, {layers: [navlinkLayer]});
/** **/


let roadNameInput = <HTMLInputElement>document.querySelector('#roadname');
let navlink;

// add a pointerup event listener to initialize the input field when a navlink gets clicked
editor.addEventListener('pointerup', function(event) {
    let feature = <Navlink>event.target;

    if (feature && feature.geometry.type == 'LineString') {
        // update the input field with the roadname
        roadNameInput.value = feature.prop('name');

        navlink = feature;
    }
});

// update the name of the feature on input change
roadNameInput.addEventListener('input', function() {
    if (navlink) {
        // update the name property of the feature
        navlink.prop('name', this.value);
    }
});
