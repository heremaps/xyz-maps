import {MVTLayer, TileLayer, SpaceProvider} from '@here/xyz-maps-core';
import {Map} from '@here/xyz-maps-display';

/** setup the Map **/
var bgLayer = new MVTLayer({
    name: 'background layer',
    min: 1,
    max: 20,
    remote: {
        url: 'https://xyz.api.here.com/tiles/osmbase/512/all/{z}/{x}/{y}.mvt?access_token=' + YOUR_ACCESS_TOKEN
    }
});
var placeLayer = new TileLayer({
    name: 'Place Layer',
    min: 14,
    max: 20,
    provider: new SpaceProvider({
        name: 'SpaceProvider',
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
        longitude: -122.253324, latitude: 37.795146
    },

    // add layers to display
    layers: [bgLayer, placeLayer]
});
/** **/

// add event listener to viewportReady
placeLayer.addEventListener('viewportReady', function(evt) {
    // Reset feature style group
    setStyleGroup(searchResult);
    // Search for features by ids
    searchResult = placeLayer.search({
        ids: ['oLJD9RjPsWwHlYVt', 'ecjJSg1QTwI0ZVoi']
    });
    // Highlight features
    setStyleGroup(searchResult, styleGroup);
});

var searchResult = [];
var styleGroup = [
    {zIndex: 0, type: 'Rect', fill: '#000', width: 24, height: 14},
    {zIndex: 0, type: 'Circle', radius: 7, fill: '#000', offsetX: -12},
    {zIndex: 0, type: 'Circle', radius: 7, fill: '#000', offsetX: 12},
    {zIndex: 1, type: 'Circle', radius: 5, fill: 'yellow'},
    {zIndex: 1, type: 'Circle', radius: 5, fill: 'green', offsetX: 11},
    {zIndex: 1, type: 'Circle', radius: 5, fill: 'red', offsetX: -11}
];


// Set feature style group
function setStyleGroup(features, style) {
    if (features.length) {
        for (var i in features) {
            var feature = features[i];
            placeLayer.setStyleGroup(feature, style);
        }
    }
}
