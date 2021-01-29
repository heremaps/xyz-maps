import {MVTLayer} from '@here/xyz-maps-core';
import {Map} from '@here/xyz-maps-display';

/** setup the Map **/
const display = new Map(document.getElementById('map'), {
    zoomLevel: 17,
    center: {
        longitude: -122.48024, latitude: 37.77326
    },
    // add layers to the display
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

// This example shows how to get and set display behavior: zoom and drag.
// zoom or drag behavior set to false means zooming and dragging the map display
// with MOUSE is disabled.

var switchdrag = document.querySelector('#switchdrag');
var switchzoom = document.querySelector('#switchzoom');
var infotag = document.querySelector('#info');

// Get current behavior
var currentbehavior = display.getBehavior();
infotag.innerText = 'Current Behavior:' + JSON.stringify(currentbehavior, undefined, 4);

switchdrag.onclick = function() {
    display.setBehavior('drag', !currentbehavior.drag);

    // update current display behavior in info tag
    currentbehavior = display.getBehavior();
    infotag.innerText = 'Current Behavior:' + JSON.stringify(currentbehavior, undefined, 4);

    // update button text
    this.innerText = currentbehavior.drag ? 'Disable Drag' : 'Enable Drag';
};

switchzoom.onclick = function() {
    display.setBehavior('zoom', !currentbehavior.zoom);

    // update current display behavior in info tag
    currentbehavior = display.getBehavior();
    infotag.innerText = 'Current Behavior:' + JSON.stringify(currentbehavior, undefined, 4);

    // update button text
    this.innerText = currentbehavior.zoom ? 'Disable Zoom' : 'Enable Zoom';
};
