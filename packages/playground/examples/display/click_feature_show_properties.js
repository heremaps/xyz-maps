import {MVTLayer, TileLayer, SpaceProvider} from '@here/xyz-maps-core';
import {Map} from '@here/xyz-maps-display';

/** setup the Map **/
var layers = [
    new MVTLayer({
        name: 'background layer',
        min: 1,
        max: 20,
        remote: {
            url: 'https://xyz.api.here.com/tiles/osmbase/512/all/{z}/{x}/{y}.mvt?access_token=' + YOUR_ACCESS_TOKEN
        }
    }),
    new TileLayer({
        name: 'myLayer',
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
    }),
    new here.xyz.maps.layers.TileLayer({
        name: 'mySecondLayer',
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
    })
];
// setup the Map Display
const display = new Map(document.getElementById('map'), {
    zoomLevel: 17,
    center: {
        longitude: -122.227791,
        latitude: 37.781058
    },

    // add layers to display
    layers: layers
});
/** **/

var infoTag = document.querySelector('#info');

// Add a event listener to pointerup
function eventHandler(evt) {
    // Click on a feature
    if (evt.target) {
        var properties = evt.target.properties;

        // Display feature user properties
        infoTag.innerText = JSON.stringify(properties, undefined, 4);
    } else {
        // Feature is not clicked
        infoTag.innerText = 'No feature is clicked!';
    }
}

// add event listener to pointerup
display.addEventListener('pointerup', eventHandler);
