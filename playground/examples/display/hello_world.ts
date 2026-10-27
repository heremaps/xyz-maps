import {MVTLayer} from '@here/xyz-maps-core';
import {Map} from '@here/xyz-maps-display';

// setup the Map Display
const display = new Map(document.getElementById('map'), {
    zoomlevel: 17,
    center: {
        longitude: -122.48024,
        latitude: 37.77326
    },
    // add layers to the map
    layers: [
        new MVTLayer({
            name: 'background layer',
            // the minimum zoom level the layer is displayed
            min: 1,
            // the maximum zoom level the layer is displayed
            max: 20,
            remote: {
                url: 'https://vector.hereapi.com/v2/vectortiles/base/mc/{z}/{x}/{y}/omv?apikey=' + YOUR_API_KEY
            }
        })
    ]
});
