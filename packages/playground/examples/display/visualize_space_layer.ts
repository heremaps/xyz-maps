import {MVTLayer, TileLayer, SpaceProvider} from '@here/xyz-maps-core';
import {Map} from '@here/xyz-maps-display';

/** setup the Map **/
const display = new Map(document.getElementById('map'), {
    zoomlevel: 17,
    center: {
        longitude: -122.229621, latitude: 37.7820641
    },
    // add layers to the display
    layers: [
        // create a MVTLayer to act as the "basemap" (background layer)
        new MVTLayer({
            remote: {
                url: 'https://xyz.api.here.com/tiles/osmbase/512/all/{z}/{x}/{y}.mvt?access_token=' + YOUR_ACCESS_TOKEN
            }
        })
    ]
});
/** done **/

// create a TileLayer using a SpaceProvider that's providing the map-data we want to display
var myLayer = new TileLayer({
    // the minimum zoom level the layer should be visible
    min: 14,
    // the maximum zoom level the layer should be visible
    max: 20,
    // create the SpaceProvider
    provider: new SpaceProvider({
        // zoom level at which tiles are loaded and a local tile index gets created
        level: 14,
        // id of the space
        space: '6HMU19KY',
        // user credentials required by the xyz-hub remote service
        credentials: {
            access_token: YOUR_ACCESS_TOKEN
        }
    })
});

// Add the layer to the display
display.addLayer(myLayer);
