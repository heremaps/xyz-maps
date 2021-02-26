import {TileLayer, ImageProvider} from '@here/xyz-maps-core';
import {Map} from '@here/xyz-maps-display';

// Create a TileLayer using a ImageProvider
var myLayer = new TileLayer({
    // Name of the layer
    name: 'mySatelliteImages',
    // Minimum zoom level
    min: 14,
    // Maximum zoom level
    max: 20,
    // Define provider for this layer
    provider: new ImageProvider({
        // Name of the provider
        name: 'myImageProvider',
        // URL of image tiles
        url: 'https://maphub.api.here.com/satellite/{QUADKEY}?access_token=' + YOUR_ACCESS_TOKEN
    })
});

// setup the Map Display
const display = new Map(document.getElementById('map'), {
    zoomlevel: 17,
    center: {
        longitude: -117.15406,
        latitude: 32.72966
    },
    // add layer to display
    layers: [myLayer]
});
