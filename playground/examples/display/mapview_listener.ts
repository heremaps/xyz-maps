import {MVTLayer} from '@here/xyz-maps-core';
import {Map} from '@here/xyz-maps-display';

/** setup the Map **/
const display = new Map(document.getElementById('map'), {
    zoomlevel: 17,
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
                url: 'https://vector.hereapi.com/v2/vectortiles/base/mc/{z}/{x}/{y}/omv?apikey=' + YOUR_API_KEY
            }
        })
    ]
});
/** **/

let eventHistory = [];

// create an event handler to display the last 16 mapviewchagnge events
function eventHandler(ev) {
    eventHistory.push(ev.type);
    // just keep the last 16 events
    eventHistory = eventHistory.slice(-16);

    document.querySelector<HTMLDivElement>('#info').innerText = JSON.stringify(eventHistory, undefined, 4);
}

// add mapviewchange event listener to the map
display.addEventListener('mapviewchange', eventHandler);

// add mapviewchangestart event listener to the map
display.addEventListener('mapviewchangestart', eventHandler);

// add mapviewchangeend event listener to the map
display.addEventListener('mapviewchangeend', eventHandler);

