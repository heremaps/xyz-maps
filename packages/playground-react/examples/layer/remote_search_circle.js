import {MVTLayer, TileLayer, SpaceProvider, LocalProvider} from '@here/xyz-maps-core';
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
var myLayer = new TileLayer({
    name: 'Local Layer',
    min: 14,
    max: 20,
    provider: new LocalProvider({
        name: 'myProvider'
    }),
    style: {
        styleGroups: {
            style: [
                {zIndex: 0, type: 'Rect', fill: '#000', width: 24, height: 14},
                {zIndex: 0, type: 'Circle', radius: 7, fill: '#000', offsetX: -12},
                {zIndex: 0, type: 'Circle', radius: 7, fill: '#000', offsetX: 12},
                {zIndex: 1, type: 'Circle', radius: 5, fill: 'yellow'},
                {zIndex: 1, type: 'Circle', radius: 5, fill: 'green', offsetX: 11},
                {zIndex: 1, type: 'Circle', radius: 5, fill: 'red', offsetX: -11}
            ]
        },
        assign: function(feature, zoomlevel) {
            return 'style';
        }
    }
});

// setup the Map Display
const display = new Map(document.getElementById('map'), {
    zoomLevel: 17,
    center: {
        longitude: -122.253324, latitude: 37.795146
    },

    // add layers to display
    layers: [bgLayer, myLayer]
});

// A Display tag shows search area
var searcharea = document.createElement('div');
searcharea.id = 'searcharea';
display.getContainer().appendChild(searcharea);
/** **/

var infoTag = document.querySelector('#info');

var searchResult = [];

// Add features to local overlay in display
function addFeatures(features) {
    for (var i in features) {
        var feature = features[i];
        myLayer.addFeature(feature);
    }
}

// remove features from local overlay
function removeFeatures(features) {
    for (var i in features) {
        var feature = features[i];
        myLayer.removeFeature(feature);
    }
}

// add event listener to mapviewchangeend
display.addEventListener('mapviewchangeend', function(evt) {
    // Calculate center point and radius of the circle
    var center = display.pixelToGeo(display.getWidth() / 2, display.getHeight() / 2);
    var top = display.pixelToGeo(display.getWidth() / 2, display.getHeight() / 2 - 150);

    var r = 6.371 * 1e6 * (top.latitude - center.latitude) / 180 * Math.PI;

    // Remove features that are added to local overlay
    removeFeatures(searchResult);

    // Search for features in circle in Place layer
    searchResult = placeLayer.search({
        point: center,

        radius: r,

        // force function to do remote search
        remote: true,

        // callback function to return result from remote server
        onload: function(e) {
            // Add result features to local layer
            if (!searchResult) {
                addFeatures(e);

                // Indicate search result comes from remote server
                infoTag.innerText = 'Remote results';
            }

            searchResult = e;
        }
    });

    // Add result features to local layer
    if (searchResult) {
        addFeatures(searchResult);

        // Indicate search result comes from local cache
        infoTag.innerText = 'Local results';
    }
});
