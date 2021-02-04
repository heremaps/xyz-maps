import {MVTLayer, TileLayer, SpaceProvider} from '@here/xyz-maps-core';
import {Map} from '@here/xyz-maps-display';
import {Editor} from '@here/xyz-maps-editor';

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

    // In this examle, all Navlinks are provided by provider "navlinkProvider"
    readRoutingProvider(location, providers) {
        return this.id;
    }

    readZLevels(navlink) {
        return navlink.prop('zLevels') || navlink.geometry.coordinates.map((c) => 0);
    }

    writeZLevels(navlink, zLevel) {
        navlink.prop('zLevels', zLevel);
    }
}

var bgLayer = new MVTLayer({
    name: 'background layer',
    min: 1,
    max: 20,
    remote: {
        url: 'https://xyz.api.here.com/tiles/osmbase/512/all/{z}/{x}/{y}.mvt?access_token=' + YOUR_ACCESS_TOKEN
    }
});
var myLayer = new TileLayer({
    name: 'My Layer',
    min: 14,
    max: 20,
    // Customized provider to provide places
    provider: new MyProvider({
        id: 'placeProvider',
        space: '6CkeaGLg',
        credentials: {
            access_token: YOUR_ACCESS_TOKEN
        },
        level: 14
    })
});

// setup the Map Display
const display = new Map(document.getElementById('map'), {
    zoomLevel: 17,
    center: {longitude: -116.85755, latitude: 33.03607},

    // add layers to display
    layers: [bgLayer, myLayer]
});

// setup the editor
const editor = new Editor(display);

// add layer to editor, make it editable
editor.addLayer(myLayer);
/** **/

var changesInfo = {
    'Current Step': 0,
    'Total Steps': 0,
    'Modified Features': 0
};
var info = document.querySelector('#info');
info.innerText = JSON.stringify(changesInfo, undefined, 4);

// Add observer to current history
editor.addObserver('history.current', function(ob, currentStep, lastStep) {
    changesInfo['Current Step'] = editor.get('history.current');
    changesInfo['Total Steps'] = editor.get('history.length');
    changesInfo['Modified Features'] = editor.get('changes.length');

    info.innerText = JSON.stringify(changesInfo, undefined, 4);
});

document.querySelector('#add').onclick = function() {
    var width = display.getWidth();
    var height = display.getHeight();
    // convert from pixels on screen to a geographical coordinate.
    var geoJSONCoordinate = editor.toGeoJSONCoordinates({
        x: width * Math.random(),
        y: height * Math.random()
    });

    // Add a Place feature to the editor
    var place = editor.addFeature({
        type: 'Feature',
        geometry: {
            type: 'Point',
            coordinates: geoJSONCoordinate
        },
        properties: {
            featureClass: 'PLACE'
        }
    });
};

document.querySelector('#undo').onclick = function() {
    editor.undo();
};

document.querySelector('#redo').onclick = function() {
    editor.redo();
};

document.querySelector('#revert').onclick = function() {
    editor.revert();
};
