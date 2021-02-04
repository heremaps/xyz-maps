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
            name: 'MyProvider',
            level: 14,
            space: '6HMU19KY',
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
        longitude: -122.283467,
        latitude: 37.819543
    },

    // add layers to display
    layers: layers
});
/** **/

// This example shows how to add listeners to pointer events in display.
// Supported pointer events are pointerdown, pointerup, pointerenter, pointerleave and pressmove.

var evtInfo = {};
// Event handler to pointer events.
// It shows the current pointer event
function eventHandler(evt) {
    evtInfo = {};
    evtInfo[evt.type] = {
        x: evt.mapX,
        y: evt.mapY
    };

    document.querySelector('#info').innerText = 'Pointer event: ' + JSON.stringify(evtInfo, null, 4);
}

// add event listener to pointerdown
display.addEventListener('pointerdown', eventHandler);

// add event listener to pointerup
display.addEventListener('pointerup', eventHandler);

// add event listener to pointerenter
display.addEventListener('pointerenter', eventHandler);

// add event listener to pointerleave
display.addEventListener('pointerleave', eventHandler);

// add event listener to pressmove
display.addEventListener('pressmove', eventHandler);
