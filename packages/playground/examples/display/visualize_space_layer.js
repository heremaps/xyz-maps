import {MVTLayer, TileLayer, SpaceProvider} from '@here/xyz-maps-core';
import {Map} from '@here/xyz-maps-display';

/** setup the Map **/
const display = new Map(document.getElementById('map'), {
    zoomLevel: 17,
    center: {
        longitude: -122.229621, latitude: 37.7820641
    },
    // add layers to the display
    layers: [
        // create a MVTLayer to act as the "basemap"
        new MVTLayer({
            min: 1, max: 20,
            remote: {
                url: 'https://xyz.api.here.com/tiles/osmbase/512/all/{z}/{x}/{y}.mvt?access_token=' + YOUR_ACCESS_TOKEN
            }
        })
    ]
});
/** done **/

// Create data layer with Space provider
var myLayer = new TileLayer({
    // the minimum zoom level the layer should be visible
    min: 14,
    // the maximum zoom level the layer should be visible
    max: 20,
    // Create a SpaceProvider
    provider: new SpaceProvider({
        // Zoom level at which tiles are loaded and a local tile index gets created
        level: 14,
        // Space ID
        space: '6HMU19KY',
        // User credentials required by the provider
        credentials: {
            access_token: YOUR_ACCESS_TOKEN
        }
    })
});

// Add the layer to display
display.addLayer(myLayer);
