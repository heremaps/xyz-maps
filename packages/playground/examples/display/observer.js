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

// This example shows how to add observer to zoomLevel and center.
var infoTag = document.querySelector('#info');

// Add observer to zoomlevel
display.addObserver('zoomlevel', function(name, newValue, oldValue) {
    infoTag.innerText = name + ' new: ' + newValue + ' old:' + oldValue;
});

// Add observer to center
display.addObserver('center', function(name, newValue, oldValue) {
    infoTag.innerText = name + ' new: ' + JSON.stringify(newValue, null, 4) + ' old:' + JSON.stringify(oldValue, null, 4);
});

