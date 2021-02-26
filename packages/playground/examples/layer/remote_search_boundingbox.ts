import {MVTLayer, TileLayer, SpaceProvider, LocalProvider} from '@here/xyz-maps-core';
import {Map} from '@here/xyz-maps-display';

/** setup the Map **/
const backgroundLayer = new MVTLayer({
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
        longitude: -122.253324, latitude: 37.795146
    },

    // add layers to display
    layers: [backgroundLayer]
});

// A Display tag shows search area
let searcharea = document.createElement('div');
searcharea.id = 'searcharea';
display.getContainer().appendChild(searcharea);
/** **/

// create a TileLayer using a SpaceProvider with a remote datasource
// By intention the remoteLayer is not added to the display, because we just us it for remote searches.
// The remote search result will be added to the localLayer to display the result.
const remoteLayer = new TileLayer({
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

const localLayer = new TileLayer({
    min: 14,
    max: 20,
    provider: new LocalProvider(),
    style: {
        styleGroups: {
            style: [
                {zIndex: 1, type: 'Circle', radius: 8, fill: '#ff9e33', stroke: '#ff5600', strokeWidth: 2}
            ]
        },
        assign: function(feature, zoomlevel) {
            return 'style';
        }
    }
});

display.addLayer(localLayer);

// listen for "mapviewchangeend" event
display.addEventListener('mapviewchangeend', (ev) => {
    // define the geographical area to search in
    let topLeft = display.pixelToGeo(display.getWidth() / 2 - 150, display.getHeight() / 2 - 150);
    let bottomRight = display.pixelToGeo(display.getWidth() / 2 + 150, display.getHeight() / 2 + 150);

    // clear the localLayer to just show the result of the remoteLayer search
    localLayer.removeFeature(localLayer.getProvider().all());

    // search for features in the geographical rectangle
    remoteLayer.search({
        rect: {
            minLon: topLeft.longitude,
            minLat: bottomRight.latitude,
            maxLon: bottomRight.longitude,
            maxLat: topLeft.latitude
        },
        // perform a remote search in the remote datasource,
        // if the data is not already available in the local cache of the provider
        remote: true,
        // when data has been fetched from the remote datasource the onload callback will be called with the result
        onload: (features) => {
            // Add result to the local layer
            localLayer.addFeature(features);
        }
    });
});
