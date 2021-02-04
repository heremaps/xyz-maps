import {MVTLayer} from '@here/xyz-maps-core';
import {Map} from '@here/xyz-maps-display';

/** setup the Map **/
const display = new Map(document.getElementById('map'), {
    zoomLevel: 17,
    center: {
        longitude: -122.48024, latitude: 37.77326
    },

    // add layers to display
    layers: [
        new MVTLayer({
            name: 'background layer',
            min: 1,
            max: 20,
            remote: {
                url: 'https://xyz.api.here.com/tiles/osmbase/512/all/{z}/{x}/{y}.mvt?access_token=' + YOUR_ACCESS_TOKEN
            }
        })
    ]
});
/** **/

// This example shows how to add listeners to mapview events in display.
// Supported mapview events are mapviewchange, mapviewchangestart and mapviewchangeend.

// Event handler to mapview events.
// It shows the current mapview event
function eventHandler(evt) {
    document.querySelector('#info').innerText = evt.type + ':' + JSON.stringify(evt.data, undefined, 4);
}

// add event listener to mapviewchange
display.addEventListener('mapviewchange', eventHandler);

// add event listener to mapviewchangestart
display.addEventListener('mapviewchangestart', eventHandler);

// add event listener to mapviewchangeend
display.addEventListener('mapviewchangeend', eventHandler);

