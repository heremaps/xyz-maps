import {MVTLayer, TileLayer, SpaceProvider} from '@here/xyz-maps-core';
import {Map} from '@here/xyz-maps-display';
import {Editor, Place} from '@here/xyz-maps-editor';

/** setup the Map **/
// Create a custom provider.
class MyProvider extends SpaceProvider {
    // In this exmaple, all data does already contain desired feature class in the property 'featureClass'.
    detectFeatureClass(feature) {
        return feature.properties.featureClass;
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
    // In this example places, addresses and navlinks are stored in the same provider.
    readRoutingProvider(location, providers) {
        return this.id;
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
}

let backgroundLayer = new MVTLayer({
    min: 1,
    max: 20,
    remote: {
        url: 'https://xyz.api.here.com/tiles/osmbase/512/all/{z}/{x}/{y}.mvt?access_token=' + YOUR_ACCESS_TOKEN
    }
});

var myLayer = new TileLayer({
    min: 14,
    max: 20,
    provider: new MyProvider({
        space: '6HMU19KY',
        credentials: {
            access_token: YOUR_ACCESS_TOKEN
        },
        level: 14
    }),
    style: {
        styleGroups: {
            Point: [{
                zIndex: 2, type: 'Circle', radius: 12, strokeWidth: 2, stroke: '#FFFFFF', fill: '#1188DD'
            }],
            LineString: [{
                zIndex: 0, type: 'Line', strokeWidth: 14, stroke: '#660808'
            }, {
                zIndex: 1, type: 'Line', strokeWidth: 10, stroke: '#ef683e'
            }]
        },
        assign: function(feature, zoomlevel) {
            return feature.geometry.type;
        }
    }
});

var myPlaceLayer = new TileLayer({
    min: 14,
    max: 20,
    provider: new MyProvider({
        space: '6CkeaGLg',
        credentials: {
            access_token: YOUR_ACCESS_TOKEN
        },
        level: 14
    })


});

// setup the Map Display
const display = new Map(document.getElementById('map'), {
    zoomlevel: 17,
    center: {
        longitude: -122.214304, latitude: 37.798005
    },
    // add layers to the display
    layers: [backgroundLayer, myLayer]
});

// setup the editor
const editor = new Editor(display, {layers: [myLayer]});
/** **/

// add points to random position within the current screen
document.querySelector<HTMLButtonElement>('#createButtonPixel').onclick = function() {
    let x = display.getWidth() * Math.random();
    let y = display.getHeight() * Math.random();

    // create the Place feature using a pixel coordinate
    createPlace({x: x, y: y});
};

// add points to random position within the current screen
document.querySelector<HTMLButtonElement>('#createButtonGeo').onclick = function() {
    let viewBounds = display.getViewBounds();
    let lon = viewBounds.minLon + (viewBounds.maxLon - viewBounds.minLon) * Math.random();
    let lat = viewBounds.minLat + (viewBounds.maxLat - viewBounds.minLat) * Math.random();

    // create the Place feature using a geographical coordinate
    createPlace({longitude: lon, latitude: lat});
};

function createPlace(coordinate) {
    // Add a Place feature to the editor
    let place = <Place>editor.addFeature({
        type: 'Feature',
        geometry: {
            type: 'Point',
            coordinates: editor.toGeoJSONCoordinates(coordinate)
        },
        properties: {
            featureClass: 'PLACE',
            type: 'hotel'
        }
    });
    // A Place does not connect to a Navlink feature by default.
    // "Connect" the place to a Navlink nearby and create a routing point for the Place automatically.
    place.createRoutingPoint();

    // select the place
    place.select();
}
