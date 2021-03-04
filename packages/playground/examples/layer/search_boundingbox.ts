import {MVTLayer, TileLayer, SpaceProvider} from '@here/xyz-maps-core';
import {Map} from '@here/xyz-maps-display';

/** setup the Map **/
let backgroundLayer = new MVTLayer({
    min: 1,
    max: 20,
    remote: {
        url: 'https://xyz.api.here.com/tiles/osmbase/512/all/{z}/{x}/{y}.mvt?access_token=' + YOUR_ACCESS_TOKEN
    }
});
var placeLayer = new TileLayer({
    min: 14,
    max: 20,
    provider: new SpaceProvider({
        level: 14,
        space: '6CkeaGLg',
        credentials: {
            access_token: YOUR_ACCESS_TOKEN
        }
    })
});

// setup the Map Display
const display = new Map(document.getElementById('map'), {
    zoomlevel: 17,
    center: {
        longitude: -122.253324,
        latitude: 37.795146
    },
    // add layers to the display
    layers: [backgroundLayer, placeLayer]
});

// visualize the search area
const searchAreaElement = document.createElement('div');
searchAreaElement.id = 'searcharea';
display.getContainer().appendChild(searchAreaElement);
/** **/

let searchResult;

// wait until the current viewport is ready and all data is initialized
placeLayer.addEventListener('viewportReady', function(ev) {
    // define the geographical area to search in
    const topLeft = display.pixelToGeo(display.getWidth() / 2 - 150, display.getHeight() / 2 - 150);
    const bottomRight = display.pixelToGeo(display.getWidth() / 2 + 150, display.getHeight() / 2 + 150);

    // Reset the style of the previous search result
    searchResult && searchResult.forEach((feature) => placeLayer.setStyleGroup(feature));

    // Search for features by viewbound in place layer
    searchResult = placeLayer.search({
        rect: {
            minLon: topLeft.longitude,
            minLat: bottomRight.latitude,
            maxLon: bottomRight.longitude,
            maxLat: topLeft.latitude
        }
    });

    // highlight the search result
    searchResult.forEach((feature) => placeLayer.setStyleGroup(feature, [{
        zIndex: 1, type: 'Circle', radius: 8, fill: '#fff', stroke: '#000', strokeWidth: 2
    }]));
});

