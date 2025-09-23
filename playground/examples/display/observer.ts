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


let infoTag = <HTMLDivElement>document.querySelector('#info');

// add an center observer to the map
display.addObserver('center', (name, newValue, oldValue) => {
    infoTag.innerText = name + ' new: ' + JSON.stringify(newValue, null, 4) + ' old:' + JSON.stringify(oldValue, null, 4);
});

// add an zoomlevel observer to the map
display.addObserver('zoomlevel', (name, newValue, oldValue) => {
    infoTag.innerText = name + ' new: ' + newValue + ' old:' + oldValue;
});
