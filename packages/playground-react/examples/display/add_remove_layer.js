import {MVTLayer, TileLayer, SpaceProvider} from '@here/xyz-maps-core';
import {Map} from '@here/xyz-maps-display';

/** setup the Map **/
// configure layers
var layers = [
    new MVTLayer({
        name: 'background layer',
        min: 1,
        max: 20,
        remote: {
            url: 'https://xyz.api.here.com/tiles/osmbase/512/all/{z}/{x}/{y}.mvt?access_token=' + YOUR_ACCESS_TOKEN
        }
    })
];
// setup the Map Display
const display = new Map(document.getElementById('map'), {
    zoomLevel: 17,
    center: {
        longitude: -122.226136, latitude: 37.777699
    },

    // add layers to display
    layers: layers
});
/** **/


// Create a data layer for navlink
var myNavlinkLayer = new TileLayer({
    name: 'myNavlinkLayer',
    min: 14,
    max: 20,
    provider: new SpaceProvider({
        id: 'NavlinkProvider',
        level: 14,
        space: '6HMU19KY',
        credentials: {
            access_token: YOUR_ACCESS_TOKEN
        }
    })
});

// Create another data layer for Place
var myPlaceLayer = new TileLayer({
    name: 'myPlaceLayer',
    min: 14,
    max: 20,
    provider: new SpaceProvider({
        id: 'PlaceProvider',
        level: 14,
        space: '6CkeaGLg',
        credentials: {
            access_token: YOUR_ACCESS_TOKEN
        }
    })
});

var navlinkLayerAdded = false;
// add/remove navlink layer in button handler
document.querySelector('#navlinklayerbutton').onclick = function() {
    if (!navlinkLayerAdded) {
        display.addLayer(myNavlinkLayer);

        this.innerText = 'Remove Navlink Layer';

        navlinkLayerAdded = true;
    } else {
        display.removeLayer(myNavlinkLayer);

        this.innerText = 'Add Navlink Layer';

        navlinkLayerAdded = false;
    }
};

var placeLayerAdded = false;
// add/remove place layer in button handler
document.querySelector('#placelayerbutton').onclick = function() {
    if (!placeLayerAdded) {
        display.addLayer(myPlaceLayer);

        this.innerText = 'Remove Place Layer';

        placeLayerAdded = true;
    } else {
        display.removeLayer(myPlaceLayer);

        this.innerText = 'Add Place Layer';

        placeLayerAdded = false;
    }
};

