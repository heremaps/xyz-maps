import {MVTLayer, TileLayer, SpaceProvider} from '@here/xyz-maps-core';
import {Map} from '@here/xyz-maps-display';

/** setup the Map **/
let backgroundLayer = new MVTLayer({
    name: 'background layer',
    min: 1,
    max: 20,
    remote: {
        url: 'https://xyz.api.here.com/tiles/osmbase/512/all/{z}/{x}/{y}.mvt?access_token=' + YOUR_ACCESS_TOKEN
    }
});

// setup the Map Display
const display = new Map(document.getElementById('map'), {
    zoomlevel: 17,
    center: {
        longitude: -122.283467,
        latitude: 37.819543
    },

    // add layers to display
    layers: [
        backgroundLayer,
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
    ]
});
/** **/
// We are just interested in pointerevents of the Layer that contains data from a SpaceProvider,
// therefore we disable pointer-event triggering for the "background Layer"
backgroundLayer.pointerEvents(false);


function eventHandler(ev) {
    // create basic event information
    let evtInfo = {
        type: ev.type,
        target: ev.target ? '{...}' : null,
        mapX: ev.mapX,
        mapY: ev.mapY
    };
    // display basic event information
    document.querySelector<HTMLDivElement>('#info').innerText = 'Event: ' + JSON.stringify(evtInfo, null, 4);
}

// add a pointerdown event listener to the map
display.addEventListener('pointerdown', eventHandler);

// add a pointerup event listener to the map
display.addEventListener('pointerup', eventHandler);

// add a pointerenter event listener to the map
display.addEventListener('pointerenter', eventHandler);

// add a pointerleave event listener to the map
display.addEventListener('pointerleave', eventHandler);

// add a pressmove event listener to the map
display.addEventListener('pressmove', eventHandler);
