import {MVTLayer, TileLayer, SpaceProvider} from '@here/xyz-maps-core';
import {Map} from '@here/xyz-maps-display';

/** setup the Map **/
let backgroundLayer = new MVTLayer({
    min: 1,
    max: 20,
    remote: {
        url: 'https://xyz.api.here.com/tiles/osmbase/512/all/{z}/{x}/{y}.mvt?access_token=' + YOUR_ACCESS_TOKEN
    }
});
var placeLayer = new TileLayer({
    min: 14,
    max: 20,
    provider: new SpaceProvider({
        level: 14,
        space: '6CkeaGLg',
        credentials: {
            access_token: YOUR_ACCESS_TOKEN
        }
    })
});

// setup the Map Display
const display = new Map(document.getElementById('map'), {
    zoomLevel: 17,
    center: {
        longitude: -122.253324,
        latitude: 37.795146
    },
    // add layers to display
    layers: [backgroundLayer, placeLayer]
});

// A Display tag shows search area
var searcharea = document.createElement('div');
searcharea.id = 'searcharea';
display.getContainer().appendChild(searcharea);
/** **/

// add event listener to viewportReady
placeLayer.addEventListener('viewportReady', function(evt) {
    // Calculate viewbound for search
    var topLeft = display.pixelToGeo(display.getWidth() / 2 - 150, display.getHeight() / 2 - 150);
    var bottomRight = display.pixelToGeo(display.getWidth() / 2 + 150, display.getHeight() / 2 + 150);

    // Reset feature style group
    setStyleGroup(searchResult);

    // Search for features by viewbound in place layer
    searchResult = placeLayer.search({
        rect: {
            minLon: topLeft.longitude,
            minLat: bottomRight.latitude,
            maxLon: bottomRight.longitude,
            maxLat: topLeft.latitude
        }
    });

    // Highlight features
    setStyleGroup(searchResult, styleGroup);
});

var searchResult = [];
var styleGroup =
    [
        {zIndex: 0, type: 'Rect', fill: '#000', width: 24, height: 14},
        {zIndex: 0, type: 'Circle', radius: 7, fill: '#000', offsetX: -12},
        {zIndex: 0, type: 'Circle', radius: 7, fill: '#000', offsetX: 12},
        {zIndex: 1, type: 'Circle', radius: 5, fill: 'yellow'},
        {zIndex: 1, type: 'Circle', radius: 5, fill: 'green', offsetX: 11},
        {zIndex: 1, type: 'Circle', radius: 5, fill: 'red', offsetX: -11}
    ];


// Set feature style group
function setStyleGroup(features, style) {
    for (var i in features) {
        var feature = features[i];
        placeLayer.setStyleGroup(feature, style);
    }
}
